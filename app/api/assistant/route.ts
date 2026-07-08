import Anthropic from "@anthropic-ai/sdk";
import type { User } from "@supabase/supabase-js";
import { logError } from "@/lib/logger";
import { getUserPlanAccess } from "@/lib/plan-access";
import { getProfessionPreset, type ProfessionPreset } from "@/lib/professions";
import { createClient } from "@/lib/supabase/server";
import { CRM_TOOLS, executeTool, isMutatingTool } from "@/lib/ai/tools";
import { getWorkspaceKey } from "@/lib/workspaces";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "claude-sonnet-5";
const MAX_TOOL_TURNS = 10;
const MAX_HISTORY = 30;
const MAX_MESSAGE_CHARS = 4000;
// Um pouco acima do limite de arquivo do cliente (MAX_PDF_BYTES em
// lib/ai/usePdfAttachment.ts) já convertido pra base64 (~33% maior),
// pra sobrar folga sem abrir espaço pra payloads muito maiores que o
// cliente jamais enviaria de propósito.
const MAX_PDF_BASE64_CHARS = 4_500_000;

// Evento NDJSON enviado ao cliente, um JSON por linha:
// {type:"text", text} | {type:"thinking"} | {type:"tool", name}
// {type:"done", mutated} | {type:"error", message}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  const access = await getUserPlanAccess(supabase, user.id);
  if (!access.hasAccess) {
    return Response.json({ error: "Seu teste gratis acabou." }, { status: 402 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY não configurada no servidor." },
      { status: 500 }
    );
  }

  let history: Anthropic.MessageParam[];
  try {
    const body = await req.json();
    history = sanitizeHistory(body?.messages);
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (history.length === 0) {
    return Response.json({ error: "Envie ao menos uma mensagem." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("profession_type, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const preset = getProfessionPreset(workspaceKey);

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      const messages: Anthropic.MessageParam[] = [...history];
      let mutated = false;

      try {
        for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
          const msgStream = client.messages.stream({
            model: MODEL,
            max_tokens: 64000,
            thinking: { type: "adaptive" },
            system: buildSystemPrompt(user, preset),
            tools: CRM_TOOLS,
            messages,
          });

          for await (const event of msgStream) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "thinking") {
                send({ type: "thinking" });
              } else if (event.content_block.type === "tool_use") {
                send({ type: "tool", name: event.content_block.name });
              }
            } else if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              send({ type: "text", text: event.delta.text });
            }
          }

          const message = await msgStream.finalMessage();
          messages.push({ role: "assistant", content: message.content });

          if (message.stop_reason === "pause_turn") continue;
          if (message.stop_reason !== "tool_use") break;

          const toolUses = message.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );

          const results: Anthropic.ToolResultBlockParam[] = [];
          for (const toolUse of toolUses) {
            let content: string;
            let isError = false;
            try {
              content = await executeTool(
                supabase,
                user.id,
                workspaceKey,
                toolUse.name,
                toolUse.input
              );
              if (isMutatingTool(toolUse.name)) mutated = true;
            } catch (error) {
              isError = true;
              content =
                error instanceof Error ? error.message : "Erro ao executar a ação.";
            }
            results.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content,
              is_error: isError,
            });
          }
          messages.push({ role: "user", content: results });
        }

        send({ type: "done", mutated });
      } catch (error) {
        send({ type: "error", message: friendlyError(error), mutated });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function buildSystemPrompt(user: User, preset: ProfessionPreset): string {
  const name =
    typeof user.user_metadata?.name === "string" && user.user_metadata.name
      ? user.user_metadata.name
      : (user.email?.split("@")[0] ?? "empreendedor(a)");

  const now = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "full",
    timeStyle: "short",
  });

  const stageLine = (["novo", "em_contato", "negociacao", "ganho", "perdido"] as const)
    .map((key) => `${key} (exibida como "${preset.stages[key].label}")`)
    .join(", ");

  const extraFieldsLine = [...preset.contactFields, ...preset.dealFields]
    .map((field) => field.label)
    .join(", ");

  const templatesLine = preset.messageTemplates
    .map((template) => `- ${template.label}: "${template.body}"`)
    .join("\n");

  return `Você é sócio(a) de ${name} no negócio dele(a). Vocês dois tocam a empresa juntos e usam o OtimizIA (o CRM) para organizar contatos, vendas, lembretes e conversas com clientes. Você tem acesso direto a esses dados através de ferramentas e cuida da parte operacional para ${name} poder focar em vender e atender.

Data e hora atuais (America/Sao_Paulo): ${now}.

Contexto profissional: ${preset.assistantContext}
Area ativa no CRM: ${preset.signupLabel}. Todas as consultas e acoes devem considerar apenas essa area.
${extraFieldsLine ? `Campos extras disponíveis para contatos/vendas deste perfil (use 'detalhes' nas ferramentas quando o usuário mencionar algum): ${extraFieldsLine}.` : ""}
${templatesLine ? `Modelos de mensagem prontos deste perfil (use como base ao redigir uma mensagem para o cliente, adaptando ao contexto e substituindo {{primeiro_nome}}, {{empresa}} etc. pelos dados reais):\n${templatesLine}` : ""}

Como conversar:
- Fale como uma pessoa de verdade batendo papo com o sócio, em português do Brasil — natural, direto, sem formalidade de atendimento. Nada de "Como posso ajudar?", "Estou à disposição", "Se precisar de mais alguma coisa, é só avisar" ou qualquer clichê de robô de suporte.
- Nunca diga que é uma IA, assistente virtual, modelo de linguagem ou qualquer variação disso. Não se descreva, apenas aja e converse.
- Frases curtas. Sem introdução antes de responder, sem resumir o que a pessoa acabou de pedir, sem fechamento tipo "espero ter ajudado". Vá direto ao que importa.
- Pode usar uma opinião ou observação sua quando fizer sentido (ex.: "esse lead tá esfriando, acho melhor ligar hoje" em vez de só listar dados frios).
- O usuário não é técnico: nunca mostre IDs, JSON ou nomes de ferramentas — fale igual você falaria olhando pra tela junto com ele.

Como agir:
- Se o usuário anexar um PDF (contrato, proposta, nota fiscal etc.), leia o conteúdo direto do documento e responda com base nele — não peça pra ele colar o texto.
- Use as ferramentas para tudo que envolver dados reais. Nunca invente contatos, valores ou datas — consulte antes de afirmar.
- Quando o usuário citar uma pessoa pelo nome, localize-a com list_contacts antes de agir. Se houver mais de um resultado possível, pergunte qual é.
- Etapas do funil: ${stageLine}.
- Valores em reais (R$ 1.234,56). Datas em formato brasileiro na resposta; em ISO 8601 nas ferramentas.
- Ações de criação e edição pedidas explicitamente podem ser executadas direto. Exclusões: confirme antes de chamar a ferramenta de exclusão.
- Se uma ferramenta der erro, explique em linguagem simples e sugira o próximo passo — sem citar mensagens técnicas.
- Combine ferramentas em sequência quando o pedido implicar isso (ex.: achar o contato, criar a venda e já deixar um lembrete de follow-up).
- Depois de agir, confirme em uma frase curta e natural, como quem avisa o sócio que já resolveu.`;
}

function sanitizeHistory(raw: unknown): Anthropic.MessageParam[] {
  if (!Array.isArray(raw)) return [];
  const messages: Anthropic.MessageParam[] = [];
  for (const item of raw.slice(-MAX_HISTORY)) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    if (role !== "user" && role !== "assistant") continue;
    const rawContent = (item as { content?: unknown }).content;

    if (typeof rawContent === "string") {
      const text = rawContent.trim().slice(0, MAX_MESSAGE_CHARS);
      if (!text) continue;
      messages.push({ role, content: text });
      continue;
    }

    // Só a mensagem do usuário pode carregar um PDF anexado (bloco
    // "document"); a resposta do assistente sempre é texto puro.
    if (role === "user" && Array.isArray(rawContent)) {
      const blocks = sanitizeContentBlocks(rawContent);
      if (blocks.length > 0) messages.push({ role: "user", content: blocks });
    }
  }
  // A primeira mensagem precisa ser do usuário.
  while (messages.length > 0 && messages[0].role !== "user") messages.shift();
  return messages;
}

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function sanitizeContentBlocks(
  raw: unknown[]
): Array<Anthropic.TextBlockParam | Anthropic.DocumentBlockParam> {
  const blocks: Array<Anthropic.TextBlockParam | Anthropic.DocumentBlockParam> = [];
  let documentCount = 0;

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const type = (item as { type?: unknown }).type;

    if (type === "text") {
      const text = (item as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) {
        blocks.push({ type: "text", text: text.trim().slice(0, MAX_MESSAGE_CHARS) });
      }
      continue;
    }

    // Só um PDF por mensagem — evita que um cliente adulterado empilhe
    // vários documentos grandes num único turno.
    if (type === "document" && documentCount === 0) {
      const source = (item as { source?: unknown }).source;
      if (!source || typeof source !== "object") continue;
      const sourceType = (source as { type?: unknown }).type;
      const mediaType = (source as { media_type?: unknown }).media_type;
      const data = (source as { data?: unknown }).data;
      if (
        sourceType === "base64" &&
        mediaType === "application/pdf" &&
        typeof data === "string" &&
        data.length > 0 &&
        data.length <= MAX_PDF_BASE64_CHARS &&
        BASE64_RE.test(data)
      ) {
        documentCount++;
        blocks.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data },
        });
      }
    }
  }

  return blocks;
}

function friendlyError(error: unknown): string {
  logError("api/assistant", error);
  if (error instanceof Anthropic.RateLimitError) {
    return "Muitas solicitações agora. Espere alguns segundos e tente de novo.";
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return "A chave da API do Claude é inválida. Verifique a ANTHROPIC_API_KEY.";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Não consegui conectar ao serviço de IA. Verifique a internet e tente de novo.";
  }
  if (error instanceof Anthropic.APIError) {
    return "O serviço de IA retornou um erro. Tente novamente em instantes.";
  }
  return "Algo deu errado. Tente novamente.";
}
