import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync } from "node:fs";
import { extname, resolve } from "node:path";
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

  it("does not use unresolved semantic radius aliases", () => {
    const files = ["app", "components"].flatMap((root) => sourceFiles(resolve(process.cwd(), root)));
    const unresolvedRadius = new RegExp(`rounded-(${["control", "inner", "panel"].join("|")})(?=[\\s\"'])`);
    const offenders = files.filter((file) => unresolvedRadius.test(readFileSync(file, "utf8")));

    expect(offenders).toEqual([]);
  });
});

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (entry.name.endsWith(".test.ts") || ![".ts", ".tsx"].includes(extname(entry.name))) return [];
    return [path];
  });
}
