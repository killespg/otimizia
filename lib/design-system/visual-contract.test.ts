import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

describe("neutral-cobalt visual contract", () => {
  it("publishes the approved semantic palette and geometry", () => {
    const css = read("app/globals.css").toLowerCase();

    for (const value of [
      "#0b0d11",
      "#11151a",
      "#15191f",
      "#1b2027",
      "#2f6fcc",
      "#7da7e0",
      "#18283e",
    ]) {
      expect(css).toContain(value);
    }
    expect(css).toContain("--radius-control: 9px");
    expect(css).toContain("--radius-inner: 11px");
    expect(css).toContain("--radius-panel: 15px");
  });

  it("removes decorative canvas layers from active shells", () => {
    const layout = read("app/(dashboard)/painel/layout.tsx");
    const auth = read("app/(auth)/AuthShell.tsx");

    expect(layout).not.toMatch(
      /AmbientParticles|NeuralBackground|SellerDashboardBackground/,
    );
    expect(auth).not.toMatch(
      /AmbientParticles|AnimatedShapesBackground/,
    );
  });

  it("keeps the future-mobile boundary semantic instead of DOM-specific", () => {
    const spec = read(
      "docs/superpowers/specs/2026-08-13-neutral-cobalt-frontend-design.md",
    );

    expect(spec).toContain("Platform-neutral TypeScript exports");
    expect(spec).toContain("React DOM components are web-specific");
    expect(spec).toContain("native mobile client");
  });
});
