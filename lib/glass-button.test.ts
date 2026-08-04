import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlassButton, GlassButtonLink } from "@/components/ui/glass-button";

describe("GlassButton", () => {
  it("preserva a semântica de ação e navegação", () => {
    const button = renderToStaticMarkup(
      createElement(GlassButton, { appearance: "nav", size: "default" }, "Salvar"),
    );
    const link = renderToStaticMarkup(
      createElement(
        GlassButtonLink,
        { href: "/painel", appearance: "nav", active: true },
        "Visão geral",
      ),
    );

    expect(button).toContain("<button");
    expect(button).toContain('data-glass-button="true"');
    expect(button).toContain("glass-button-text");
    expect(link).toContain("<a");
    expect(link).toContain('aria-current="page"');
    expect(link).toContain('href="/painel"');
    expect(link).not.toContain("<button");
  });

  it("mantém tamanho de ícone e classes de conteúdo", () => {
    const html = renderToStaticMarkup(
      createElement(
        GlassButton,
        { size: "icon", contentClassName: "custom-content", "aria-label": "Ação" },
        "+",
      ),
    );

    expect(html).toContain("h-10 w-10");
    expect(html).toContain("custom-content");
    expect(html).toContain('aria-label="Ação"');
  });
});
