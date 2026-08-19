import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(dashboard)/painel/equipe/actions", () => ({
  updateMyTaskVisibility: vi.fn(),
}));

vi.mock("@/components/ui/PendingButton", () => ({
  PendingButton: ({ children }: { children: string }) => createElement("button", { type: "submit" }, children),
}));

import { TaskVisibilityForm } from "./task-visibility-form";

describe("TaskVisibilityForm", () => {
  it("locks the radios and shows that the organization chose the option", () => {
    const html = renderToStaticMarkup(
      createElement(TaskVisibilityForm, { currentMode: "mixed", locked: true }),
    );

    expect(html).toContain("Escolhida pela organização");
    expect(html).toContain("Essa opção foi escolhida pela organização");
    expect(html).toContain("disabled");
    expect(html).not.toContain("Salvar");
  });

  it("lets the member pick among the three modes when the organization did not lock the policy", () => {
    const html = renderToStaticMarkup(
      createElement(TaskVisibilityForm, { currentMode: "profile", locked: false }),
    );

    expect(html).toContain("Consultar no perfil");
    expect(html).toContain("Misturar na agenda");
    expect(html).toContain("Privado");
    expect(html).toContain("Salvar");
    expect(html).not.toContain("Escolhida pela organização");
  });
});
