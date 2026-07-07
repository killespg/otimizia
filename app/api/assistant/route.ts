import Anthropic from "@anthropic-ai/sdk";
import type { User } from "@supabase/supabase-js";
import { saveAssistantMessage } from "@/lib/ai/history";
import { getActiveOrgId } from "@/lib/org";
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
  const orgId = await getActiveOrgId(supabase, user.id);
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

  // Só a última mensagem é nova — o cliente reenvia o histórico acumulado a
  // cada chamada, e o resto já foi salvo em requisições anteriores.
  const lastIncoming = history[history.length - 1];
  if (lastIncoming.role === "user" && typeof lastIncoming.content === "string") {
    await saveAssistantMessage(supabase, user.id, orgId, "user", lastIncoming.content);
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
      let assistantText = "";

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
              assistantText += event.delta.text;
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
                orgId,
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
        const message = friendlyError(error);
        assistantText += (assistantText ? "\n" : "") + message;
        send({ type: "error", message, mutated });
      } finally {
        await saveAssistantMessage(supabase, user.id, orgId, "assistant", assistantText);
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
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      continue;
    }
    const text = content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!text) continue;
    messages.push({ role, content: text });
  }
  // A primeira mensagem precisa ser do usuário.
  while (messages.length > 0 && messages[0].role !== "user") messages.shift();
  return messages;
}

function friendlyError(error: unknown): string {
  console.error("[api/assistant]", error);
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
