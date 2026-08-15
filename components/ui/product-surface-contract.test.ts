import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageZone } from "./surface";

describe("product surface contract", () => {
  it("groups related page content without creating another card", () => {
    const html = renderToStaticMarkup(
      createElement(PageZone, { "aria-label": "Operação" }, "Conteúdo"),
    );

    expect(html).toContain('data-ui="page-zone"');
    expect(html).toContain('class="ui-page__zone"');
    expect(html).not.toContain("ui-surface");
    expect(html).not.toContain("border");
  });
});
