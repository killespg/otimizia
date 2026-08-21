import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { resolveLegalCrmPeriod, type LegalCrmMetrics } from "@/lib/law/legal-crm-metrics";
import { LegalCrmPerformance } from "./legal-crm-performance";

function metrics(overrides: Partial<LegalCrmMetrics> = {}): LegalCrmMetrics {
  return {
    period: resolveLegalCrmPeriod("current_month", new Date("2026-08-14T15:00:00Z")),
    firstResponse: { status: "ready", medianMinutes: 18, responded: 8, pending: 2, ai: 3, human: 5 },
    leads: { total: 12, qualified: 7 },
    funnel: [
      { stage: "novo", label: "Triagem Inicial", reached: 12, conversionFromPrevious: null },
      { stage: "em_contato", label: "Análise de Viabilidade", reached: 7, conversionFromPrevious: 58.33 },
      { stage: "negociacao", label: "Proposta / Honorários", reached: 5, conversionFromPrevious: 71.43 },
      { stage: "ganho", label: "Convertido (Processo Ativo)", reached: 3, conversionFromPrevious: 60 },
    ],
    origins: [{ source: "Indicação", leads: 6, qualified: 4, wins: 2, conversion: 33.33, receivedCents: 180000 }],
    losses: [{ code: "price", label: "Preço", count: 2 }],
    cac: { status: "ready", valueCents: 30000, totalCostCents: 90000, wins: 3 },
    ltv: { receivedCents: 250000, contractedCents: 480000, unlinkedRecords: 1 },
    coverage: { partial: false, startedAt: "2026-01-01T00:00:00Z" },
    availability: {
      leads: "ready", funnel: "ready", origins: "ready", originRevenue: "ready", losses: "ready",
      cac: "ready", ltvReceived: "ready", ltvContracted: "ready", ltvUnlinked: "ready", coverage: "ready",
    },
    ...overrides,
  };
}

describe("LegalCrmPerformance", () => {
  it("renders the approved semantic A-v2 hierarchy", () => {
    const html = renderToStaticMarkup(createElement(LegalCrmPerformance, {
      metrics: metrics(),
      canManageFinance: true,
      searchParams: { period: "30", area: "tributário" },
    }));

    for (const label of [
      "Desempenho comercial jurídico",
      "Tempo de 1ª resposta",
      "Possíveis clientes qualificados",
      "Conversão por etapa",
      "Origens que mais convertem",
      "Principais motivos de perda",
      "LTV recebido",
      "LTV contratado",
    ]) expect(html).toContain(label);
    expect(html).toContain("58,33%");
    expect(html).toContain("period=30");
    expect(html).toContain("area=tribut");
    expect(html).toContain("crm_period=previous_month");
    expect(html).not.toContain("grid-cols-4 gap-4");
    expect(html).not.toMatch(/divide-[xy]|border-(?:r|b)\b/);
  });

  it("does not leak financial values or invent a zero response time", () => {
    const html = renderToStaticMarkup(createElement(LegalCrmPerformance, {
      metrics: metrics({
        firstResponse: { status: "unavailable", reason: "no_whatsapp" },
        cac: { status: "hidden" },
        ltv: null,
        availability: {
          ...metrics().availability,
          originRevenue: "hidden",
          cac: "hidden",
          ltvReceived: "hidden",
          ltvContracted: "hidden",
          ltvUnlinked: "hidden",
        },
      }),
      canManageFinance: false,
    }));

    expect(html).toContain("Conecte o WhatsApp");
    expect(html).not.toContain("0 min");
    expect(html).not.toContain("CAC");
    expect(html).not.toContain("LTV recebido");
    expect(html).not.toContain("R$ 2.500,00");
  });

  it("shows honest empty, partial-history and configurable CAC states", () => {
    const html = renderToStaticMarkup(createElement(LegalCrmPerformance, {
      metrics: metrics({
        firstResponse: { status: "empty", reason: "no_conversations" },
        leads: { total: 0, qualified: 0 },
        funnel: [],
        origins: [],
        losses: [],
        cac: { status: "not_configured" },
        ltv: { receivedCents: null, contractedCents: null, unlinkedRecords: 0 },
        coverage: { partial: true, startedAt: "2026-08-01T12:00:00Z" },
        availability: { ...metrics().availability, originRevenue: "unavailable" },
      }),
      canManageFinance: true,
    }));

    expect(html).toContain("Nenhuma conversa recebida no período");
    expect(html).toContain("Não configurado");
    expect(html).toContain("Informar custos");
    expect(html).toContain('class="flex flex-col items-start gap-3"');
    expect(html).toContain("01/08/2026");
    expect(html).toContain("Receita por origem indisponível");
    expect(html).not.toContain("0 min");
  });
});
