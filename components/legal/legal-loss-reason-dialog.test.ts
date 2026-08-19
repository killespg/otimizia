import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LegalLossReasonDialog } from "./legal-loss-reason-dialog";

describe("LegalLossReasonDialog", () => {
  it("requires one of the six structured reasons without preselecting one", () => {
    const html = renderToStaticMarkup(createElement(LegalLossReasonDialog, {
      dealTitle: "Inventário de Ana",
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    }));

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="legal-loss-title"');
    expect(html).toContain("Inventário de Ana");
    for (const label of [
      "Preço",
      "Contratou concorrente",
      "Falta de retorno",
      "Momento inadequado",
      "Perfil incompatível",
      "Outro",
    ]) {
      expect(html).toContain(label);
    }
    expect(html.match(/type="radio"/g)).toHaveLength(6);
    expect(html).not.toContain("checked");
    expect(html).toContain('maxLength="500"');
    expect(html).toContain("Cancelar");
    expect(html).toContain("Confirmar perda");
  });
});
