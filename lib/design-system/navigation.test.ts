import { describe, expect, it } from "vitest";
import { buildProductNavigation } from "./navigation";

const destinations = (
  navigation: ReturnType<typeof buildProductNavigation>,
) => navigation.groups.flatMap((group) => group.items.map((item) => item.href));

describe("product navigation contract", () => {
  it("keeps seller destinations and optional modules data-driven", () => {
    const navigation = buildProductNavigation({
      variant: "seller",
      enabledSellerModules: ["catalog", "orders", "warranties"],
      counts: { contacts: 3, deals: 4, reminders: 2 },
    });

    expect(destinations(navigation)).toEqual(
      expect.arrayContaining([
        "/painel",
        "/painel/contatos",
        "/painel/vendas",
        "/painel/produtos",
        "/painel/tarefas",
        "/painel/configuracoes",
      ]),
    );
    expect(destinations(navigation)).not.toContain("/painel/colecoes");
    expect(destinations(navigation)).not.toContain("/painel/pos-venda");
    expect(destinations(navigation)).not.toContain("/painel/pedidos");
    expect(destinations(navigation)).not.toContain("/painel/calendario");
    expect(destinations(navigation)).not.toContain("/painel/operacao/configuracoes");
    expect(destinations(navigation)).not.toContain("/painel/funil");
    expect(navigation.groups.map((group) => group.label)).not.toEqual(
      expect.arrayContaining(["CRM", "Operação", "Gestão"]),
    );
    expect(navigation.bottomTabs.map((tab) => tab.label)).toEqual([
      "Hoje",
      "Vendas",
      "WhatsApp",
    ]);
    expect(navigation.quickActions[0]?.href).toBe("/painel/vendas#new-deal");
    expect(navigation.submenu).toBeUndefined();
  });

  it("filters legal finance destinations by permission", () => {
    const denied = buildProductNavigation({
      variant: "legal",
      access: { canViewFinance: false },
    });
    const allowed = buildProductNavigation({
      variant: "legal",
      access: { canViewFinance: true },
    });

    expect(destinations(denied)).not.toContain("/painel/financeiro");
    expect(destinations(allowed)).toContain("/painel/financeiro");
  });

  it("keeps real-estate routes and mobile actions in one serializable contract", () => {
    const navigation = buildProductNavigation({
      variant: "real-estate",
      counts: { properties: 8, visits: 2, collections: 1, deals: 5 },
    });

    expect(destinations(navigation)).toEqual(
      expect.arrayContaining([
        "/painel/imoveis/dashboard",
        "/painel/imoveis",
        "/painel/imoveis/mapa",
        "/painel/imoveis/visitas",
        "/painel/imoveis/colecoes",
        "/painel/imoveis/comissoes",
      ]),
    );
    expect(navigation.quickActions[0]?.key).toBe("property-create");
    expect(JSON.parse(JSON.stringify(navigation))).toEqual(navigation);
  });

  it("adds generic destinations only when their permissions are enabled", () => {
    const navigation = buildProductNavigation({
      variant: "generic",
      access: {
        canViewLegal: true,
        canViewFinance: true,
        canViewRealEstate: false,
        isAdmin: true,
      },
      labels: {
        contacts: "Associados",
        pipeline: "Negociações",
        followups: "Pendências",
      },
    });

    const hrefs = destinations(navigation);
    expect(hrefs).toContain("/painel/juridico");
    expect(hrefs).toContain("/painel/financeiro");
    expect(hrefs).toContain("/painel/metricas");
    expect(hrefs).not.toContain("/painel/imoveis");
    expect(navigation.groups[0].items[1].label).toBe("Associados");
  });
});
