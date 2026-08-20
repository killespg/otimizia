export type ShellVariant = "generic" | "seller" | "legal" | "real-estate";

export type NavigationIconKey =
  | "overview"
  | "assistant"
  | "contacts"
  | "pipeline"
  | "tasks"
  | "whatsapp"
  | "calendar"
  | "team"
  | "products"
  | "collections"
  | "orders"
  | "warranty"
  | "settings"
  | "processes"
  | "deadlines"
  | "search"
  | "documents"
  | "finance"
  | "receivables"
  | "expenses"
  | "reports"
  | "properties"
  | "map"
  | "visits"
  | "commissions"
  | "admin"
  | "create";

export type NavigationItem = {
  key: string;
  href: string;
  label: string;
  icon: NavigationIconKey;
  exact?: boolean;
  badge?: number;
  danger?: boolean;
};

export type NavigationGroup = {
  key: string;
  label: string;
  items: NavigationItem[];
};

export type ProductNavigationContract = {
  namespace: ShellVariant;
  groups: NavigationGroup[];
  bottomTabs: [NavigationItem, NavigationItem, NavigationItem];
  assistantHref: string;
  quickActions: NavigationItem[];
  submenu?: {
    parentKey: string;
    items: Array<{ key: string; href: string; label: string }>;
  };
};

type Counts = Partial<
  Record<
    | "contacts"
    | "deals"
    | "reminders"
    | "cases"
    | "deadlines"
    | "documents"
    | "receivables"
    | "properties"
    | "visits"
    | "collections",
    number
  >
>;

export type BuildNavigationInput = {
  variant: ShellVariant;
  counts?: Counts;
  enabledSellerModules?: string[];
  access?: {
    canViewLegal?: boolean;
    canViewFinance?: boolean;
    canViewRealEstate?: boolean;
    isAdmin?: boolean;
  };
  labels?: {
    contacts: string;
    pipeline: string;
    followups: string;
  };
};

const item = (
  key: string,
  href: string,
  label: string,
  icon: NavigationIconKey,
  options: Pick<NavigationItem, "exact" | "badge" | "danger"> = {},
): NavigationItem => ({ key, href, label, icon, ...options });

function withSettings(groups: NavigationGroup[]) {
  return [
    ...groups,
    {
      key: "account",
      label: "Conta",
      items: [item("settings", "/painel/configuracoes", "Configurações", "settings")],
    },
  ];
}

function seller(input: BuildNavigationInput): ProductNavigationContract {
  const counts = input.counts ?? {};
  const modules = input.enabledSellerModules ?? ["catalog", "orders"];
  const overview = item("overview", "/painel", "Hoje", "overview", {
    exact: true,
  });
  const sales = item("pipeline", "/painel/vendas", "Vendas", "pipeline", {
    badge: counts.deals,
  });
  const whatsapp = item("whatsapp", "/painel/whatsapp", "WhatsApp", "whatsapp");
  const groups = withSettings([
    {
      key: "work",
      label: "",
      items: [
        overview,
        item("contacts", "/painel/contatos", "Clientes", "contacts", {
          badge: counts.contacts,
        }),
        sales,
        ...(modules.includes("catalog")
          ? [item("products", "/painel/produtos", "Produtos", "products")]
          : []),
        whatsapp,
      ],
    },
    {
      key: "more",
      label: "Mais",
      items: [
        item("assistant", "/painel/assistente", "Tim", "assistant"),
        item("tasks", "/painel/tarefas", "Lembretes", "tasks", {
          badge: counts.reminders,
          danger: (counts.reminders ?? 0) > 0,
        }),
        item("team", "/painel/equipe", "Equipe", "team"),
      ],
    },
  ]);

  return {
    namespace: "seller",
    groups,
    bottomTabs: [overview, sales, whatsapp],
    assistantHref: "/painel/assistente",
    quickActions: [
      item("sale-create", "/painel/vendas#new-deal", "Nova venda", "create"),
      item("task-create", "/painel/tarefas#new-task", "Novo lembrete", "tasks"),
    ],
  };
}

function legal(input: BuildNavigationInput): ProductNavigationContract {
  const counts = input.counts ?? {};
  const overview = item(
    "legal-overview",
    "/painel/juridico",
    "Visão geral",
    "overview",
    { exact: true },
  );
  const processes = item(
    "processes",
    "/painel/juridico/processos",
    "Processos",
    "processes",
    { badge: counts.cases },
  );
  const deadlines = item(
    "deadlines",
    "/painel/juridico/prazos",
    "Agenda e prazos",
    "deadlines",
    { badge: counts.deadlines, danger: (counts.deadlines ?? 0) > 0 },
  );
  const groups: NavigationGroup[] = [
    {
      key: "overview",
      label: "",
      items: [
        overview,
        item("assistant", "/painel/assistente", "Tim", "assistant"),
      ],
    },
    {
      key: "legal",
      label: "Jurídico",
      items: [
        processes,
        deadlines,
        item("datajud", "/painel/juridico/consulta", "Consulta DataJud", "search"),
        item(
          "documents",
          "/painel/juridico/documentos",
          "Documentos",
          "documents",
          { badge: counts.documents },
        ),
      ],
    },
  ];
  if (input.access?.canViewFinance) {
    groups.push({
      key: "finance",
      label: "Financeiro",
      items: [
        item("fees", "/painel/financeiro", "Honorários", "finance"),
        item(
          "receivables",
          "/painel/financeiro#recebiveis",
          "Recebíveis",
          "receivables",
          { badge: counts.receivables },
        ),
        item("expenses", "/painel/financeiro#despesas", "Despesas", "expenses"),
      ],
    });
  }
  groups.push({
    key: "office",
    label: "Escritório",
    items: [
      item("contacts", "/painel/contatos", "Clientes e atendimentos", "contacts"),
      item("pipeline", "/painel/funil", "Atendimentos", "pipeline"),
      item("whatsapp", "/painel/whatsapp", "WhatsApp", "whatsapp"),
        item("calendar", "/painel/calendario", "Calendário", "calendar"),
        item("team", "/painel/equipe", "Equipe", "team"),
      item("reports", "/painel/funil/relatorio", "Relatórios", "reports"),
    ],
  });

  return {
    namespace: "legal",
    groups: withSettings(groups),
    bottomTabs: [overview, processes, deadlines],
    assistantHref: "/painel/assistente",
    quickActions: [],
  };
}

function realEstate(input: BuildNavigationInput): ProductNavigationContract {
  const counts = input.counts ?? {};
  const overview = item(
    "property-overview",
    "/painel/imoveis/dashboard",
    "Visão geral",
    "overview",
    { exact: true },
  );
  const properties = item(
    "properties",
    "/painel/imoveis",
    "Carteira de imóveis",
    "properties",
    { badge: counts.properties, exact: true },
  );
  const visits = item(
    "visits",
    "/painel/imoveis/visitas",
    "Agenda de visitas",
    "visits",
    { badge: counts.visits, danger: (counts.visits ?? 0) > 0 },
  );

  return {
    namespace: "real-estate",
    groups: withSettings([
      {
        key: "overview",
        label: "",
        items: [
          overview,
          item("assistant", "/painel/assistente", "Tim", "assistant"),
        ],
      },
      {
        key: "portfolio",
        label: "Imobiliário",
        items: [
          properties,
          item("map", "/painel/imoveis/mapa", "Mapa", "map"),
          visits,
          item(
            "collections",
            "/painel/imoveis/colecoes",
            "Vitrines",
            "collections",
            { badge: counts.collections },
          ),
        ],
      },
      {
        key: "commercial",
        label: "Comercial",
        items: [
          item("contacts", "/painel/contatos", "Clientes", "contacts"),
          item("pipeline", "/painel/funil", "Atendimentos", "pipeline", {
            badge: counts.deals,
          }),
          item("whatsapp", "/painel/whatsapp", "WhatsApp", "whatsapp"),
          item("calendar", "/painel/calendario", "Calendário", "calendar"),
        ],
      },
      {
        key: "management",
        label: "Gestão",
        items: [
          item(
            "commissions",
            "/painel/imoveis/comissoes",
            "Comissões e metas",
            "commissions",
          ),
          item("team", "/painel/equipe", "Equipe", "team"),
          item("reports", "/painel/funil/relatorio", "Relatórios", "reports"),
        ],
      },
    ]),
    bottomTabs: [
      { ...overview, label: "Início" },
      { ...properties, label: "Imóveis" },
      visits,
    ],
    assistantHref: "/painel/assistente",
    quickActions: [
      item("property-create", "/painel/imoveis/novo", "Novo imóvel", "create"),
    ],
    submenu: {
      parentKey: "property-overview",
      items: [
        {
          key: "my-operation",
          href: "/painel/imoveis/dashboard",
          label: "Minha operação",
        },
        {
          key: "commissions",
          href: "/painel/imoveis/comissoes",
          label: "Metas e comissões",
        },
      ],
    },
  };
}

function generic(input: BuildNavigationInput): ProductNavigationContract {
  const labels = input.labels ?? {
    contacts: "Contatos",
    pipeline: "Funil",
    followups: "Tarefas",
  };
  const access = input.access ?? {};
  const overview = item("overview", "/painel", "Visão geral", "overview", {
    exact: true,
  });
  const tasks = item("tasks", "/painel/tarefas", labels.followups, "tasks");
  const whatsapp = item("whatsapp", "/painel/whatsapp", "WhatsApp", "whatsapp");
  const groups: NavigationGroup[] = [
    {
      key: "work",
      label: "Trabalho",
      items: [
        overview,
        item("contacts", "/painel/contatos", labels.contacts, "contacts"),
        item("pipeline", "/painel/funil", labels.pipeline, "pipeline"),
        whatsapp,
        item("calendar", "/painel/calendario", "Calendário", "calendar"),
        tasks,
        item("assistant", "/painel/assistente", "Tim", "assistant"),
        item("team", "/painel/equipe", "Equipe", "team"),
      ],
    },
  ];
  if (access.canViewLegal) {
    groups.push({
      key: "legal",
      label: "Jurídico",
      items: [
        item("legal-overview", "/painel/juridico", "Painel jurídico", "overview", {
          exact: true,
        }),
        item("processes", "/painel/juridico/processos", "Processos", "processes"),
        item("deadlines", "/painel/juridico/prazos", "Prazos", "deadlines"),
        item("datajud", "/painel/juridico/consulta", "Consulta DataJud", "search"),
        item("documents", "/painel/juridico/documentos", "Documentos", "documents"),
      ],
    });
  }
  if (access.canViewRealEstate) {
    groups.push({
      key: "real-estate",
      label: "Imobiliário",
      items: [
        item("properties", "/painel/imoveis", "Imóveis", "properties"),
        item("map", "/painel/imoveis/mapa", "Mapa", "map"),
        item("visits", "/painel/imoveis/visitas", "Visitas", "visits"),
        item("collections", "/painel/imoveis/colecoes", "Vitrines", "collections"),
      ],
    });
  }
  if (access.canViewFinance) {
    groups.push({
      key: "management",
      label: "Gestão",
      items: [item("finance", "/painel/financeiro", "Financeiro", "finance")],
    });
  }
  if (access.isAdmin) {
    groups.push({
      key: "admin",
      label: "Administração",
      items: [item("metrics", "/painel/metricas", "Métricas", "admin")],
    });
  }

  return {
    namespace: "generic",
    groups: withSettings(groups),
    bottomTabs: [overview, tasks, whatsapp],
    assistantHref: "/painel/assistente",
    quickActions: [],
  };
}

/** Seller URLs kept for deep links and redirects — never as root menu items. */
export const SELLER_DEEP_LINKS = {
  pipeline: "/painel/funil",
  orders: "/painel/pedidos",
  collections: "/painel/colecoes",
  afterSales: "/painel/pos-venda",
  operationSettings: "/painel/operacao/configuracoes",
  report: "/painel/funil/relatorio",
} as const;

export function buildProductNavigation(
  input: BuildNavigationInput,
): ProductNavigationContract {
  switch (input.variant) {
    case "seller":
      return seller(input);
    case "legal":
      return legal(input);
    case "real-estate":
      return realEstate(input);
    default:
      return generic(input);
  }
}
