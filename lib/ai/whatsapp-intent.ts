import Anthropic from "@anthropic-ai/sdk";
import type { WhatsappHistoryMessage } from "@/lib/ai/whatsapp-reply";

const MODEL = "claude-sonnet-5";

export type PurchaseIntent = { hasIntent: boolean; dealTitle: string };

// Chamada separada e barata (tool_choice forçado, sem thinking) só pra
// classificar se o contato demonstrou intenção real de comprar/contratar —
// mantém o prompt da resposta conversacional (whatsapp-reply.ts) limpo, sem
// misturar "responda ao cliente" com "preencha esse formulário".
export async function detectPurchaseIntent(
  history: WhatsappHistoryMessage[],
  contactName: string | null
): Promise<PurchaseIntent | null> {
  if (!process.env.ANTHROPIC_API_KEY || history.length === 0) return null;

  const client = new Anthropic();
  let message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: `Avalie a conversa de WhatsApp abaixo com ${contactName ?? "um contato"}. Ele demonstrou interesse REAL em contratar/comprar/fechar negócio (não é só bate-papo, dúvida genérica, reclamação, ou um "talvez depois" educado)? Responda só chamando a ferramenta avaliar_intencao.`,
      tools: [
        {
          name: "avaliar_intencao",
          description: "Registra se o contato demonstrou intenção real de compra/contratação nesta conversa.",
          input_schema: {
            type: "object",
            properties: {
              intencao_de_compra: {
                type: "boolean",
                description: "true somente se há interesse concreto em contratar/comprar, não bate-papo genérico",
              },
              titulo_sugerido: {
                type: "string",
                description: "Título curto pro negócio no funil de vendas, ex: 'Consultoria - João'",
              },
            },
            required: ["intencao_de_compra"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "avaliar_intencao" },
      messages: history,
    });
  } catch {
    return null; // não bloqueia o fluxo principal por causa de uma classificação
  }

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) return null;

  const input = toolUse.input as { intencao_de_compra?: boolean; titulo_sugerido?: string };
  if (!input.intencao_de_compra) return { hasIntent: false, dealTitle: "" };

  const fallbackTitle = contactName ? `WhatsApp - ${contactName}` : "WhatsApp - novo contato";
  return { hasIntent: true, dealTitle: (input.titulo_sugerido || fallbackTitle).slice(0, 160) };
}
