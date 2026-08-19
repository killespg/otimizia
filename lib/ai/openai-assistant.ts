import type Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EasyInputMessage,
  FunctionTool,
  Response as OpenAIResponse,
  ResponseFunctionToolCall,
  ResponseInputContent,
  ResponseInputItem,
} from "openai/resources/responses/responses";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import { CRM_TOOLS, executeTool, isMutatingTool } from "@/lib/ai/tools";

const OPENAI_ASSISTANT_MODEL = "gpt-5.6-terra";

export type AiProvider = "anthropic" | "openai";

type StreamEvent = Record<string, unknown>;

type RunOpenAIAssistantOptions = {
  supabase: SupabaseClient;
  userId: string;
  orgId: string;
  workspaceKey: string;
  history: Anthropic.MessageParam[];
  uploadedImageUrl: string | null;
  systemPrompt: string;
  maxToolTurns: number;
  send: (event: StreamEvent) => void;
  tools?: FunctionTool[];
};

export function toOpenAITools(tools: typeof CRM_TOOLS): FunctionTool[] {
  return tools.map((tool) => ({
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema as Record<string, unknown>,
    strict: false,
  }));
}

const OPENAI_TOOLS: FunctionTool[] = toOpenAITools(CRM_TOOLS);

export function resolveAiProvider(
  env: Partial<
    Record<"AI_PROVIDER" | "ANTHROPIC_API_KEY" | "OPENAI_API_KEY", string | undefined>
  > = {
    AI_PROVIDER: process.env.AI_PROVIDER,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
): AiProvider | null {
  const requested = env.AI_PROVIDER?.trim().toLowerCase();
  if (requested === "openai") return env.OPENAI_API_KEY ? "openai" : null;
  if (requested === "anthropic") return env.ANTHROPIC_API_KEY ? "anthropic" : null;
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  if (env.OPENAI_API_KEY) return "openai";
  return null;
}

export async function runOpenAIAssistant({
  supabase,
  userId,
  orgId,
  workspaceKey,
  history,
  uploadedImageUrl,
  systemPrompt,
  maxToolTurns,
  send,
  tools,
}: RunOpenAIAssistantOptions): Promise<{ assistantText: string; mutated: boolean }> {
  const client = new OpenAI();
  const input = toOpenAIInput(history, uploadedImageUrl);
  let assistantText = "";
  let mutated = false;

  for (let turn = 0; turn < maxToolTurns; turn++) {
    send({ type: "thinking" });
    const stream = await client.responses.create({
      model: OPENAI_ASSISTANT_MODEL,
      instructions: systemPrompt,
      input,
      tools: tools ?? OPENAI_TOOLS,
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
      safety_identifier: userId,
      store: false,
      stream: true,
    });

    let completedResponse: OpenAIResponse | null = null;
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        assistantText += event.delta;
        send({ type: "text", text: event.delta });
      } else if (
        event.type === "response.output_item.added" &&
        event.item.type === "function_call"
      ) {
        send({ type: "tool", name: event.item.name });
      } else if (event.type === "response.completed") {
        completedResponse = event.response;
      } else if (event.type === "response.failed") {
        throw new Error(event.response.error?.message ?? "A resposta da IA falhou.");
      }
    }

    if (!completedResponse) throw new Error("A resposta da IA foi interrompida.");
    input.push(...toResponseInputItems(completedResponse.output));
    const toolCalls = completedResponse.output.filter(isOpenAIFunctionCall);
    if (toolCalls.length === 0) break;

    for (const toolCall of toolCalls) {
      let output: string;
      try {
        const parsedInput = JSON.parse(toolCall.arguments || "{}") as unknown;
        output = await executeTool(
          supabase,
          userId,
          orgId,
          workspaceKey,
          toolCall.name,
          parsedInput,
        );
        if (isMutatingTool(toolCall.name)) mutated = true;
      } catch (error) {
        output = JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : "Erro ao executar a ação.",
        });
      }

      input.push({
        type: "function_call_output",
        call_id: toolCall.call_id,
        output,
      });
    }
  }

  return { assistantText, mutated };
}

export function friendlyOpenAIError(error: unknown): string | null {
  if (error instanceof OpenAI.RateLimitError) {
    return "Muitas solicitações agora. Espere alguns segundos e tente de novo.";
  }
  if (error instanceof OpenAI.AuthenticationError) {
    return "O serviço de IA não conseguiu autenticar. Fale com o administrador.";
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return "Não consegui conectar ao serviço de IA. Verifique a internet e tente de novo.";
  }
  if (error instanceof OpenAI.APIError) {
    return "O serviço de IA retornou um erro. Tente novamente em instantes.";
  }
  return null;
}

function isOpenAIFunctionCall(item: OpenAIResponse["output"][number]): item is ResponseFunctionToolCall {
  return item.type === "function_call";
}

function toOpenAIInput(
  history: Anthropic.MessageParam[],
  uploadedImageUrl: string | null,
): ResponseInputItem[] {
  const input: EasyInputMessage[] = history.map((message): EasyInputMessage => {
    if (typeof message.content === "string") {
      return { role: message.role, content: message.content };
    }

    const content: ResponseInputContent[] = [];
    for (const block of message.content) {
      if (block.type === "text") {
        content.push({ type: "input_text", text: block.text });
      }
      if (block.type === "document" && block.source.type === "base64") {
        content.push({
          type: "input_file",
          filename: "documento.pdf",
          file_data: block.source.data,
        });
      }
    }
    return { role: message.role, content };
  });

  if (uploadedImageUrl) {
    const last = input[input.length - 1];
    if (last?.role === "user") {
      const existingContent = typeof last.content === "string"
        ? [{ type: "input_text" as const, text: last.content }]
        : last.content;
      last.content = [
        ...existingContent,
        { type: "input_image", image_url: uploadedImageUrl, detail: "auto" },
      ];
    }
  }

  return input;
}
