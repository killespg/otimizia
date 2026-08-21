import { describe, expect, it } from "vitest";
import { isLostPipelineList, stageFromPipelineList } from "./pipeline-stage";

describe("stageFromPipelineList", () => {
  it.each([
    ["Novo lead", "novo"],
    ["Triagem Inicial", "novo"],
    ["Qualificação", "em_contato"],
    ["Documentação Pendente", "em_contato"],
    ["Análise de Viabilidade", "em_contato"],
    ["Proposta enviada", "negociacao"],
    ["Proposta / Honorários", "negociacao"],
    ["Contratado", "ganho"],
    ["Convertido (Processo Ativo)", "ganho"],
    ["Não contratado", "perdido"],
    ["NEGÓCIO PERDIDO", "perdido"],
  ] as const)("maps %s to %s", (label, stage) => {
    expect(stageFromPipelineList(label)).toBe(stage);
  });

  it("checks loss with the same parser used by server and client", () => {
    expect(isLostPipelineList("Não contratado")).toBe(true);
    expect(isLostPipelineList("Contratado")).toBe(false);
  });
});
