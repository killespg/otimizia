import { describe, expect, it } from "vitest";
import { isLostPipelineList, stageFromPipelineList } from "./pipeline-stage";

describe("stageFromPipelineList", () => {
  it.each([
    ["Novo lead", "novo"],
    ["Qualificação", "em_contato"],
    ["Proposta enviada", "negociacao"],
    ["Contratado", "ganho"],
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
