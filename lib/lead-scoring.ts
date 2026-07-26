// 4.3 (Fase 4): lead scoring e risco de estagnação. A porta de saída do
// item pede "backtest temporal e experimento mostram lift" contra um
// score calibrado — isso pressupõe volume real de negócios fechados pra
// calibrar contra, que a base ainda não tem. A seção 6 do próprio roadmap
// já descarta essa alternativa explicitamente: "machine learning sem
// amostra: usar regras explicáveis e mostrar 'dados insuficientes' em vez
// de prever." Este módulo é exatamente esse fallback — não um modelo
// calibrado. `confidence` é sempre "baixa" até existir dado real pra
// calibrar (ver docs/roadmap-imobiliario/4.3-lead-scoring.md).
export type LeadScoreFactor = { label: string; points: number; reason: string };

export type LeadScoreResult = {
  score: number;
  confidence: "baixa";
  factors: LeadScoreFactor[];
  stagnationRisk: "baixo" | "médio" | "alto";
};

const STAGNATION_LOW_DAYS = 5;
const STAGNATION_HIGH_DAYS = 10;

// Deliberadamente NÃO usa value_cents (valor do negócio) como fator — é
// exatamente o viés que o roadmap aponta como problema ("pode favorecer
// apenas negócios maiores"). Um negócio pequeno e quente pontua mais que
// um grande e parado, de propósito.
export function computeLeadScore(input: {
  daysSinceLastActivity: number;
  hasOpenNextAction: boolean;
  stage: "novo" | "em_contato" | "negociacao";
}): LeadScoreResult {
  const factors: LeadScoreFactor[] = [];

  if (input.hasOpenNextAction) {
    factors.push({ label: "Próxima ação definida", points: 30, reason: "Tem tarefa aberta vinculada." });
  } else {
    factors.push({ label: "Sem próxima ação", points: 0, reason: "Nenhuma tarefa aberta vinculada." });
  }

  if (input.daysSinceLastActivity <= 2) {
    factors.push({ label: "Atividade muito recente", points: 30, reason: "Última atividade há 2 dias ou menos." });
  } else if (input.daysSinceLastActivity <= STAGNATION_LOW_DAYS) {
    factors.push({ label: "Atividade recente", points: 15, reason: `Última atividade há ${input.daysSinceLastActivity} dias.` });
  } else if (input.daysSinceLastActivity <= STAGNATION_HIGH_DAYS) {
    factors.push({ label: "Atividade esfriando", points: 5, reason: `Última atividade há ${input.daysSinceLastActivity} dias.` });
  } else {
    factors.push({ label: "Sem atividade recente", points: 0, reason: `Última atividade há ${input.daysSinceLastActivity} dias.` });
  }

  if (input.stage === "negociacao") {
    factors.push({ label: "Em proposta", points: 20, reason: "Negócio já avançou até a etapa de proposta." });
  } else if (input.stage === "em_contato") {
    factors.push({ label: "Em contato", points: 10, reason: "Negócio já saiu da etapa inicial." });
  } else {
    factors.push({ label: "Etapa inicial", points: 0, reason: "Negócio ainda na primeira etapa." });
  }

  const score = Math.min(100, factors.reduce((sum, f) => sum + f.points, 0));

  const stagnationRisk: LeadScoreResult["stagnationRisk"] =
    input.daysSinceLastActivity > STAGNATION_HIGH_DAYS ? "alto" : input.daysSinceLastActivity > STAGNATION_LOW_DAYS ? "médio" : "baixo";

  return { score, confidence: "baixa", factors, stagnationRisk };
}
