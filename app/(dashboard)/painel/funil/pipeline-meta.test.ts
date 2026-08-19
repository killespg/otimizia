import { describe, expect, it } from "vitest";
import { pipelineMetaFromList } from "./pipeline-meta";

describe("pipelineMetaFromList", () => {
  it.each([
    ["Contratado", "bg-success-500", "Nenhum card fechado."],
    ["Não contratado", "bg-danger-500", "Sem cards perdidos."],
  ])("selects the legal column metadata for %s", (listName, dot, empty) => {
    expect(pipelineMetaFromList(listName)).toMatchObject({ dot, empty });
  });
});
