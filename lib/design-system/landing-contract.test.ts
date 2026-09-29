import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("landing accessibility and visual contract", () => {
  it("keeps the landing identity scoped and independent from the product tokens", () => {
    const css = read("app/landing.css");

    expect(css).toContain(".oz {");
    expect(css).not.toMatch(/var\(--od-/);
    // Sem seletor global solto: toda regra da landing nasce de .oz, .oz-* ou html:has(.oz).
    const stray = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => /^[.#a-z@]/i.test(line) && line.includes("{"))
      .filter((line) => !/^(\.oz|html:has\(\.oz\)|@media|@keyframes|\.oz-)/.test(line));
    expect(stray).toEqual([]);
  });

  it("respects reduced motion and keeps content visible without JavaScript", () => {
    const css = read("app/landing.css");
    const effects = read("components/landing/effects.tsx");

    expect(css).toContain("prefers-reduced-motion: reduce");
    // Só o que está abaixo da dobra é escondido, e só depois da hidratação.
    expect(effects).toContain("oz-will");
    expect(effects).toContain("prefers-reduced-motion: reduce");
  });

  it("uses native details so FAQ answers exist without JavaScript", () => {
    const faq = read("components/landing/faq.tsx");

    expect(faq).toContain("<details");
    expect(faq).toContain("<summary");
    expect(faq).not.toMatch(/AnimatePresence|useState/);
  });

  it("implements a complete keyboard tab contract", () => {
    const tabs = read("components/landing/professions.tsx");

    expect(tabs).toContain('role="tabpanel"');
    expect(tabs).toContain("aria-controls");
    expect(tabs).toContain("ArrowRight");
    expect(tabs).toContain("ArrowLeft");
  });
});
