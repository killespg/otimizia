import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

const painelPages = [
  "app/(dashboard)/painel/page.tsx",
  "app/(dashboard)/painel/assistente/page.tsx",
  "app/(dashboard)/painel/calendario/page.tsx",
  "app/(dashboard)/painel/configuracoes/page.tsx",
  "app/(dashboard)/painel/contatos/page.tsx",
  "app/(dashboard)/painel/contatos/[id]/page.tsx",
  "app/(dashboard)/painel/contatos/importar/page.tsx",
  "app/(dashboard)/painel/equipe/page.tsx",
  "app/(dashboard)/painel/equipe/[userId]/page.tsx",
  "app/(dashboard)/painel/financeiro/page.tsx",
  "app/(dashboard)/painel/financeiro/importar/page.tsx",
  "app/(dashboard)/painel/funil/page.tsx",
  "app/(dashboard)/painel/funil/relatorio/page.tsx",
  "app/(dashboard)/painel/vendas/page.tsx",
  "app/(dashboard)/painel/produtos/page.tsx",
  "app/(dashboard)/painel/pedidos/page.tsx",
  "app/(dashboard)/painel/colecoes/page.tsx",
  "app/(dashboard)/painel/pos-venda/page.tsx",
  "app/(dashboard)/painel/imoveis/page.tsx",
  "app/(dashboard)/painel/imoveis/[id]/page.tsx",
  "app/(dashboard)/painel/imoveis/dashboard/page.tsx",
  "app/(dashboard)/painel/imoveis/novo/page.tsx",
  "app/(dashboard)/painel/imoveis/mapa/page.tsx",
  "app/(dashboard)/painel/imoveis/visitas/page.tsx",
  "app/(dashboard)/painel/imoveis/colecoes/page.tsx",
  "app/(dashboard)/painel/imoveis/colecoes/nova/page.tsx",
  "app/(dashboard)/painel/imoveis/comissoes/page.tsx",
  "app/(dashboard)/painel/imoveis/match/[dealId]/page.tsx",
  "app/(dashboard)/painel/imoveis/propostas/[offerId]/pdf/page.tsx",
  "app/(dashboard)/painel/juridico/page.tsx",
  "app/(dashboard)/painel/juridico/processos/page.tsx",
  "app/(dashboard)/painel/juridico/processos/[id]/page.tsx",
  "app/(dashboard)/painel/juridico/consulta/page.tsx",
  "app/(dashboard)/painel/juridico/prazos/page.tsx",
  "app/(dashboard)/painel/juridico/prazos/calendario/page.tsx",
  "app/(dashboard)/painel/juridico/prazos/calculadora/page.tsx",
  "app/(dashboard)/painel/juridico/documentos/page.tsx",
  "app/(dashboard)/painel/metricas/page.tsx",
  "app/(dashboard)/painel/tarefas/page.tsx",
  "app/(dashboard)/painel/whatsapp/page.tsx",
  "app/(dashboard)/painel/workspaces/page.tsx",
  "app/(dashboard)/painel/workspaces/[workspace]/page.tsx",
] as const;

describe("frontend route parity", () => {
  it.each(painelPages)("keeps %s in the persistent dashboard", (page) => {
    expect(existsSync(resolve(process.cwd(), page))).toBe(true);
  });

  it.each(painelPages)("implements %s without a legacy page re-export", (page) => {
    expect(read(page)).not.toMatch(/^export \{ default \} from/m);
  });

  it("keeps the removed app route group free of source files", () => {
    const oldRoot = resolve(process.cwd(), "app/(app)");
    const sourceFiles = existsSync(oldRoot)
      ? readdirSync(oldRoot, { recursive: true, withFileTypes: true }).filter(
          (entry) => entry.isFile(),
        )
      : [];

    expect(sourceFiles).toHaveLength(0);
  });

  it("uses one configured product shell without decorative canvas layers", () => {
    const layout = read("app/(dashboard)/painel/layout.tsx");

    expect(layout).toContain("<ProductShell");
    expect(layout).toContain("buildProductNavigation");
    expect(layout).toContain('preset.key === "autonomous_seller"');
    expect(layout).toContain('preset.key === "real_estate_broker"');
    expect(layout).toContain("canViewLegal(");
    expect(layout).toContain("canViewRealEstate(");
    expect(layout).toContain("countDataUnavailable");
    expect(layout).not.toMatch(
      /AmbientParticles|NeuralBackground|SellerDashboardBackground/,
    );
    for (const legacyShell of [
      "<ProductNavigation",
      "<ProductTopbar",
      "<LegalProductNavigation",
      "<LegalProductTopbar",
      "<SellerProductNavigation",
      "<SellerProductTopbar",
      "<RealEstateProductNavigation",
      "<RealEstateProductTopbar",
    ]) {
      expect(layout).not.toContain(legacyShell);
    }
  });

  it("keeps the seller dashboard connected to real CRM actions", () => {
    const dashboard = read(
      "app/(dashboard)/painel/_dashboard/SellerDashboard.tsx",
    );

    for (const contract of [
      "action={createTask}",
      "action={claimTask}",
      "action={claimDeal}",
      "DashboardCustomizePanel",
      "DashboardWidgetGrid",
      "RevenueLineChart",
      "SellerAssistantPreview",
      "data-commercial-insights",
      "Taxa de conversão",
      "Ciclo de vendas",
      "Origem dos leads",
      "LTV observado",
      "Principal motivo de perda",
    ]) {
      expect(dashboard).toContain(contract);
    }
    expect(dashboard).not.toContain('from "@/components/tim/AgentPanel"');
  });

  it("preserves vertical destinations in the serializable navigation contract", () => {
    const navigation = read("lib/design-system/navigation.ts");
    for (const route of [
      "/painel/contatos",
      "/painel/funil",
      "/painel/vendas",
      "/painel/tarefas",
      "/painel/whatsapp",
      "/painel/produtos",
      "/painel/pedidos",
      "/painel/juridico/processos",
      "/painel/juridico/prazos",
      "/painel/juridico/consulta",
      "/painel/imoveis/dashboard",
      "/painel/imoveis/mapa",
      "/painel/imoveis/visitas",
      "/painel/imoveis/colecoes",
      "/painel/imoveis/comissoes",
      "/painel/configuracoes",
    ]) {
      expect(navigation).toContain(`"${route}"`);
    }
  });

  it("keeps real-estate entry and area authorization", () => {
    const entry = read("app/(dashboard)/painel/page.tsx");
    const areaLayout = read("app/(dashboard)/painel/imoveis/layout.tsx");

    expect(entry).toContain('workspaceKey === "real_estate_broker"');
    expect(entry).toContain("canViewRealEstate(membership?.job_role, isOrgAdmin)");
    expect(entry).toContain('"/painel/imoveis/dashboard"');
    expect(areaLayout).toContain('workspaceKey !== "real_estate_broker"');
    expect(areaLayout).toContain("canViewRealEstate(");
  });

  it("uses the approved 2026 identity across UI and install surfaces", async () => {
    const logo = read("components/design-system/logo.tsx");
    const manifest = read("app/manifest.ts");
    const rootLayout = read("app/layout.tsx");
    const serviceWorker = read("public/sw.js");

    expect(logo).toContain("const WORDMARK_RATIO = 1280 / 277");
    expect(logo).toContain('src="/otimizia-logo-2026-dark.png"');
    expect(logo).toContain('src="/otimizia-mark-2026-dark.png"');
    expect(logo).not.toMatch(/className=\{[^}]*mix-blend-screen/);
    expect(manifest).toContain('src: "/otimizia-app-icon-2026.png"');
    expect(manifest).toContain('src: "/otimizia-app-icon-2026-maskable.png"');
    expect(rootLayout).toContain('icon: "/otimizia-mark-2026.png?v=20260815-transparent"');
    expect(rootLayout).toContain('shortcut: "/otimizia-mark-2026.png?v=20260815-transparent"');
    expect(serviceWorker).toContain('icon: "/otimizia-app-icon-2026.png"');

    const expectedDimensions = new Map<string, [number, number]>([
      ["public/otimizia-logo-2026-dark.png", [1280, 277]],
      ["public/otimizia-logo-2026.png", [1280, 277]],
      ["public/otimizia-mark-2026-dark.png", [512, 512]],
      ["public/otimizia-mark-2026.png", [512, 512]],
      ["public/otimizia-app-icon-2026.png", [512, 512]],
      ["public/otimizia-app-icon-2026-maskable.png", [512, 512]],
    ]);
    for (const [asset, dimensions] of expectedDimensions) {
      const file = readFileSync(resolve(process.cwd(), asset));
      expect(file.subarray(1, 4).toString("ascii"), asset).toBe("PNG");
      expect([file.readUInt32BE(16), file.readUInt32BE(20)], asset).toEqual(
        dimensions,
      );
    }

    const favicon = await sharp(resolve(process.cwd(), "public/otimizia-mark-2026.png")).stats();
    expect(favicon.channels[3]?.min).toBe(0);
    expect(favicon.channels[3]?.max).toBe(255);
  });
});
