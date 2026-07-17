import { describe, expect, it } from "vitest";
import { combineWithBehavior, computeBehaviorAdjustment } from "@/lib/real-estate-match-v2";

describe("computeBehaviorAdjustment", () => {
  it("dá bônus quando o cliente já demonstrou interesse em imóvel do mesmo tipo", () => {
    const adjustment = computeBehaviorAdjustment(
      [{ status: "interested", propertyType: "apartamento", neighborhood: null }],
      { propertyType: "apartamento", neighborhood: null }
    );
    expect(adjustment.points).toBeGreaterThan(0);
    expect(adjustment.reason).toContain("interesse anterior");
  });

  it("dá penalidade quando o cliente já rejeitou imóvel do mesmo bairro", () => {
    const adjustment = computeBehaviorAdjustment(
      [{ status: "rejected", propertyType: "casa", neighborhood: "Centro" }],
      { propertyType: "apartamento", neighborhood: "Centro" }
    );
    expect(adjustment.points).toBeLessThan(0);
    expect(adjustment.reason).toContain("rejeitou");
  });

  it("não ajusta nada sem histórico relevante", () => {
    const adjustment = computeBehaviorAdjustment([], { propertyType: "apartamento", neighborhood: "Centro" });
    expect(adjustment.points).toEqual(0);
    expect(adjustment.reason).toContain("Sem histórico");
  });

  it("limita o ajuste a ±10 mesmo com muito histórico", () => {
    const history = Array.from({ length: 10 }, () => ({
      status: "won" as const,
      propertyType: "apartamento" as const,
      neighborhood: "Centro",
    }));
    const adjustment = computeBehaviorAdjustment(history, { propertyType: "apartamento", neighborhood: "Centro" });
    expect(adjustment.points).toEqual(10);
  });

  it("ignora status neutros (suggested/selected/sent/viewed) — não é sinal positivo nem negativo", () => {
    const adjustment = computeBehaviorAdjustment(
      [{ status: "viewed", propertyType: "apartamento", neighborhood: null }],
      { propertyType: "apartamento", neighborhood: null }
    );
    expect(adjustment.points).toEqual(0);
  });
});

describe("combineWithBehavior", () => {
  it("soma o ajuste ao score base e adiciona o critério 'behavior' na explicação", () => {
    const result = combineWithBehavior(
      { score: 80, explanation: { price: { points: 25, max: 25, reason: "Dentro do orçamento." } } },
      [{ status: "interested", propertyType: "apartamento", neighborhood: null }],
      { propertyType: "apartamento", neighborhood: null }
    );
    expect(result.baseScore).toEqual(80);
    expect(result.score).toEqual(83);
    expect(result.explanation.behavior).toBeDefined();
    expect(result.explanation.price).toBeDefined();
  });

  it("nunca deixa o score final passar de 100 nem ficar negativo", () => {
    const high = combineWithBehavior(
      { score: 98, explanation: {} },
      Array.from({ length: 5 }, () => ({ status: "won" as const, propertyType: "apartamento" as const, neighborhood: null })),
      { propertyType: "apartamento", neighborhood: null }
    );
    expect(high.score).toEqual(100);

    const low = combineWithBehavior(
      { score: 5, explanation: {} },
      Array.from({ length: 5 }, () => ({ status: "rejected" as const, propertyType: "apartamento" as const, neighborhood: null })),
      { propertyType: "apartamento", neighborhood: null }
    );
    expect(low.score).toEqual(0);
  });
});
