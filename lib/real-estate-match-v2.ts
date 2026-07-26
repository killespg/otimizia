import type { RealEstateDealPropertyStatus, RealEstateMatchExplanation, RealEstatePropertyType } from "@/lib/supabase/types";

// 4.1 (Fase 4): matching v2 — score híbrido. O v1 (lib/real-estate-match.ts)
// continua sendo a base determinística (restrições duras + preferências
// suaves); v2 soma um ajuste de comportamento por cima, sempre explicado
// fator a fator (IA explicável, seção 1 do roadmap: "toda recomendação
// mostra os dados e motivos usados"). Não é ML — é uma regra legível sobre
// o próprio histórico do negócio (real_estate_deal_properties), depende de
// 2.3 (dados limpos: sem duplicata/imóvel incompleto quebrando o score).
const POSITIVE_STATUSES: RealEstateDealPropertyStatus[] = ["interested", "visit_scheduled", "offer", "won"];
const NEGATIVE_STATUSES: RealEstateDealPropertyStatus[] = ["rejected"];

const BONUS_PER_MATCH = 3;
const PENALTY_PER_MATCH = 3;
const MAX_ADJUSTMENT = 10;

export type DealPropertyHistoryEntry = {
  status: RealEstateDealPropertyStatus;
  propertyType: RealEstatePropertyType;
  neighborhood: string | null;
};

export type CandidateProperty = {
  propertyType: RealEstatePropertyType;
  neighborhood: string | null;
};

export type BehaviorAdjustment = {
  points: number;
  reason: string;
};

// Soma sinais de tipo e bairro em comum com o histórico do próprio negócio
// — positivo quando o cliente já demonstrou interesse (ou fechou) em algo
// parecido, negativo quando já rejeitou algo parecido. Sempre limitado a
// ±MAX_ADJUSTMENT pra não deixar o comportamento dominar as restrições
// duras/preferências do v1.
export function computeBehaviorAdjustment(
  history: DealPropertyHistoryEntry[],
  candidate: CandidateProperty
): BehaviorAdjustment {
  let positiveTypeMatches = 0;
  let positiveNeighborhoodMatches = 0;
  let negativeTypeMatches = 0;
  let negativeNeighborhoodMatches = 0;

  for (const entry of history) {
    const sameType = entry.propertyType === candidate.propertyType;
    const sameNeighborhood = Boolean(entry.neighborhood) && entry.neighborhood === candidate.neighborhood;
    if (POSITIVE_STATUSES.includes(entry.status)) {
      if (sameType) positiveTypeMatches++;
      if (sameNeighborhood) positiveNeighborhoodMatches++;
    } else if (NEGATIVE_STATUSES.includes(entry.status)) {
      if (sameType) negativeTypeMatches++;
      if (sameNeighborhood) negativeNeighborhoodMatches++;
    }
  }

  const rawPoints =
    (positiveTypeMatches + positiveNeighborhoodMatches) * BONUS_PER_MATCH -
    (negativeTypeMatches + negativeNeighborhoodMatches) * PENALTY_PER_MATCH;
  const points = Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, rawPoints));

  const reasons: string[] = [];
  if (positiveTypeMatches > 0) reasons.push(`interesse anterior em ${positiveTypeMatches} imóvel(is) do mesmo tipo`);
  if (positiveNeighborhoodMatches > 0) reasons.push(`interesse anterior em ${positiveNeighborhoodMatches} imóvel(is) do mesmo bairro`);
  if (negativeTypeMatches > 0) reasons.push(`rejeitou ${negativeTypeMatches} imóvel(is) do mesmo tipo antes`);
  if (negativeNeighborhoodMatches > 0) reasons.push(`rejeitou ${negativeNeighborhoodMatches} imóvel(is) do mesmo bairro antes`);

  return {
    points,
    reason: reasons.length > 0 ? `Baseado no histórico deste cliente: ${reasons.join("; ")}.` : "Sem histórico suficiente deste cliente para ajustar.",
  };
}

export type HybridMatchResult = {
  score: number;
  baseScore: number;
  behaviorAdjustment: BehaviorAdjustment;
  explanation: RealEstateMatchExplanation;
};

// Combina o resultado do v1 com o ajuste de comportamento, adicionando um
// critério "comportamento" na explicação — nunca substitui os critérios
// determinísticos, só soma um a mais.
export function combineWithBehavior(
  base: { score: number; explanation: RealEstateMatchExplanation },
  history: DealPropertyHistoryEntry[],
  candidate: CandidateProperty
): HybridMatchResult {
  const adjustment = computeBehaviorAdjustment(history, candidate);
  const score = Math.max(0, Math.min(100, base.score + adjustment.points));
  return {
    score,
    baseScore: base.score,
    behaviorAdjustment: adjustment,
    explanation: {
      ...base.explanation,
      behavior: { points: adjustment.points, max: MAX_ADJUSTMENT, reason: adjustment.reason },
    },
  };
}
