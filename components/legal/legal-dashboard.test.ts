import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

describe("legal dashboard visual contract", () => {
  const page = read("app/(dashboard)/painel/juridico/page.tsx");
  const assistant = read(
    "components/design-system/legal-dashboard-assistant.tsx",
  );
  const filters = read(
    "components/design-system/legal-dashboard-filters.tsx",
  );
  const primitives = read("components/legal/legal-ui.tsx");
  const globals = read("app/globals.css");
  const legalSurface = [page, assistant, filters, primitives].join("\n");

  it("delegates commercial metrics to the focused CRM component", () => {
    expect(page).toContain("getLegalCrmMetrics");
    expect(page).toContain("normalizeLegalCrmPeriodKey");
    expect(page).toContain("<LegalCrmPerformance");
    expect(page).toContain("commercialMetrics");
    expect(page.indexOf("<LegalDashboardAssistant />")).toBeLessThan(
      page.indexOf("<LegalCrmPerformance"),
    );
    expect(page.indexOf("<LegalCrmPerformance")).toBeLessThan(
      page.indexOf('id="movimentacoes"'),
    );
  });

  it("keeps the possible-client board on the six office columns", () => {
    const pipeline = read("app/(dashboard)/painel/funil/page.tsx");
    const board = read("app/(dashboard)/painel/funil/Board.tsx");
    expect(pipeline).toContain("return [...LEGAL_PIPELINE_COLUMNS]");
    expect(pipeline).toContain("Novo possível cliente");
    expect(board).toContain("LegalDealSummary");
    expect(board).toContain("legalColumnMeta(column).title");
    expect(board).toContain("[...LEGAL_PIPELINE_COLUMNS]");
  });

  it("intercepts legal losses before an optimistic Board mutation", () => {
    const board = read("app/(dashboard)/painel/funil/Board.tsx");
    const action = read("app/(dashboard)/painel/actions.ts");
    expect(board).toContain("isLegal = false");
    expect(board).toContain("isLostPipelineList(targetList)");
    expect(board.indexOf("setPendingLegalLoss")).toBeLessThan(
      board.indexOf("setDeals((prev)"),
    );
    expect(board).toContain("moveDealToList(id, targetList, lossReason)");
    expect(board).toContain("returnFocusTo={legalLossReturnFocus}");
    expect(action).toContain('workspaceKey === "law_office"');
    expect(action).toContain("isLegalLossReasonCode(lossReason.code)");
    expect(action).toContain("loss_reason_code");
    expect(action).toContain("loss_reason_notes");
    expect(action).toContain(".trim().slice(0, 500)");
    expect(action).toContain("loss_reason_code: legalLoss ? lossReason!.code : null");
  });

  it("uses the real-estate dashboard composition as the legal baseline", () => {
    expect(page).toContain('data-legal-dashboard="true"');
    expect(page).toContain("dashboard-board");
    expect(page).toContain(
      "grid grid-cols-2 overflow-hidden panel xl:grid-cols-4",
    );
    expect(page).toContain(
      "xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,.55fr)]",
    );
    expect(page).toContain("OperationalMetric");
    expect(page).not.toContain("function StatCard");
  });

  it("uses the current neutral and blue system without legacy purple", () => {
    expect(legalSurface).not.toMatch(/#5f35d4|#6a3fe0|#7146dc|#8055e8/i);
    expect(legalSurface).not.toMatch(/rounded-md|rounded-control/);
    expect(page).toContain("bg-od-accent");
    expect(filters).toContain("rounded-[var(--radius-control)]");
    expect(page).toContain("rounded-[var(--radius-panel)]");
  });

  it("represents both series promised by the portfolio flow chart", () => {
    expect(page).toContain('aria-label="Casos abertos"');
    expect(page).toContain('aria-label="Casos encerrados"');
  });

  it("does not mix all open receivables into a fake monthly progress rate", () => {
    expect(page).not.toContain("collectionProgress");
    expect(page).not.toContain("da previsão mensal recebida");
    expect(page).toContain("Recebido neste mês");
  });

  it("keeps the first mobile metric row free of a stray top divider", () => {
    expect(globals).toContain(".ui-metric:nth-child(n + 3)");
    expect(globals).not.toContain(
      ".ui-metric + .ui-metric { border-left: 0; border-top:",
    );
  });

  it("groups related information into the same panel vocabulary as real estate", () => {
    expect(page).not.toContain("legal-flat-section");
    expect(page).not.toContain("legal-metric-strip");
    expect(page).toContain('data-legal-indicators="true"');
    expect(assistant).toContain("panel px-4");
  });

  it("only renders dense legal tables at the extra-large breakpoint", () => {
    expect(page).not.toContain(
      "grid-cols-[128px_minmax(0,1.2fr)_minmax(150px,.8fr)_110px_120px_32px]",
    );
    expect(page).toContain(
      "xl:grid-cols-[1.4fr_.75fr_1fr_.9fr_1fr_28px]",
    );
    expect(page).not.toContain(
      "sm:grid-cols-[1.4fr_.75fr_1fr_.9fr_1fr_28px]",
    );
  });
});
