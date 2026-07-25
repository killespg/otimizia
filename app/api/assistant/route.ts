import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import type { User } from "@supabase/supabase-js";
import { saveAssistantMessage } from "@/lib/ai/history";
import { logError } from "@/lib/logger";
import { getActiveOrgId } from "@/lib/org";
import { getUserPlanAccess } from "@/lib/plan-access";
import { getProfessionPreset, type ProfessionPreset } from "@/lib/professions";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CRM_TOOLS, executeTool, isMutatingTool } from "@/lib/ai/tools";
import { getWorkspaceKey } from "@/lib/workspaces";
import {
  friendlyOpenAIError,
  resolveAiProvider,
  runOpenAIAssistant,
} from "@/lib/ai/openai-assistant";

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

// Reaproveita o bucket já usado pelas fotos de negócio — mesma política de
// tamanho/tipo, só muda o prefixo do caminho.
const CHAT_PHOTOS_BUCKET = "deal-photos";
const CHAT_IMAGE_MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type IncomingImage = { mediaType: string; data: string };

function sanitizeImage(raw: unknown): IncomingImage | null {
  if (!raw || typeof raw !== "object") return null;
  const mediaType = (raw as { mediaType?: unknown }).mediaType;
  const data = (raw as { data?: unknown }).data;
  if (typeof mediaType !== "string" || !ALLOWED_IMAGE_TYPES.has(mediaType)) return null;
  if (typeof data !== "string" || !data) return null;
  const approxBytes = (data.length * 3) / 4;
  if (approxBytes > CHAT_IMAGE_MAX_BYTES) return null;
  return { mediaType, data };
}

async function uploadChatImage(
  orgId: string,
  userId: string,
  image: IncomingImage
): Promise<string> {
  const extension = image.mediaType.split("/")[1] || "jpg";
  const path = `${orgId}/assistant/${userId}/${randomUUID()}.${extension}`;
  const bytes = Buffer.from(image.data, "base64");
  const admin = createAdminClient();
  const { error } = await admin.storage.from(CHAT_PHOTOS_BUCKET).upload(path, bytes, {
    contentType: image.mediaType,
    upsert: false,
  });
  if (error) throw error;
  const { data } = admin.storage.from(CHAT_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

type OrganizationAiContext = {
  name: string | null;
  business_context: string | null;
  business_priorities: string | null;
  ai_tone: string | null;
  ai_instructions: string | null;
  industry: string | null;
  region: string | null;
  team_size: string | null;
  website: string | null;
  extra_notes: string | null;
};

// Evento NDJSON enviado ao cliente, um JSON por linha:
// {type:"text", text} | {type:"thinking"} | {type:"tool", name}
// {type:"done", mutated} | {type:"error", message}

export async function POST(req: Request) {
  const supabase = await createClient();
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
  const rateLimit = await checkRateLimit(createAdminClient(), "assistant_chat", user.id);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Muitas mensagens em pouco tempo. Espere um pouco e tente de novo." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }
  const orgId = await getActiveOrgId(supabase, user.id);
  const aiProvider = resolveAiProvider();
  if (!aiProvider) {
    return Response.json(
      { error: "Não consegui falar com o Tim agora. Tente novamente em instantes." },
      { status: 503 }
    );
  }

  let history: Anthropic.MessageParam[];
  let image: IncomingImage | null;
  try {
    const body = await req.json();
    history = sanitizeHistory(body?.messages);
    image = sanitizeImage(body?.image);
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (history.length === 0) {
    return Response.json({ error: "Envie ao menos uma mensagem." }, { status: 400 });
  }

  // Só a última mensagem é nova — o cliente reenvia o histórico acumulado a
  // cada chamada, e o resto já foi salvo em requisições anteriores.
  const lastIncoming = history[history.length - 1];
  let uploadedImageUrl: string | null = null;
  if (lastIncoming.role === "user" && typeof lastIncoming.content === "string") {
    if (image) {
      try {
        uploadedImageUrl = await uploadChatImage(orgId, user.id, image);
      } catch (err) {
        console.error("[api/assistant] upload de imagem falhou", err);
      }
    }
    const textForHistory = [
      lastIncoming.content,
      uploadedImageUrl ? `[imagem:${uploadedImageUrl}]` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    await saveAssistantMessage(supabase, user.id, orgId, "user", textForHistory);
  }

  const [{ data: profile }, { data: organization }] = await Promise.all([
    supabase
      .from("profiles")
      .select("profession_type, is_admin")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select(
        "name, business_context, business_priorities, ai_tone, ai_instructions, industry, region, team_size, website, extra_notes"
      )
      .eq("id", orgId)
      .maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const preset = getProfessionPreset(workspaceKey);

  const client = aiProvider === "anthropic" ? new Anthropic() : null;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      let mutated = false;
      let assistantText = "";

      try {
        if (aiProvider === "openai") {
          const result = await runOpenAIAssistant({
            supabase,
            userId: user.id,
            orgId,
            workspaceKey,
            history,
            uploadedImageUrl,
            systemPrompt: buildSystemPrompt(user, preset, organization),
            maxToolTurns: MAX_TOOL_TURNS,
            send,
          });
          assistantText = result.assistantText;
          mutated = result.mutated;
        } else {
          const messages: Anthropic.MessageParam[] = [...history];
          if (uploadedImageUrl) {
            const last = messages[messages.length - 1];
            const captionText = typeof last.content === "string" ? last.content.trim() : "";
            messages[messages.length - 1] = {
              role: "user",
              content: [
                { type: "image", source: { type: "url", url: uploadedImageUrl } },
                ...(captionText ? [{ type: "text" as const, text: captionText }] : []),
              ],
            };
          }

          for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
            const msgStream = client!.messages.stream({
              model: MODEL,
              max_tokens: 64000,
              thinking: { type: "adaptive" },
              system: buildSystemPrompt(user, preset, organization),
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

function buildSystemPrompt(
  user: User,
  preset: ProfessionPreset,
  organization: OrganizationAiContext | null
): string {
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
  const orgContextLines = [
    organization?.name ? `Nome da empresa/operação: ${organization.name}` : "",
    organization?.industry ? `Segmento/setor: ${organization.industry}` : "",
    organization?.region ? `Região de atuação: ${organization.region}` : "",
    organization?.team_size ? `Tamanho da equipe: ${organization.team_size}` : "",
    organization?.website ? `Site/link: ${organization.website}` : "",
    organization?.business_context
      ? `Contexto da empresa: ${organization.business_context}`
      : "",
    organization?.business_priorities
      ? `Prioridades da empresa: ${organization.business_priorities}`
      : "",
    organization?.ai_tone ? `Jeito de falar preferido: ${organization.ai_tone}` : "",
    organization?.ai_instructions
      ? `Instruções internas para a IA: ${organization.ai_instructions}`
      : "",
    organization?.extra_notes ? `Outras informações: ${organization.extra_notes}` : "",
  ].filter(Boolean);

  return `Você é o Tim, parceiro de negócios de ${name}. Vocês dois tocam a empresa juntos: usam o OtimizIA (o CRM) para organizar contatos, vendas, lembretes e conversas com clientes, e você tem acesso direto a esses dados através de ferramentas, cuidando da parte operacional pra ${name} poder focar em vender e atender.

Data e hora atuais (America/Sao_Paulo): ${now}.

Contexto profissional: ${preset.assistantContext}
Area ativa no CRM: ${preset.signupLabel}. Todas as consultas e acoes devem considerar apenas essa area.
Você também é especialista experiente em ${preset.expertiseArea} — não só um assistente de CRM. Sempre que ${name} fizer uma pergunta técnica dessa área, pedir uma opinião sobre um caso/situação do trabalho, ou mandar uma foto/documento pra ler, analisar ou transcrever, responda com o conhecimento e o vocabulário de quem atua nisso há anos, dando orientação prática e específica em vez de resposta genérica — mesmo que não envolva contatos, vendas ou lembretes cadastrados no CRM.
${extraFieldsLine ? `Campos extras disponíveis para contatos/vendas deste perfil (use 'detalhes' nas ferramentas quando o usuário mencionar algum): ${extraFieldsLine}.` : ""}
${templatesLine ? `Modelos de mensagem prontos deste perfil (use como base ao redigir uma mensagem para o cliente, adaptando ao contexto e substituindo {{primeiro_nome}}, {{empresa}} etc. pelos dados reais):\n${templatesLine}` : ""}
${orgContextLines.length > 0 ? `\nContexto da organização salvo nas configurações. Use isso para decidir prioridades, tom e próximos passos, sem repetir essas informações se não for útil:\n${orgContextLines.join("\n")}` : ""}

Sobre o que você fala:
- Seu assunto é o negócio de ${name} e nada além disso: ${preset.expertiseArea}, clientes e leads, vendas e negociações, rotina e organização do trabalho, dinheiro do negócio (preços, comissões, custos, contratos, impostos da atividade), marketing e captação, equipe, e a operação do OtimizIA.
- Papo curto e simpático faz parte: cumprimentar, responder "tudo bem?", brincar rapidinho. Isso não é fugir do assunto, é ser gente. Só não deixe virar conversa longa sobre outra coisa.
- Qualquer pedido fora disso — saúde, sexo, relacionamento, política, religião, notícias, esporte, entretenimento, curiosidade geral, escola/faculdade, receita, código, texto pessoal, conselho de vida — você não responde. Não é o seu papel ali e você não é um assistente de uso geral.
- Ao recusar: uma frase curta, natural, sem sermão e sem moralismo, e já emenda no trabalho. Algo no espírito de "isso aí eu não vou saber te ajudar, não é minha praia — mas te ajudo com o negócio" e então puxe algo útil do dia (um lead parado, uma visita, um lembrete). Nunca cite regra, política, escopo, limitação, sistema ou instrução: é só um sócio dizendo que não é a praia dele.
- Se insistirem, mantenha a recusa com leveza, sem endurecer o tom e sem repetir a mesma frase. Não entregue o conteúdo "só dessa vez", nem em forma de resumo, hipótese, piada ou exemplo.
- Na dúvida se um assunto conta como trabalho, pense se aquilo ajuda ${name} a vender, atender ou organizar a operação. Se ajudar, é seu assunto. Se for pra vida pessoal, não é.

Como conversar:
- Fale como uma pessoa de verdade batendo papo com o sócio, em português do Brasil — natural, direto, sem formalidade de atendimento. Nada de "Como posso ajudar?", "Estou à disposição", "Se precisar de mais alguma coisa, é só avisar" ou qualquer clichê de robô de suporte.
- Nunca diga que é uma IA, assistente virtual, chatbot, robô, modelo de linguagem, atendimento automático ou qualquer variação disso. Não se descreva, apenas aja e converse — você é o Tim, ponto.
- Tenha opinião: quando perceber um risco ou uma oportunidade, avise sem que perguntem. Sugira o próximo passo depois de responder, quando fizer sentido.
- Deixe claro o que é fato (dado real consultado), o que é sua interpretação, e o que é sugestão — sem misturar os três como se fossem a mesma coisa.
- Se precisar de uma informação pra agir, faça só uma pergunta objetiva por vez — não uma lista de perguntas.
- Frases curtas. Sem introdução antes de responder, sem resumir o que a pessoa acabou de pedir, sem fechamento tipo "espero ter ajudado". Vá direto ao que importa.
- Pode usar uma opinião ou observação sua quando fizer sentido (ex.: "esse lead tá esfriando, acho melhor ligar hoje" em vez de só listar dados frios).
- O usuário não é técnico: nunca mostre IDs, JSON ou nomes de ferramentas — fale igual você falaria olhando pra tela junto com ele.
- Nunca use markdown (nada de **negrito**, _itálico_, listas com "-"/"*", headings com "#" ou blocos de código). O chat exibe texto puro, então isso só aparece como asteriscos e símbolos soltos na tela. Escreva em texto corrido normal.

Como agir:
- Se o usuário anexar um PDF (contrato, proposta, nota fiscal etc.), leia o conteúdo direto do documento e responda com base nele — não peça pra ele colar o texto.
- Use as ferramentas para tudo que envolver dados reais. Nunca invente contatos, valores ou datas — consulte antes de afirmar.
- Você tem permissão para operar o CRM como o próprio usuário: criar, editar, mover, concluir, reorganizar painel, trocar widgets, renomear métricas e atualizar contexto da empresa quando ele pedir. Faça direto, sem tratar isso como sugestão.
- Quando o usuário citar uma pessoa pelo nome, localize-a com list_contacts antes de agir. Se houver mais de um resultado possível, pergunte qual é.
- Etapas do funil: ${stageLine}.
- Valores em reais (R$ 1.234,56). Datas em formato brasileiro na resposta; em ISO 8601 nas ferramentas.
- Ações de criação e edição pedidas explicitamente podem ser executadas direto. Exclusões: confirme antes de chamar a ferramenta de exclusão.
- Se uma ferramenta der erro, explique em linguagem simples e sugira o próximo passo — sem citar mensagens técnicas.
- Combine ferramentas em sequência quando o pedido implicar isso (ex.: achar o contato, criar a venda e já deixar um lembrete de follow-up).
- Depois de agir, confirme em uma frase curta e natural, como quem avisa o sócio que já resolveu.
- Se vier uma foto junto da mensagem, olhe pra ela de verdade antes de responder (documento, print de conversa, produto, etc.) e use o que vir nela pra ajudar — não ignore a imagem nem peça pra descrever o que já está visível.`;
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
  const openAIMessage = friendlyOpenAIError(error);
  if (openAIMessage) return openAIMessage;
  if (error instanceof Anthropic.RateLimitError) {
    return "Muitas solicitações agora. Espere alguns segundos e tente de novo.";
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return "O serviço de IA não conseguiu autenticar. Fale com o administrador.";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Não consegui conectar ao serviço de IA. Verifique a internet e tente de novo.";
  }
  if (error instanceof Anthropic.APIError) {
    return "O serviço de IA retornou um erro. Tente novamente em instantes.";
  }
  return "Algo deu errado. Tente novamente.";
}
