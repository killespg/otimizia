import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

const sellerFiles = [
  "components/seller/seller-ui.tsx",
  "components/seller/SellerOperationSettingsForm.tsx",
  "components/seller/SellerSaleConfirmation.tsx",
  "app/(dashboard)/painel/produtos/page.tsx",
  "app/(dashboard)/painel/produtos/[id]/page.tsx",
  "app/(dashboard)/painel/colecoes/page.tsx",
  "app/(dashboard)/painel/pedidos/page.tsx",
  "app/(dashboard)/painel/pedidos/[id]/page.tsx",
  "app/(dashboard)/painel/pos-venda/page.tsx",
  "app/(dashboard)/painel/operacao/configuracoes/page.tsx",
];

describe("seller surface contract", () => {
  it("uses the shared panel, inner-group and control radii throughout seller tabs", () => {
    const source = sellerFiles.map(read).join("\n");
    const sellerUi = read("components/seller/seller-ui.tsx");

    expect(sellerUi).toContain("ui-metric-band");
    expect(sellerUi).toContain("rounded-[var(--radius-panel)]");
    expect(sellerUi).toContain("rounded-[var(--radius-inner)]");
    expect(sellerUi).toContain("rounded-[var(--radius-control)]");
    expect(source).not.toMatch(/className="(?:overflow-hidden )?border border-white\/\[0\.09\] bg-\[#1e1d22\]\/9[02](?: |")/);
    expect(source).not.toMatch(/className="(?:scroll-mt-24 )?border border-od-accent\/20 bg-\[#1e1d22\]\/90(?: |")/);
    expect(source).not.toMatch(/(?:min-h|\bh)-(?:9|10)(?=[" ])/);
  });
});
