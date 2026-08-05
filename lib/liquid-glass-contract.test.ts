import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Bell, CircleGauge, ContactRound, Users } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/painel",
  useRouter: () => ({ push: vi.fn() }),
}));

import {
  TwoLevelNav,
  type NavItem,
} from "@/components/design-system/product-nav-groups";
import { ProductTopbar } from "@/components/design-system/product-topbar";
import { SellerProductTopbar } from "@/components/design-system/seller-product-topbar";
import { LegalProductTopbar } from "@/components/design-system/legal-product-topbar";
import { RealEstateProductTopbar } from "@/components/design-system/real-estate-product-topbar";

const overview: NavItem = {
  href: "/painel",
  label: "Visão geral",
  icon: CircleGauge,
  exact: true,
};
const contacts: NavItem = {
  href: "/painel/contatos",
  label: "Contatos",
  icon: ContactRound,
};
const team: NavItem = {
  href: "/painel/equipe",
  label: "Equipe",
  icon: Users,
};
const reminders: NavItem = {
  href: "/painel/tarefas",
  label: "Lembretes",
  icon: Bell,
};

describe("Liquid Glass do shell de produto", () => {
  it("renderiza um único volume no desktop e um dock irmão no mobile", () => {
    const html = renderToStaticMarkup(
      createElement(TwoLevelNav, {
        namespace: "contract",
        groups: [
          { label: "", items: [overview] },
          { label: "Relacionamento", icon: ContactRound, items: [contacts, team] },
        ],
        submenu: {
          parentHref: "/painel",
          items: [
            { href: "/painel", label: "Minha operação" },
            { href: "/painel/relatorios", label: "Relatórios" },
          ],
        },
        logoHref: "/painel",
        subtitle: "Operação",
        organizationName: "Organização",
        displayName: "Mariana Costa",
        onLogout: () => undefined,
        railAriaLabel: "Navegação principal",
        detailAriaLabel: "Detalhes da navegação",
        mobileTabs: [overview, contacts, reminders],
        mobileTimHref: "/painel/assistente",
        mobileGroups: [{ label: "Gestão", items: [team] }],
        mobileAriaLabel: "Navegação no celular",
      }),
    );

    expect(html.match(/data-liquid-glass-shell/g)).toHaveLength(1);
    expect(html.match(/<aside/g)).toHaveLength(1);
    expect(html).toContain('data-product-nav-expanded="true"');
    expect(html).not.toContain('<aside class="od-chrome');
    expect(html).toContain('aria-label="Redimensionar menu lateral"');
    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-keyshortcuts="ArrowLeft ArrowRight Home End"');
    expect(html).toContain("Relacionamento");
    expect(html).toContain("Contatos");
    expect(html).toContain("Equipe");
    expect(html).toContain("Minha operação");
    expect(html).toContain("min-h-11");
    expect(html).toContain("liquid-glass-scrollbar");
    expect(html.match(/data-mobile-nav/g)).toHaveLength(1);
    expect(html).toContain("liquid-glass-dock");
  });

  it("mantém a rolagem da sidebar arredondada e translúcida", () => {
    const styles = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

    expect(styles).toContain(".liquid-glass-scrollbar::-webkit-scrollbar-thumb");
    expect(styles).toContain("scrollbar-gutter: stable");
    expect(styles).toContain("scrollbar-color:");
    expect(styles).toContain("border-radius: 999px");
    expect(styles).toContain(".liquid-glass-scrollbar::-webkit-scrollbar-button");
    expect(styles).toContain("display: none");
  });

  it("mantém a topbar transparente e materializa apenas busca e ações", () => {
    const topbars = [
      createElement(ProductTopbar, { initials: "MC" }),
      createElement(SellerProductTopbar, { initials: "MC", reminderCount: 2 }),
      createElement(LegalProductTopbar, { initials: "MC" }),
      createElement(RealEstateProductTopbar, {
        displayName: "Mariana Costa",
        visitCount: 2,
        operationSummary: { requestedVisits: 1, openOffers: 0, overdueCommissions: 0 },
        notificationPreferences: {
          dailyPush: true,
          dailySummaryEmail: true,
          stalledDealEmail: false,
        },
      }),
    ];

    for (const topbar of topbars) {
      const html = renderToStaticMarkup(topbar);
      expect(html).toContain("data-liquid-glass-search");
      expect(html).toContain("data-liquid-glass-actions");
      expect(html).toContain("liquid-glass-control");
      expect(html).not.toMatch(/<header[^>]*od-chrome/);
    }
  });
});
