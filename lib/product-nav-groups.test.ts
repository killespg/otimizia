import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BriefcaseBusiness, CircleGauge, Handshake, Users } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/painel/imoveis/dashboard",
}));

import { TwoLevelNav, type NavGroup } from "@/components/design-system/product-nav-groups";

describe("Navegação desktop expandida", () => {
  it("mantém todas as categorias e destinos visíveis no mesmo painel", () => {
    const groups: NavGroup[] = [
      {
        label: "",
        items: [
          {
            href: "/painel/imoveis/dashboard",
            label: "Visão geral",
            icon: CircleGauge,
            exact: true,
          },
        ],
      },
      {
        label: "Imobiliário",
        icon: BriefcaseBusiness,
        items: [
          {
            href: "/painel/imoveis",
            label: "Carteira de imóveis",
            icon: BriefcaseBusiness,
          },
        ],
      },
      {
        label: "Comercial",
        icon: Handshake,
        items: [
          {
            href: "/painel/contatos",
            label: "Clientes",
            icon: Users,
          },
        ],
      },
    ];

    const html = renderToStaticMarkup(
      createElement(TwoLevelNav, {
        namespace: "real-estate-test",
        groups,
        logoHref: "/painel/imoveis/dashboard",
        subtitle: "Corretor de imóveis",
        organizationName: "Mariana Costa Imóveis",
        displayName: "Mariana Costa",
        onLogout: () => undefined,
        railAriaLabel: "Navegação imobiliária",
        detailAriaLabel: "Detalhes da navegação imobiliária",
        mobileTabs: [groups[0].items[0], groups[1].items[0], groups[2].items[0]],
        mobileTimHref: "/painel/assistente",
        mobileGroups: groups.slice(1),
        mobileAriaLabel: "Navegação imobiliária no celular",
      }),
    );

    expect(html).toContain('data-product-nav-expanded="true"');
    expect(html).toContain("Imobiliário");
    expect(html).toContain("Carteira de imóveis");
    expect(html).toContain("Comercial");
    expect(html).toContain("Clientes");
    expect(html).not.toContain("Ocultar detalhes");
    expect(html).toContain('aria-label="Redimensionar menu lateral"');
    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-valuemin="256"');
    expect(html).toContain('aria-valuemax="360"');
    expect(html).toContain('aria-valuenow="288"');
    expect(html).toContain('aria-keyshortcuts="ArrowLeft ArrowRight Home End"');
    expect(html).toContain('class="flex h-full min-h-0 min-w-0 flex-1 flex-col"');
    expect(html).toContain("relative z-10 flex h-full w-3 shrink-0");
    expect(html).not.toContain("absolute inset-y-0 right-0");
  });
});
