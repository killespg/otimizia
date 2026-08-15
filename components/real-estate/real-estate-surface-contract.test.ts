import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

const files = [
  "components/real-estate/real-estate-ui.tsx",
  "components/real-estate/PropertyFilterChat.tsx",
  "app/(dashboard)/painel/imoveis/page.tsx",
  "app/(dashboard)/painel/imoveis/[id]/page.tsx",
  "app/(dashboard)/painel/imoveis/[id]/ListingQualitySection.tsx",
  "app/(dashboard)/painel/imoveis/match/[dealId]/page.tsx",
  "app/(dashboard)/painel/imoveis/visitas/page.tsx",
  "app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx",
];

describe("real-estate surface contract", () => {
  it("uses the shared radius hierarchy instead of flat or unresolved aliases", () => {
    const css = read("app/globals.css");
    const source = files.map(read).join("\n");
    const ui = read("components/real-estate/real-estate-ui.tsx");

    const panelOverride = css.match(/\.workspace-real_estate_broker \.real-estate-area \.panel \{[^}]*/)?.[0] ?? "";
    expect(panelOverride).toContain("var(--radius-panel)");
    expect(panelOverride).not.toContain("var(--radius-md)");
    expect(source).not.toContain("real-estate-flat-section");
    expect(source).not.toMatch(/rounded-(?:control|inner|panel)(?=[" ])/);
    expect(source).not.toMatch(/className="field h-(?:8|9|10)(?=[" ])/);
    expect(ui).toContain("<PageHeader");
  });
});
