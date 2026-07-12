import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";
const MAX_FIELD_CHARS = 2000;

export type PetitionDraftCase = {
  title: string;
  area: string | null;
  court: string | null;
  jurisdiction: string | null;
  caseNumber: string | null;
  opposingParty: string | null;
  clientName: string | null;
  summary: string | null;
  recentEvents: { title: string; description: string | null }[];
};

// Gera o rascunho de uma peça processual a partir dos dados do caso já
// cadastrados. É sempre um ponto de partida: o modelo não tem acesso aos
// autos nem à estratégia completa do escritório, então o texto pode errar
// fundamentação, prazo ou pedido. Por isso o system prompt exige o aviso de
// revisão dentro do próprio texto gerado, além do aviso fixo que a tela
// mostra ao redor do resultado.
export async function generatePetitionDraft(
  pieceType: string,
  instructions: string,
  legalCase: PetitionDraftCase
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic();
  let message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(pieceType, instructions, legalCase) }],
    });
  } catch {
    return null;
  }

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return text || null;
}

function buildSystemPrompt(): string {
  return `Você é um assistente de redação jurídica para um escritório de advocacia brasileiro. Sua tarefa é escrever um RASCUNHO inicial de peça processual a partir dos dados de um caso, para um advogado revisar, corrigir e completar antes de usar.

Regras:
- Português jurídico formal, estrutura tradicional de peça (endereçamento, qualificação das partes quando houver dado, fatos, fundamentação, pedidos, fecho).
- Use só os dados fornecidos. Onde faltar informação (fundamento legal específico, valor da causa, data, documento), deixe um marcador claro como "[COMPLETAR: ...]" em vez de inventar.
- Nunca invente jurisprudência, número de lei/artigo ou precedente que não foi informado — se for citar fundamento legal, deixe "[CONFERIR FUNDAMENTO LEGAL]" quando não tiver certeza.
- Não inclua comentário fora da peça em si, exceto a primeira linha, que deve ser exatamente: "RASCUNHO GERADO POR IA — revise, confira fundamentos e complete antes de usar." seguida de linha em branco.
- Responda só com o texto da peça, sem markdown (sem **negrito**, sem listas com "-").`;
}

function buildUserPrompt(pieceType: string, instructions: string, legalCase: PetitionDraftCase): string {
  const lines = [
    `Tipo de peça: ${pieceType}`,
    `Caso: ${legalCase.title}`,
    legalCase.area ? `Área do direito: ${legalCase.area}` : "",
    legalCase.court ? `Tribunal/vara: ${legalCase.court}` : "",
    legalCase.jurisdiction ? `Comarca: ${legalCase.jurisdiction}` : "",
    legalCase.caseNumber ? `Número do processo: ${legalCase.caseNumber}` : "",
    legalCase.clientName ? `Cliente (parte representada): ${legalCase.clientName}` : "",
    legalCase.opposingParty ? `Parte contrária: ${legalCase.opposingParty}` : "",
    legalCase.summary ? `Resumo/estratégia do caso: ${legalCase.summary.slice(0, MAX_FIELD_CHARS)}` : "",
    ...legalCase.recentEvents.map(
      (event) => `Movimentação registrada: ${event.title}${event.description ? ` — ${event.description.slice(0, 400)}` : ""}`
    ),
    instructions ? `Instruções específicas do advogado: ${instructions.slice(0, MAX_FIELD_CHARS)}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}
