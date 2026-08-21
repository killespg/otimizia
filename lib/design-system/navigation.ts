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
      items: [item("settings", "/configuracoes", "Configurações", "settings")],
    },
  ];
}

function seller(input: BuildNavigationInput): ProductNavigationContract {
  const counts = input.counts ?? {};
  const modules = input.enabledSellerModules ?? ["catalog", "orders"];
  const overview = item("overview", "/painel", "Visão geral", "overview", {
    exact: true,
  });
  const tasks = item("tasks", "/tarefas", "Lembretes", "tasks", {
    badge: counts.reminders,
    danger: (counts.reminders ?? 0) > 0,
  });
  const whatsapp = item("whatsapp", "/whatsapp", "WhatsApp", "whatsapp");
  const groups = withSettings([
    {
      key: "overview",
      label: "",
      items: [
        overview,
        item("assistant", "/assistente", "Tim", "assistant"),
      ],
    },
    {
      key: "crm",
      label: "CRM",
      items: [
        item("contacts", "/contatos", "Clientes", "contacts", {
          badge: counts.contacts,
        }),
        item("pipeline", "/funil", "Funil de vendas", "pipeline", {
          badge: counts.deals,
          exact: true,
        }),
        tasks,
        whatsapp,
        item("calendar", "/calendario", "Calendário", "calendar"),
      ],
    },
    {
      key: "operation",
      label: "Operação",
      items: [
        ...(modules.includes("catalog")
          ? [item("products", "/produtos", "Produtos", "products")]
          : []),
        ...(modules.includes("collections")
          ? [item("collections", "/colecoes", "Coleções", "collections")]
          : []),
        ...(modules.includes("orders")
          ? [item("orders", "/pedidos", "Pedidos", "orders")]
          : []),
        ...(modules.includes("warranties")
          ? [item("warranty", "/pos-venda", "Pós-venda", "warranty")]
          : []),
      ],
    },
    {
      key: "management",
      label: "Gestão",
      items: [
        item("team", "/equipe", "Meu negócio", "team"),
        item(
          "operation-settings",
          "/operacao/configuracoes",
          "Configurar operação",
          "settings",
        ),
        item("reports", "/funil/relatorio", "Relatórios", "reports"),
      ],
    },
  ]);

  return {
    namespace: "seller",
    groups,
    bottomTabs: [overview, tasks, whatsapp],
    assistantHref: "/assistente",
    quickActions: [
      item("sale-create", "/funil#new-deal", "Nova venda", "create"),
      item("task-create", "/tarefas#new-task", "Novo lembrete", "tasks"),
    ],
    submenu: {
      parentKey: "overview",
      items: [
        { key: "my-operation", href: "/painel", label: "Minha operação" },
        { key: "reports", href: "/funil/relatorio", label: "Relatórios" },
      ],
    },
  };
}

function legal(input: BuildNavigationInput): ProductNavigationContract {
  const counts = input.counts ?? {};
  const overview = item(
    "legal-overview",
    "/juridico",
    "Visão geral",
    "overview",
    { exact: true },
  );
  const processes = item(
    "processes",
    "/juridico/processos",
    "Processos",
    "processes",
    { badge: counts.cases },
  );
  const deadlines = item(
    "deadlines",
    "/juridico/prazos",
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
        item("assistant", "/assistente", "Tim", "assistant"),
      ],
    },
    {
      key: "legal",
      label: "Jurídico",
      items: [
        processes,
        deadlines,
        item(
          "documents",
          "/juridico/documentos",
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
        item("fees", "/financeiro", "Honorários", "finance"),
        item(
          "receivables",
          "/financeiro#recebiveis",
          "Recebíveis",
          "receivables",
          { badge: counts.receivables },
        ),
        item("expenses", "/financeiro#despesas", "Despesas", "expenses"),
      ],
    });
  }
  groups.push({
    key: "office",
    label: "Escritório",
    items: [
      item("contacts", "/contatos", "Clientes", "contacts"),
      item("pipeline", "/funil", "Possíveis Clientes", "pipeline"),
      item("whatsapp", "/whatsapp", "WhatsApp", "whatsapp"),
        item("calendar", "/calendario", "Calendário", "calendar"),
        item("team", "/equipe", "Equipe", "team"),
      item("reports", "/funil/relatorio", "Relatórios", "reports"),
    ],
  });

  return {
    namespace: "legal",
    groups: withSettings(groups),
    bottomTabs: [overview, processes, deadlines],
    assistantHref: "/assistente",
    quickActions: [],
  };
}

function realEstate(input: BuildNavigationInput): ProductNavigationContract {
  const counts = input.counts ?? {};
  const overview = item(
    "property-overview",
    "/imoveis/dashboard",
    "Visão geral",
    "overview",
    { exact: true },
  );
  const properties = item(
    "properties",
    "/imoveis",
    "Carteira de imóveis",
    "properties",
    { badge: counts.properties, exact: true },
  );
  const visits = item(
    "visits",
    "/imoveis/visitas",
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
          item("assistant", "/assistente", "Tim", "assistant"),
        ],
      },
      {
        key: "portfolio",
        label: "Imobiliário",
        items: [
          properties,
          item("map", "/imoveis/mapa", "Mapa", "map"),
          visits,
          item(
            "collections",
            "/imoveis/colecoes",
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
          item("contacts", "/contatos", "Clientes", "contacts"),
          item("pipeline", "/funil", "Atendimentos", "pipeline", {
            badge: counts.deals,
          }),
          item("whatsapp", "/whatsapp", "WhatsApp", "whatsapp"),
          item("calendar", "/calendario", "Calendário", "calendar"),
        ],
      },
      {
        key: "management",
        label: "Gestão",
        items: [
          item(
            "commissions",
            "/imoveis/comissoes",
            "Comissões e metas",
            "commissions",
          ),
          item("team", "/equipe", "Equipe", "team"),
          item("reports", "/funil/relatorio", "Relatórios", "reports"),
        ],
      },
    ]),
    bottomTabs: [
      { ...overview, label: "Início" },
      { ...properties, label: "Imóveis" },
      visits,
    ],
    assistantHref: "/assistente",
    quickActions: [
      item("property-create", "/imoveis/novo", "Novo imóvel", "create"),
    ],
    submenu: {
      parentKey: "property-overview",
      items: [
        {
          key: "my-operation",
          href: "/imoveis/dashboard",
          label: "Minha operação",
        },
        {
          key: "commissions",
          href: "/imoveis/comissoes",
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
  const tasks = item("tasks", "/tarefas", labels.followups, "tasks");
  const whatsapp = item("whatsapp", "/whatsapp", "WhatsApp", "whatsapp");
  const groups: NavigationGroup[] = [
    {
      key: "work",
      label: "Trabalho",
      items: [
        overview,
        item("contacts", "/contatos", labels.contacts, "contacts"),
        item("pipeline", "/funil", labels.pipeline, "pipeline"),
        whatsapp,
        item("calendar", "/calendario", "Calendário", "calendar"),
        tasks,
        item("assistant", "/assistente", "Tim", "assistant"),
        item("team", "/equipe", "Equipe", "team"),
      ],
    },
  ];
  if (access.canViewLegal) {
    groups.push({
      key: "legal",
      label: "Jurídico",
      items: [
        item("legal-overview", "/juridico", "Painel jurídico", "overview", {
          exact: true,
        }),
        item("processes", "/juridico/processos", "Processos", "processes"),
        item("deadlines", "/juridico/prazos", "Prazos", "deadlines"),
        item("documents", "/juridico/documentos", "Documentos", "documents"),
      ],
    });
  }
  if (access.canViewRealEstate) {
    groups.push({
      key: "real-estate",
      label: "Imobiliário",
      items: [
        item("properties", "/imoveis", "Imóveis", "properties"),
        item("map", "/imoveis/mapa", "Mapa", "map"),
        item("visits", "/imoveis/visitas", "Visitas", "visits"),
        item("collections", "/imoveis/colecoes", "Vitrines", "collections"),
      ],
    });
  }
  if (access.canViewFinance) {
    groups.push({
      key: "management",
      label: "Gestão",
      items: [item("finance", "/financeiro", "Financeiro", "finance")],
    });
  }
  if (access.isAdmin) {
    groups.push({
      key: "admin",
      label: "Administração",
      items: [item("metrics", "/metricas", "Métricas", "admin")],
    });
  }

  return {
    namespace: "generic",
    groups: withSettings(groups),
    bottomTabs: [overview, tasks, whatsapp],
    assistantHref: "/assistente",
    quickActions: [],
  };
}

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
