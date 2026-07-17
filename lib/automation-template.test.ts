import { describe, expect, it } from "vitest";
import { matchesEventRuleScope, renderTemplate } from "@/lib/automation-template";

describe("renderTemplate", () => {
  it("substitui variável de caminho simples", () => {
    expect(renderTemplate("Olá {{name}}", { name: "Ana" })).toEqual("Olá Ana");
  });

  it("substitui variável de caminho aninhado", () => {
    expect(renderTemplate("Retomar contato — {{deal.title}}", { deal: { title: "Apê Zona Sul" } })).toEqual(
      "Retomar contato — Apê Zona Sul"
    );
  });

  it("substitui por string vazia quando o caminho não existe", () => {
    expect(renderTemplate("Olá {{deal.missing}}", { deal: { title: "x" } })).toEqual("Olá ");
  });

  it("substitui múltiplas ocorrências", () => {
    expect(renderTemplate("{{a}} e {{a}}", { a: "x" })).toEqual("x e x");
  });
});

describe("matchesEventRuleScope", () => {
  it("casa quando pipeline e etapa são coringa (null)", () => {
    expect(matchesEventRuleScope({ pipelineId: null, stageKey: null }, { pipelineId: "p1", stage: "ganho" })).toBe(true);
  });

  it("não casa quando o pipeline é diferente", () => {
    expect(matchesEventRuleScope({ pipelineId: "p1", stageKey: null }, { pipelineId: "p2", stage: "ganho" })).toBe(false);
  });

  it("não casa quando a etapa de destino é diferente", () => {
    expect(matchesEventRuleScope({ pipelineId: null, stageKey: "ganho" }, { pipelineId: "p1", stage: "perdido" })).toBe(false);
  });

  it("casa quando pipeline e etapa batem exatamente", () => {
    expect(matchesEventRuleScope({ pipelineId: "p1", stageKey: "ganho" }, { pipelineId: "p1", stage: "ganho" })).toBe(true);
  });
});
