import { describe, expect, it } from "vitest";
import { computeLeadScore } from "@/lib/lead-scoring";

describe("computeLeadScore", () => {
  it("pontua alto um negócio com próxima ação, atividade recente e em proposta", () => {
    const result = computeLeadScore({ daysSinceLastActivity: 1, hasOpenNextAction: true, stage: "negociacao" });
    expect(result.score).toEqual(80);
    expect(result.stagnationRisk).toEqual("baixo");
  });

  it("pontua baixo um negócio sem próxima ação, parado e na etapa inicial", () => {
    const result = computeLeadScore({ daysSinceLastActivity: 20, hasOpenNextAction: false, stage: "novo" });
    expect(result.score).toEqual(0);
    expect(result.stagnationRisk).toEqual("alto");
  });

  it("nunca usa o valor do negócio como fator — mesmo tamanho de negócio, mesma pontuação", () => {
    const smallDeal = computeLeadScore({ daysSinceLastActivity: 3, hasOpenNextAction: true, stage: "em_contato" });
    const bigDeal = computeLeadScore({ daysSinceLastActivity: 3, hasOpenNextAction: true, stage: "em_contato" });
    expect(smallDeal.score).toEqual(bigDeal.score);
  });

  it("sempre marca confiança 'baixa' (fallback por regra, não modelo calibrado)", () => {
    expect(computeLeadScore({ daysSinceLastActivity: 1, hasOpenNextAction: true, stage: "negociacao" }).confidence).toEqual("baixa");
  });

  it("classifica risco de estagnação em três faixas (baixo/médio/alto)", () => {
    expect(computeLeadScore({ daysSinceLastActivity: 4, hasOpenNextAction: true, stage: "novo" }).stagnationRisk).toEqual("baixo");
    expect(computeLeadScore({ daysSinceLastActivity: 7, hasOpenNextAction: true, stage: "novo" }).stagnationRisk).toEqual("médio");
    expect(computeLeadScore({ daysSinceLastActivity: 11, hasOpenNextAction: true, stage: "novo" }).stagnationRisk).toEqual("alto");
  });

  it("cada fator vem com um motivo em texto", () => {
    const result = computeLeadScore({ daysSinceLastActivity: 1, hasOpenNextAction: true, stage: "negociacao" });
    expect(result.factors.every((f) => f.reason.length > 0)).toBe(true);
  });
});
