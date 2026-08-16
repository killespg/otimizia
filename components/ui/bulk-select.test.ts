import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BulkActionBar } from "./BulkSelect";

const baseProps = {
  allSelected: false,
  isPending: false,
  error: null,
  onToggleAll: vi.fn(),
  onDelete: vi.fn(),
  nounSingular: "caso",
  nounPlural: "casos",
};

describe("BulkActionBar", () => {
  it("não ocupa espaço enquanto nada estiver selecionado", () => {
    const html = renderToStaticMarkup(createElement(BulkActionBar, { ...baseProps, selectedCount: 0 }));
    expect(html).toBe("");
  });

  it("aparece com a contagem e o excluir atrás de confirmação", () => {
    const html = renderToStaticMarkup(createElement(BulkActionBar, { ...baseProps, selectedCount: 3 }));
    expect(html).toContain("3 casos");
    expect(html).toContain("Excluir");
    // O primeiro estado nunca oferece a exclusão direta: ela só surge depois do
    // clique que troca o botão pela confirmação com a contagem.
    expect(html).not.toContain("definitivamente");
  });

  it("concorda o substantivo no singular", () => {
    const html = renderToStaticMarkup(createElement(BulkActionBar, { ...baseProps, selectedCount: 1 }));
    expect(html).toContain("1 caso");
    expect(html).not.toContain("1 casos");
  });
});
