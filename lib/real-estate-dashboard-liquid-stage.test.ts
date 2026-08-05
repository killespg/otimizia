import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RealEstateDashboard } from "@/app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard";

describe("Layout horizontal do dashboard imobiliário", () => {
  it("posiciona as métricas entre a busca do Tim e os indicadores em largura total", () => {
    const html = renderToStaticMarkup(
      createElement(RealEstateDashboard, {
        now: new Date("2026-08-04T12:00:00.000Z"),
        displayName: "Mariana Costa",
        from: "2026-08-01",
        to: "2026-08-31",
        brokerFilter: "",
        members: [],
        canManage: false,
        activePropertyCount: 13,
        capturedCount: 0,
        showcaseCount: 0,
        visits: [],
        offers: [],
        commissions: [],
        targets: [],
        deals: [],
        properties: [],
        organization: null,
        showAnimatedBackground: true,
      }),
    );

    expect(html).toContain('data-liquid-stage="real-estate"');
    expect(html).toContain('data-liquid-metric-rail="true"');
    expect(html).toContain('data-liquid-metrics-layout="horizontal"');
    expect(html).toContain('data-liquid-indicators="true"');
    expect(html).toContain('data-liquid-indicators-surface="dense"');
    expect(html).toContain('data-liquid-context-tray="true"');
    expect(html.match(/data-liquid-metric="true"/g)).toHaveLength(4);
    expect(html.match(/data-metric-sparkline="true"/g)).toHaveLength(4);
    expect(html.match(/data-metric-value-style="solid"/g)).toHaveLength(4);
    expect(html.match(/data-hover-lift="true"/g)).toHaveLength(4);
    expect(html.match(/data-indicator-group="true"/g)).toHaveLength(3);
    expect(html.match(/data-financial-progress="true"/g)).toHaveLength(3);
    expect(html).toContain('data-liquid-glow="tim-action"');
    expect(html).not.toContain('data-liquid-glow="assistant"');

    expect(html).toContain('data-dashboard-profile-header="true"');
    expect(html).toContain('data-dashboard-greeting="true"');
    expect(html).toContain('data-dashboard-status="true"');
    // O sino do resumo e as configurações rápidas subiram para a topbar: os
    // dois valem em qualquer tela do corretor e aqui apareciam ao lado dos
    // equivalentes da topbar, repetindo o mesmo destino. Cadastrar imóvel
    // continua no menu "Mais > Criar" do celular e no botão da carteira.
    expect(html).not.toContain('data-dashboard-notification-trigger="true"');
    expect(html).not.toContain('data-dashboard-settings-trigger="true"');
    expect(html).not.toContain('aria-label="Cadastrar novo imóvel"');
    expect(html).toContain('href="/painel/assistente"');
    expect(html).toContain("Acione o Tim na sua operação");
    expect(html).toContain("Bom dia, Mariana");
    expect(html).toContain("MC");
    expect(html).toContain("13 imóveis ativos");
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u);

    const profileHeaderClasses = html.match(
      /data-dashboard-profile-header="true"[^>]+class="([^"]+)"/,
    )?.[1];
    expect(profileHeaderClasses).not.toContain("md:hidden");
    expect(html).not.toContain('data-desktop-dashboard-header="true"');

    const metricRailClasses = html.match(
      /data-liquid-metric-rail="true"[^>]+class="([^"]+)"/,
    )?.[1];
    expect(metricRailClasses).toContain("grid-cols-2");
    expect(metricRailClasses).toContain("lg:grid-cols-4");
    expect(metricRailClasses).not.toContain("grid-cols-1");

    const metricCardClasses = Array.from(
      html.matchAll(/data-liquid-metric="true"[^>]+class="([^"]+)"/g),
      (match) => match[1],
    );
    expect(metricCardClasses).toHaveLength(4);
    for (const className of metricCardClasses) {
      expect(className).toContain("min-h-20");
      expect(className).toContain("gap-2");
      expect(className).toContain("p-3");
      expect(className).toContain("sm:min-h-28");
      expect(className).toContain("sm:gap-3");
      expect(className).toContain("sm:p-4");
    }

    expect(html.match(/data-metric-note="true" class="hidden sm:block/g)).toHaveLength(4);
    expect(html.match(/data-metric-sparkline="true"[^>]+class="[^"]*hidden md:block/g)).toHaveLength(4);

    // O valor e o dado que a pessoa le para decidir: fica em branco solido.
    // Em gradiente, a ponta cinza media 2,52:1 contra o vidro transparente --
    // abaixo de AA-large -- e o DESIGN.md nao admite texto em gradiente.
    const metricValueClasses = Array.from(
      html.matchAll(/data-metric-value-style="solid" class="([^"]+)"/g),
      (match) => match[1],
    );
    expect(metricValueClasses).toHaveLength(4);
    for (const className of metricValueClasses) {
      expect(className).toContain("text-white");
      expect(className).not.toContain("bg-clip-text");
      expect(className).not.toContain("text-transparent");
    }

    const timPosition = html.indexOf("Acione o Tim na sua operação");
    const metricsPosition = html.indexOf('data-liquid-metrics-layout="horizontal"');
    const workspacePosition = html.indexOf("Área de trabalho");
    const indicatorsPosition = html.indexOf('data-liquid-indicators-surface="dense"');

    expect(timPosition).toBeGreaterThan(-1);
    expect(metricsPosition).toBeGreaterThan(timPosition);
    expect(workspacePosition).toBeGreaterThan(metricsPosition);
    expect(indicatorsPosition).toBeGreaterThan(workspacePosition);

    for (const href of [
      "/painel/imoveis",
      "/painel/imoveis/colecoes",
      "/painel/imoveis/visitas",
      "/painel/imoveis/comissoes",
    ]) {
      expect(html).toContain(`href="${href}"`);
    }

    expect(html).not.toContain("Pergunte ao Tim");
    expect(html).not.toContain("Agenda de visitas");
    // Cadastrar imóvel deixou de ocupar o destaque do cabeçalho, que agora é
    // da conta. O caminho continua na carteira e nas ações rápidas da
    // navegação — esta tela é de leitura da operação.
    expect(html).not.toContain("Novo imóvel");
    expect(html).toContain("Personalizar painel");
    expect(html).not.toContain("data-dashboard-card");
    expect(html).not.toContain("divide-x");
    expect(html).not.toContain("divide-y");
    expect(html).not.toContain("border-y");
  });

  it("deriva o progresso financeiro dos valores reais do período", () => {
    const html = renderToStaticMarkup(
      createElement(RealEstateDashboard, {
        now: new Date("2026-08-04T12:00:00.000Z"),
        displayName: "Mariana Costa",
        from: "2026-08-01",
        to: "2026-08-31",
        brokerFilter: "",
        members: [],
        canManage: false,
        activePropertyCount: 13,
        capturedCount: 0,
        showcaseCount: 0,
        visits: [],
        offers: [],
        commissions: [{
          id: "commission-1",
          org_id: "org-1",
          deal_id: "deal-1",
          property_id: "property-1",
          broker_id: "broker-1",
          gross_sale_value_cents: 10_000_000,
          commission_percent: 5,
          expected_amount_cents: 500_000,
          received_amount_cents: 250_000,
          status: "partial",
          due_at: null,
          received_at: null,
          notes: null,
          created_at: "2026-08-01T12:00:00.000Z",
          updated_at: "2026-08-01T12:00:00.000Z",
        }],
        targets: [{
          id: "target-1",
          org_id: "org-1",
          broker_id: null,
          period_start: "2026-08-01",
          period_end: "2026-08-31",
          target_amount_cents: 1_000_000,
          created_by: "broker-1",
          created_at: "2026-08-01T12:00:00.000Z",
        }],
        deals: [],
        properties: [],
        organization: null,
        showAnimatedBackground: true,
      }),
    );

    expect(html.match(/data-financial-progress="true"/g)).toHaveLength(3);
    expect(html.match(/aria-valuenow="50"/g)).toHaveLength(3);

    const financialProgressClasses = Array.from(
      html.matchAll(/data-financial-progress="true"[^>]+class="([^"]+)"/g),
      (match) => match[1],
    );
    expect(financialProgressClasses).toHaveLength(3);
    for (const className of financialProgressClasses) {
      expect(className).toContain("h-1.5");
      expect(className).toContain("w-full");
      expect(className).toContain("bg-white/10");
    }
  });
});
