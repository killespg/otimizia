import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const painelPages = [
  "app/(dashboard)/painel/page.tsx",
  "app/(dashboard)/painel/assistente/page.tsx",
  "app/(dashboard)/painel/calendario/page.tsx",
  "app/(dashboard)/painel/configuracoes/page.tsx",
  "app/(dashboard)/painel/contatos/page.tsx",
  "app/(dashboard)/painel/contatos/[id]/page.tsx",
  "app/(dashboard)/painel/contatos/importar/page.tsx",
  "app/(dashboard)/painel/equipe/page.tsx",
  "app/(dashboard)/painel/financeiro/page.tsx",
  "app/(dashboard)/painel/financeiro/importar/page.tsx",
  "app/(dashboard)/painel/funil/page.tsx",
  "app/(dashboard)/painel/funil/relatorio/page.tsx",
  "app/(dashboard)/painel/imoveis/page.tsx",
  "app/(dashboard)/painel/imoveis/[id]/page.tsx",
  "app/(dashboard)/painel/imoveis/dashboard/page.tsx",
  "app/(dashboard)/painel/imoveis/novo/page.tsx",
  "app/(dashboard)/painel/imoveis/mapa/page.tsx",
  "app/(dashboard)/painel/imoveis/visitas/page.tsx",
  "app/(dashboard)/painel/imoveis/colecoes/page.tsx",
  "app/(dashboard)/painel/imoveis/colecoes/nova/page.tsx",
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
    const source = readFileSync(resolve(process.cwd(), page), "utf8");
    expect(source).not.toMatch(/^export \{ default \} from/m);
  });

  it("keeps the removed app route group free of source files", () => {
    const oldRoot = resolve(process.cwd(), "app/(app)");
    const sourceFiles = existsSync(oldRoot)
      ? readdirSync(oldRoot, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
      : [];

    expect(sourceFiles).toHaveLength(0);
  });

  it("keeps every autonomous seller area inside the persistent dashboard", () => {
    const navigation = readFileSync(
      resolve(process.cwd(), "components/design-system/seller-product-navigation.tsx"),
      "utf8",
    );
    const sharedNavigation = readFileSync(
      resolve(process.cwd(), "components/design-system/product-nav-groups.tsx"),
      "utf8",
    );
    const routes = [
      "/painel",
      "/painel/contatos",
      "/painel/funil",
      "/painel/tarefas",
      "/painel/whatsapp",
      "/painel/calendario",
      "/painel/assistente",
      "/painel/equipe",
      "/painel/funil/relatorio",
      "/painel/configuracoes",
    ];

    for (const route of routes) expect(navigation).toContain(`"${route}"`);
    expect(navigation).toContain("TwoLevelNav");
    expect(sharedNavigation).toContain('data-product-nav-expanded="true"');
    expect(sharedNavigation).toContain("Redimensionar menu lateral");
    expect(sharedNavigation).toContain('role="separator"');
    expect(sharedNavigation).not.toContain("Ocultar detalhes");
    expect(sharedNavigation).toContain("data-liquid-glass-shell");
    expect(sharedNavigation).toContain("WorkspaceSwitcher");
    const topbar = readFileSync(
      resolve(process.cwd(), "components/design-system/seller-product-topbar.tsx"),
      "utf8",
    );
    expect(topbar).toContain("max-w-[340px]");
    expect(navigation).toContain('label: "Meu negócio"');
  });

  it("keeps the autonomous seller dashboard connected to real CRM actions", () => {
    const dashboard = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/_dashboard/SellerDashboard.tsx"),
      "utf8",
    );

    expect(dashboard).toContain("action={createTask}");
    expect(dashboard).toContain("action={claimTask}");
    expect(dashboard).toContain("action={claimDeal}");
    expect(dashboard).toContain("DashboardCustomizePanel");
    expect(dashboard).toContain("DashboardWidgetGrid");
    expect(dashboard).toContain("panel");
    expect(dashboard).toContain('layout="balanced"');
    expect(dashboard).toContain("sellerWidgetShellClass");
    expect(dashboard).toContain("data-dashboard-card");
    expect(dashboard).toContain("grid-cols-2 overflow-hidden");
    expect(dashboard).toContain("RevenueLineChart");
    expect(dashboard).toContain("hasRevenueData");
    expect(dashboard).toContain("Sua agenda está livre.");
    expect(dashboard).toContain("SellerAssistantPreview");
    expect(dashboard).toContain("metric.compare");
    expect(dashboard).toContain("data-commercial-insights");
    expect(dashboard).toContain("Taxa de conversão");
    expect(dashboard).toContain("Ciclo de vendas");
    expect(dashboard).toContain("Origem dos leads");
    expect(dashboard).toContain("LTV observado");
    expect(dashboard).toContain("Principal motivo de perda");
    expect(dashboard).not.toContain('from "@/components/tim/AgentPanel"');
  });

  it("keeps the same animated background behind seller and real-estate dashboards", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/layout.tsx"),
      "utf8",
    );
    const dashboardBackground = readFileSync(
      resolve(process.cwd(), "components/design-system/seller-dashboard-background.tsx"),
      "utf8",
    );
    const shaderBackground = readFileSync(
      resolve(process.cwd(), "components/design-system/shader-background.tsx"),
      "utf8",
    );
    const neuralBackground = readFileSync(
      resolve(process.cwd(), "components/design-system/neural-background.tsx"),
      "utf8",
    );

    expect(layout).toContain('data-dashboard-particles="legal"');
    expect(layout).toContain("enabled={dashboardPreferences.showAnimatedBackground}");
    expect(layout).toContain("particleCount={260}");
    expect(layout).toContain("speed={0.5}");
    expect(layout).toContain("<NeuralBackground");
    expect(dashboardBackground).toContain('pathname !== "/painel/imoveis/dashboard"');
    expect(dashboardBackground).toContain("<ShaderBackground />");
    expect(dashboardBackground).toContain("dashboard-background-visibility");
    expect(dashboardBackground).toContain("!isVisible");
    expect(shaderBackground).toContain('data-dashboard-shader="plasma-wires"');
    expect(shaderBackground).toContain('canvas.getContext("webgl")');
    expect(shaderBackground).toContain('z-[1]');
    // O fundo do dashboard é contido de propósito: o banho de cor fica perto
    // do canvas #151419 e o acento roxo continua sendo a única voz alta da
    // tela. Se estes valores subirem, o fundo volta a competir com o CTA.
    expect(shaderBackground).toContain("opacity-30");
    expect(shaderBackground).toContain("window.requestAnimationFrame(render)");
    expect(shaderBackground).not.toContain("frameInterval");
    expect(shaderBackground).toContain("const float overallSpeed = 0.15");
    expect(shaderBackground).toContain("const vec4 lineColor = vec4(0.26, 0.14, 0.5, 1.0)");
    expect(shaderBackground).toContain("vec4 bgColor1 = vec4(0.055, 0.05, 0.08, 1.0)");
    expect(shaderBackground).toContain("vec4 bgColor2 = vec4(0.1, 0.055, 0.15, 1.0)");
    expect(shaderBackground).toContain("fragColor *= verticalFade");
    expect(shaderBackground).toContain("startCanvasFallback(canvas)");
    expect(shaderBackground).toContain('canvas.dataset.shaderStatus = "canvas-fallback-running"');
    expect(dashboardBackground).not.toContain("PurpleWireBackground");
    expect(neuralBackground).toContain("window.requestAnimationFrame(animate)");
    expect(neuralBackground).toContain("elapsed / motionReferenceStepMs");
    expect(neuralBackground).toContain("1 - Math.pow(1 - trailOpacity, frameScale)");
    expect(neuralBackground).not.toContain("frameInterval");
  });

  it("uses a continuous seller and real-estate performance surface without changing the generic report", () => {
    const report = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/funil/relatorio/page.tsx"),
      "utf8",
    );

    expect(report).toContain('workspaceKey === "autonomous_seller"');
    expect(report).toContain('workspaceKey === "real_estate_broker"');
    expect(report).toContain('flat={usesFlatSurface}');
    expect(report).toContain('border-y border-white/[0.08]');
    expect(report).toContain('"panel p-4"');
  });

  it("does not leak legal copy or light legacy empty states into the seller workspace", () => {
    const settings = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/configuracoes/page.tsx"),
      "utf8",
    );
    const team = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/equipe/page.tsx"),
      "utf8",
    );
    const tasks = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/tarefas/page.tsx"),
      "utf8",
    );

    expect(settings).toContain('isSeller ? "Vendas / Configurações"');
    expect(settings).toContain('isSeller ? "Configurações do negócio"');
    expect(team).toContain('isSeller ? "Vendas / Meu negócio"');
    expect(tasks).toContain('id="new-task" action={createTask} className="scroll-mt-24 border-y');
    expect(tasks).toContain('isSeller ? "grid border-y');
    expect(tasks).not.toContain('isSeller ? "overflow-hidden rounded-xl');
  });

  it("flattens seller operational surfaces while preserving their generic variants", () => {
    const files = [
      "app/(dashboard)/painel/funil/page.tsx",
      "app/(dashboard)/painel/funil/Board.tsx",
      "app/(dashboard)/painel/tarefas/page.tsx",
      "app/(dashboard)/painel/calendario/page.tsx",
      "app/(dashboard)/painel/equipe/page.tsx",
      "app/(dashboard)/painel/contatos/ContactsExplorer.tsx",
      "app/(dashboard)/painel/whatsapp/ConnectWhatsappPanel.tsx",
    ];

    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).toContain("border-y border-white/[0.08]");
    }

    const board = readFileSync(resolve(process.cwd(), files[1]), "utf8");
    expect(board).toContain("isSeller?: boolean");
    expect(board).toContain("Nenhuma venda nesta etapa.");

    const contacts = readFileSync(resolve(process.cwd(), files[5]), "utf8");
    expect(contacts).toContain("isSeller?: boolean");

    const whatsapp = readFileSync(resolve(process.cwd(), files[6]), "utf8");
    expect(whatsapp).toContain("flat?: boolean");
  });

  it("estrutura o workspace imobiliario por papel, preservando os fallbacks genericos", () => {
    // Este guard nasceu de uma decisao anterior: achatar tudo no imobiliario,
    // exigindo `real-estate-flat-section` em todas as telas. O achatamento foi
    // longe demais — sem nenhuma superficie, os modulos acionaveis ficavam
    // "voando" sobre o canvas.
    //
    // A regra agora e por papel, nao por workspace:
    //   modulo com acao propria dentro (form, lista com botao) -> .panel
    //   cabecalho, filtro, KPI e faixa de consulta -> continua aberto (flat)
    //
    // Por isso as duas classes convivem, e o guard passa a cobrir as duas
    // pontas: quem virou painel nao pode voltar a flutuar, e quem deve seguir
    // aberto nao pode virar card.
    const panelFiles = [
      "app/(dashboard)/painel/imoveis/novo/page.tsx",
      "app/(dashboard)/painel/imoveis/mapa/page.tsx",
      "app/(dashboard)/painel/imoveis/visitas/page.tsx",
      "app/(dashboard)/painel/imoveis/colecoes/page.tsx",
      "app/(dashboard)/painel/imoveis/colecoes/nova/page.tsx",
      "app/(dashboard)/painel/imoveis/[id]/ListingQualitySection.tsx",
      "app/(dashboard)/painel/imoveis/match/[dealId]/OffersSection.tsx",
    ];
    for (const file of panelFiles) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).toContain("panel");
    }

    // Telas que mantem faixas abertas para o conteudo de consulta.
    const flatFiles = [
      "app/(dashboard)/painel/imoveis/page.tsx",
      "app/(dashboard)/painel/imoveis/visitas/page.tsx",
      "app/(dashboard)/painel/imoveis/[id]/page.tsx",
      "app/(dashboard)/painel/imoveis/match/[dealId]/page.tsx",
    ];
    for (const file of flatFiles) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).toContain("real-estate-flat-section");
    }

    const sharedFiles = [
      "app/(dashboard)/painel/contatos/page.tsx",
      "app/(dashboard)/painel/contatos/[id]/page.tsx",
      "app/(dashboard)/painel/equipe/page.tsx",
      "app/(dashboard)/painel/calendario/page.tsx",
      "app/(dashboard)/painel/whatsapp/page.tsx",
      "app/(dashboard)/painel/funil/relatorio/page.tsx",
    ];
    for (const file of sharedFiles) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).toContain("real_estate_broker");
    }

    const styles = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    expect(styles).toContain(".real-estate-flat-section");
    expect(styles).toContain(".workspace-real_estate_broker .settings-hub [data-settings-card]");
    expect(styles).toContain(".workspace-real_estate_broker .assistant-page-shell");
  });

  it("uses the flat pipeline presentation for real estate without enabling seller order behavior", () => {
    const page = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/funil/page.tsx"),
      "utf8",
    );
    const board = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/funil/Board.tsx"),
      "utf8",
    );

    expect(page).toContain('const isRealEstate = workspaceKey === "real_estate_broker"');
    expect(page).toContain("const usesFlatPipeline = isSeller || isRealEstate");
    expect(page).toContain("flat={usesFlatPipeline}");
    expect(page).toContain("isRealEstate={isRealEstate}");
    expect(page).toContain("{usesFlatPipeline ? (");
    expect(board).toContain("flat?: boolean");
    // Regex, e nao toContain com a quebra de linha dentro: o que importa e que
    // `flat` seja o que escolhe a classe da coluna, nao a indentacao com que o
    // Prettier quebrou o ternario. A versao literal casava tambem o `\n`, entao
    // falhava em qualquer checkout Windows com autocrlf e voltava a falhar a
    // cada reformatacao do arquivo. Nao troque de volta.
    expect(board).toMatch(/\(flat\s*\?\s*"flex min-w-/);
    expect(board).toContain('isRealEstate ? "Sem atendimentos"');
    expect(board).toContain('if (isSeller && stageFromList(targetList) === "ganho")');
  });

  it("selects the autonomous seller shell without changing other professions", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/layout.tsx"),
      "utf8",
    );

    expect(layout).toContain('preset.key === "autonomous_seller"');
    expect(layout).toContain("<SellerProductNavigation");
    expect(layout).toContain("<SellerProductTopbar");
    expect(layout).toContain("<LegalProductNavigation");
    expect(layout).toContain("<ProductNavigation");
  });

  it("keeps the real-estate workspace on its dedicated shell without legacy UI classes", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/layout.tsx"),
      "utf8",
    );
    const entry = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/page.tsx"),
      "utf8",
    );
    const navigation = readFileSync(
      resolve(process.cwd(), "components/design-system/real-estate-product-navigation.tsx"),
      "utf8",
    );
    const dashboard = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx"),
      "utf8",
    );
    const dashboardHeader = readFileSync(
      resolve(process.cwd(), "components/real-estate/real-estate-dashboard-header.tsx"),
      "utf8",
    );
    const dashboardPage = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/imoveis/dashboard/page.tsx"),
      "utf8",
    );
    const areaLayout = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/painel/imoveis/layout.tsx"),
      "utf8",
    );

    expect(layout).toContain('preset.key === "real_estate_broker"');
    expect(layout).toContain("<RealEstateProductNavigation");
    expect(layout).toContain("<RealEstateProductTopbar");
    expect(entry).toContain('workspaceKey === "real_estate_broker"');
    expect(entry).toContain("canViewRealEstate(membership?.job_role, isOrgAdmin)");
    expect(entry).toContain('"/painel/imoveis/dashboard"');
    expect(areaLayout).toContain('workspaceKey !== "real_estate_broker"');
    expect(areaLayout).toContain("canViewRealEstate(");
    for (const route of [
      "/painel/imoveis/dashboard",
      "/painel/imoveis",
      "/painel/imoveis/mapa",
      "/painel/imoveis/visitas",
      "/painel/imoveis/colecoes",
      "/painel/imoveis/comissoes",
      "/painel/contatos",
      "/painel/funil",
      "/painel/equipe",
    ]) expect(navigation).toContain(`"${route}"`);

    expect(dashboardHeader).toContain("greeting.salutation");
    expect(dashboardHeader).toContain("Acione o Tim na sua operação");
    expect(dashboardHeader).not.toContain("Pergunte ao Tim");
    expect(dashboard).toContain("Visão geral de imóveis");
    expect(dashboard).toContain("Personalizar painel");
    expect(dashboardHeader).toContain("data-dashboard-primary-actions");
    expect(dashboardHeader).toContain("liquid-glass-control--tinted");
    expect(dashboard).toContain("data-dashboard-filters");
    expect(dashboard).toContain("sm:left-auto sm:right-0");
    expect(dashboard).toContain("updateDashboardBackgroundVisibility");
    expect(dashboard).toContain("Desativar fundo");
    expect(dashboardPage).toContain('.eq("id", user!.id)');
    expect(dashboard).toContain("Indicadores imobiliários");
    expect(dashboard).toContain('href: "/painel/imoveis/comissoes#metas"');
    expect(dashboard).toContain('href: "/painel/imoveis/comissoes"');
    expect(dashboard).toContain('href: "/painel/imoveis/colecoes"');
    expect(dashboard).toContain('href: "/painel/imoveis/visitas"');
    expect(dashboard).toContain("Baixar relatório");
    expect(dashboard).toContain("download className=");
    expect(dashboard).toContain('data-liquid-stage="real-estate"');
    expect(dashboard).toContain("data-liquid-metric-rail");
    expect(dashboard).toContain('data-liquid-metrics-layout="horizontal"');
    expect(dashboard).toContain("data-liquid-indicators");
    expect(dashboard).toContain('data-liquid-indicators-surface="dense"');
    expect(dashboard).toContain("data-liquid-context-tray");
    expect(dashboard).not.toContain("Dashboard imobiliário");

    const migratedUi = [
      "app/(dashboard)/painel/imoveis/page.tsx",
      "app/(dashboard)/painel/imoveis/dashboard/page.tsx",
      "app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx",
      "app/(dashboard)/painel/imoveis/comissoes/page.tsx",
      "app/(dashboard)/painel/imoveis/novo/page.tsx",
      "app/(dashboard)/painel/imoveis/mapa/page.tsx",
      "app/(dashboard)/painel/imoveis/visitas/page.tsx",
      "app/(dashboard)/painel/imoveis/colecoes/page.tsx",
      "app/(dashboard)/painel/imoveis/colecoes/nova/page.tsx",
      "app/(dashboard)/painel/imoveis/[id]/page.tsx",
      "app/(dashboard)/painel/imoveis/[id]/ListingQualitySection.tsx",
      "app/(dashboard)/painel/imoveis/match/[dealId]/page.tsx",
      "app/(dashboard)/painel/imoveis/match/[dealId]/OffersSection.tsx",
      "components/real-estate/PropertyPicker.tsx",
      "components/real-estate/PropertySelectableList.tsx",
    ].map((file) => readFileSync(resolve(process.cwd(), file), "utf8")).join("\n");

    expect(migratedUi).not.toMatch(/\b(?:btn-soft|tag-muted|icon-button)\b/);
  });

  it("uses the approved OtimizIA identity across UI, metadata and install surfaces", () => {
    const expectedAssets = new Map<string, [number, number]>([
      ["public/otimizia-logo-dark.png", [1280, 329]],
      ["public/otimizia-logo.png", [1280, 329]],
      ["public/otimizia-mark-dark.png", [512, 512]],
      ["public/otimizia-mark.png", [512, 512]],
      ["public/otimizia-app-icon.png", [512, 512]],
      ["public/otimizia-app-icon-maskable.png", [512, 512]],
      ["public/otimizia-logo-2026-dark.png", [1280, 329]],
      ["public/otimizia-logo-2026.png", [1280, 329]],
      ["public/otimizia-mark-2026-dark.png", [512, 512]],
      ["public/otimizia-mark-2026.png", [512, 512]],
      ["public/otimizia-app-icon-2026.png", [512, 512]],
      ["public/otimizia-app-icon-2026-maskable.png", [512, 512]],
      ["public/otimizia-logo-approved-dark.png", [1280, 329]],
      ["public/otimizia-mark-approved-dark.png", [512, 512]],
    ]);

    for (const [asset, dimensions] of expectedAssets) {
      const file = readFileSync(resolve(process.cwd(), asset));
      expect(file.subarray(1, 4).toString("ascii"), asset).toBe("PNG");
      expect([file.readUInt32BE(16), file.readUInt32BE(20)], asset).toEqual(dimensions);
    }

    const logo = readFileSync(
      resolve(process.cwd(), "components/design-system/logo.tsx"),
      "utf8",
    );
    const manifest = readFileSync(resolve(process.cwd(), "app/manifest.ts"), "utf8");
    const layout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8");
    const serviceWorker = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");

    expect(logo).toContain("const WORDMARK_RATIO = 1280 / 329");
    // A identidade e a mesma arte: -approved-dark e -2026-dark tem dimensoes
    // identicas (1280x329 e 512x512). A diferenca e tecnica — a -approved-dark
    // e RGB sem canal alfa, e por isso exigia mix-blend-screen para simular
    // recorte, o que so funciona sobre fundo escuro e deixa retangulo visivel
    // em qualquer outra superficie. A -2026 e RGBA de verdade.
    expect(logo).toContain('src="/otimizia-logo-2026-dark.png"');
    expect(logo).toContain('src="/otimizia-mark-2026-dark.png"');
    // Precisa mirar o uso, nao a mencao: o comentario do componente explica
    // por que o truque saiu, e citaria a classe numa checagem textual.
    expect(logo).not.toMatch(/className=\{[^}]*mix-blend-screen/);
    expect(logo).toContain("unoptimized");
    expect(manifest).toContain('src: "/otimizia-app-icon-2026.png"');
    expect(manifest).toContain('src: "/otimizia-app-icon-2026-maskable.png"');
    expect(layout).toContain('icon: "/otimizia-app-icon-2026.png"');
    expect(serviceWorker).toContain('icon: "/otimizia-app-icon-2026.png"');
  });
});
