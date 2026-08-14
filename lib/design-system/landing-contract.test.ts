import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("landing accessibility and visual contract", () => {
  it("keeps the hero typographic and free of decorative animation", () => {
    const page = read("app/page.tsx");
    const hero = read("components/landing/hero.tsx");

    expect(page).not.toMatch(/radial-gradient|<Glow/);
    expect(hero).not.toMatch(/AnimatedShapesBackground|radial-gradient/);
  });

  it("uses native details so FAQ answers exist without JavaScript", () => {
    const faq = read("components/landing/FaqAccordion.tsx");

    expect(faq).toContain("<details");
    expect(faq).toContain("<summary");
    expect(faq).not.toMatch(/AnimatePresence|useState/);
  });

  it("implements a complete keyboard tab contract", () => {
    const tabs = read("components/landing/feature-tabs.tsx");

    expect(tabs).toContain('role="tabpanel"');
    expect(tabs).toContain("aria-controls");
    expect(tabs).toContain("ArrowRight");
    expect(tabs).toContain("ArrowLeft");
  });
});
