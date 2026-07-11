import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";

export type MovementReview = { needsReview: boolean; reason: string; urgent: boolean };

// Classifica se uma movimentação processual nova provavelmente exige atenção
// do advogado (ex.: publicação, decisão, intimação — que costumam abrir
// prazo) vs. andamento puramente administrativo/interno (ex.: "conclusos
// para despacho", "autos recebidos"). NUNCA calcula a data real do prazo —
// isso depende de regras processuais (dias úteis, tipo de prazo, suspensões)
// que uma classificação de texto não tem como saber com segurança; contar
// prazo errado tem consequência real. O que sai daqui é só "revisar ou não".
export async function classifyDatajudMovement(
  movimentoNome: string,
  caseTitle: string
): Promise<MovementReview | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic();
  let message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: `Você ajuda um escritório de advocacia a não perder prazo. Avalie a movimentação processual abaixo (caso "${caseTitle}") e diga se ela provavelmente exige que um advogado revise o processo e defina um prazo (ex.: publicação, decisão, despacho, intimação, citação, sentença) — ou se é só andamento administrativo/interno sem necessidade de ação (ex.: "conclusos para despacho", "autos recebidos", "certidão de decurso de prazo" sem novo prazo). Responda só chamando a ferramenta.`,
      tools: [
        {
          name: "avaliar_movimentacao",
          description: "Registra se a movimentação processual exige revisão do advogado.",
          input_schema: {
            type: "object",
            properties: {
              precisa_revisao: { type: "boolean", description: "true se um advogado deve revisar e possivelmente definir prazo" },
              urgente: { type: "boolean", description: "true se parece prazo curto ou crítico (ex: decisão, intimação urgente)" },
              motivo: { type: "string", description: "explicação curta em português, 1 frase" },
            },
            required: ["precisa_revisao", "motivo"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "avaliar_movimentacao" },
      messages: [{ role: "user", content: movimentoNome }],
    });
  } catch {
    return null; // classificação é um extra — não bloqueia a sincronização
  }

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) return null;
  const input = toolUse.input as { precisa_revisao?: boolean; urgente?: boolean; motivo?: string };
  return {
    needsReview: Boolean(input.precisa_revisao),
    urgent: Boolean(input.urgente),
    reason: (input.motivo ?? "").slice(0, 200),
  };
}
