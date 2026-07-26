import Anthropic from "@anthropic-ai/sdk";
import type { TimelineEntry } from "@/lib/timeline";

const MODEL = "claude-sonnet-5";

export type CitedFact = { fato: string; fonte_index: number };

export type ContactSummary = {
  resumo: string;
  pendencias: string[];
  fatos_citaveis: CitedFact[];
  sugestao_resposta: string;
};

const SUMMARIZE_TOOL: Anthropic.Tool = {
  name: "summarize_contact",
  description:
    "Resume a linha do tempo de um contato para o corretor se preparar antes de responder. Todo fato apontado precisa citar de qual item da linha do tempo (por índice) ele veio.",
  input_schema: {
    type: "object",
    properties: {
      resumo: { type: "string", description: "1-2 frases sobre o estado atual da relação com este contato." },
      pendencias: {
        type: "array",
        items: { type: "string" },
        description: "O que está em aberto e precisa de ação (tarefas, propostas, visitas). Vazio se não houver nada pendente.",
      },
      fatos_citaveis: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fato: { type: "string", description: "Um fato específico e verificável (não opinião nem suposição)." },
            fonte_index: { type: "integer", description: "Índice (posição, começando em 0) do item da linha do tempo fornecida que sustenta este fato." },
          },
          required: ["fato", "fonte_index"],
        },
        description: "Fatos citáveis, cada um amarrado a um item real da linha do tempo — nunca invente um fato sem fonte.",
      },
      sugestao_resposta: {
        type: "string",
        description: "Rascunho curto de próxima mensagem para este contato, em português informal. O corretor revisa e decide se envia — isso nunca é enviado sozinho.",
      },
    },
    required: ["resumo", "pendencias", "fatos_citaveis", "sugestao_resposta"],
  },
};

// 4.2 (Fase 4): resumo e preparação de atendimento. IA explicável (seção 1
// do roadmap) — cada fato citado aponta pro índice do item de
// lib/timeline.ts que o sustenta, então a UI pode linkar a fonte. Nunca
// envia nada sozinho: sugestao_resposta é só um rascunho pro corretor
// revisar (mesmo princípio de "automação assistida antes de autonomia
// total").
export async function generateContactSummary(
  contactName: string,
  timeline: TimelineEntry[]
): Promise<ContactSummary | null> {
  if (!process.env.ANTHROPIC_API_KEY || timeline.length === 0) return null;

  const timelineText = timeline
    .map((entry, index) => `[${index}] (${entry.kind}, ${entry.at}) ${entry.title}${entry.detail ? ` — ${entry.detail}` : ""}`)
    .join("\n");

  const client = new Anthropic();
  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: buildSystemPrompt(contactName),
      tools: [SUMMARIZE_TOOL],
      tool_choice: { type: "tool", name: "summarize_contact" },
      messages: [{ role: "user", content: timelineText }],
    });
  } catch {
    return null;
  }

  const toolUse = message.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  if (!toolUse) return null;

  return sanitizeContactSummary(toolUse.input, timeline.length);
}

// Defesa em profundidade, mesmo padrão de sanitizeParsedFilters
// (lib/ai/property-filter-chat.ts): nunca confia cegamente no tool_use
// input. fonte_index fora do intervalo da timeline fornecida é descartado
// — um link quebrado é pior que nenhum link.
export function sanitizeContactSummary(raw: unknown, timelineLength: number): ContactSummary {
  const input = (raw ?? {}) as Record<string, unknown>;

  const pendencias = Array.isArray(input.pendencias)
    ? input.pendencias.filter((p): p is string => typeof p === "string").map((p) => p.slice(0, 300)).slice(0, 10)
    : [];

  const fatosRaw = Array.isArray(input.fatos_citaveis) ? input.fatos_citaveis : [];
  const fatos_citaveis: CitedFact[] = fatosRaw
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => ({
      fato: typeof f.fato === "string" ? f.fato.slice(0, 300) : "",
      fonte_index: Number(f.fonte_index),
    }))
    .filter((f) => f.fato.length > 0 && Number.isInteger(f.fonte_index) && f.fonte_index >= 0 && f.fonte_index < timelineLength)
    .slice(0, 15);

  return {
    resumo: typeof input.resumo === "string" ? input.resumo.slice(0, 500) : "",
    pendencias,
    fatos_citaveis,
    sugestao_resposta: typeof input.sugestao_resposta === "string" ? input.sugestao_resposta.slice(0, 800) : "",
  };
}

function buildSystemPrompt(contactName: string): string {
  return `Você prepara um corretor/vendedor brasileiro para retomar contato com ${contactName}, a partir da linha do tempo fornecida (uma linha por item, já numerada com [índice]).

Regras:
- Todo fato em "fatos_citaveis" precisa vir de um item real da linha do tempo — nunca invente ou infira além do que está escrito. Cite o índice exato.
- "pendencias" é só o que está genuinamente em aberto (tarefa não concluída, proposta sem resposta, visita não confirmada) — não repita o resumo aqui.
- "sugestao_resposta" é um rascunho, não uma mensagem pronta pra disparar sozinha — o corretor sempre revisa antes de enviar.
- Português coloquial brasileiro, direto, sem markdown, sem "espero que esteja bem" genérico.
- Se a linha do tempo for curta ou não tiver nada de relevante em aberto, diga isso no resumo em vez de inventar pendência.`;
}
