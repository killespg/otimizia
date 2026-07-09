export type WidgetType =
  | "metrics"
  | "revenue_chart"
  | "deals_table"
  | "task_queue"
  | "onboarding_checklist"
  | "agent_panel"
  | "contacts_summary"
  | "activity_summary";

export type WidgetInstance = {
  id: string;
  type: WidgetType;
};

export type WidgetDef = {
  type: WidgetType;
  label: string;
  description: string;
  removable: boolean;
};

export const WIDGET_CATALOG: WidgetDef[] = [
  {
    type: "metrics",
    label: "Métricas",
    description: "Valor aberto, ganhos, conversão e outros números-chave.",
    removable: true,
  },
  {
    type: "revenue_chart",
    label: "Gráfico de receita",
    description: "Evolução do que foi ganho no mês.",
    removable: true,
  },
  {
    type: "deals_table",
    label: "Negócios recentes",
    description: "Lista dos negócios em aberto mais recentes.",
    removable: true,
  },
  {
    type: "task_queue",
    label: "Fila de tarefas",
    description: "Próximos lembretes e retornos pendentes.",
    removable: true,
  },
  {
    type: "agent_panel",
    label: "Assistente de IA",
    description: "Converse com o assistente direto do painel.",
    removable: true,
  },
  {
    type: "onboarding_checklist",
    label: "Primeiros passos",
    description: "Checklist de configuração inicial.",
    removable: true,
  },
  {
    type: "contacts_summary",
    label: "Contatos",
    description: "Total de contatos cadastrados.",
    removable: true,
  },
  {
    type: "activity_summary",
    label: "Atividade",
    description: "Conversas de hoje, uso da IA e equipe.",
    removable: true,
  },
];

const WIDGET_TYPES = new Set<WidgetType>(WIDGET_CATALOG.map((widget) => widget.type));

export const DEFAULT_LAYOUT: WidgetInstance[] = [
  { id: "metrics", type: "metrics" },
  { id: "revenue_chart", type: "revenue_chart" },
  { id: "deals_table", type: "deals_table" },
  { id: "task_queue", type: "task_queue" },
  { id: "agent_panel", type: "agent_panel" },
  { id: "onboarding_checklist", type: "onboarding_checklist" },
];

export function parseDashboardLayout(raw: unknown): WidgetInstance[] {
  if (!Array.isArray(raw)) return DEFAULT_LAYOUT;

  const seen = new Set<WidgetType>();
  const cleaned: WidgetInstance[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const type = (item as { type?: unknown }).type;
    if (typeof type !== "string" || !WIDGET_TYPES.has(type as WidgetType)) continue;
    const widgetType = type as WidgetType;
    if (seen.has(widgetType)) continue;
    seen.add(widgetType);
    cleaned.push({ id: widgetType, type: widgetType });
  }

  return cleaned.length > 0 ? cleaned : DEFAULT_LAYOUT;
}
