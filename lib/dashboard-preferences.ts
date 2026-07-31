import type { MetricKey, ProfessionPreset } from "@/lib/professions";

const LEGACY_DASHBOARD_WIDGETS = [
  "metrics",
  "calendar",
  "chart",
  "deals",
  "tasks",
  "assistant",
  "open_claims",
  "onboarding",
] as const;

// A ordem inicial segue o trabalho real: orientar a primeira configuração,
// mostrar quem precisa de ação e só depois abrir análises. Preferências salvas
// continuam respeitadas, exceto a ordem-padrão legada sem personalização.
export const DASHBOARD_WIDGETS = [
  "onboarding",
  "tasks",
  "open_claims",
  "calendar",
  "deals",
  "metrics",
  "chart",
  "assistant",
] as const;

export type DashboardWidgetKey = (typeof DASHBOARD_WIDGETS)[number];

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetKey, string> = {
  metrics: "Métricas",
  calendar: "Calendário",
  chart: "Gráfico de receita",
  deals: "Negócios recentes",
  tasks: "Fila de tarefas",
  assistant: "Assistente de IA",
  open_claims: "Disponíveis pra pegar",
  onboarding: "Primeiros passos",
};

export const DASHBOARD_STYLES = ["glow", "clean", "compact", "executive"] as const;

export type DashboardStyle = (typeof DASHBOARD_STYLES)[number];

export const DASHBOARD_ACCENTS = ["purple", "violet", "cyan", "pink"] as const;

export type DashboardAccent = (typeof DASHBOARD_ACCENTS)[number];

export const ALL_DASHBOARD_METRICS: { key: MetricKey; fallbackLabel: string }[] = [
  { key: "open_value", fallbackLabel: "Valor aberto" },
  { key: "open_deals", fallbackLabel: "Em andamento" },
  { key: "won_value_month", fallbackLabel: "Recebido no mês" },
  { key: "won_count_month", fallbackLabel: "Fechados no mês" },
  { key: "contacts", fallbackLabel: "Contatos" },
  { key: "overdue_tasks", fallbackLabel: "Atrasados" },
  { key: "conversations_today", fallbackLabel: "Conversas hoje" },
  { key: "conversion_rate", fallbackLabel: "Conversão" },
  { key: "avg_ticket", fallbackLabel: "Ticket médio" },
  { key: "commission_open", fallbackLabel: "Comissão prevista" },
];

const LEGACY_AUTONOMOUS_SELLER_METRICS: MetricKey[] = [
  "open_value",
  "open_deals",
  "won_value_month",
  "overdue_tasks",
];

export type DashboardPreferences = {
  style: DashboardStyle;
  accent: DashboardAccent;
  metrics: MetricKey[];
  metricLabels: Partial<Record<MetricKey, string>>;
  widgets: DashboardWidgetKey[];
  showAnimatedBackground: boolean;
  salesMarketingCostCents?: number;
};

// Campos da forma "achatada" (legada), guardados direto na raiz do JSON antes
// de as preferências passarem a ser separadas por workspace.
const LEGACY_PREFERENCE_FIELDS = [
  "style",
  "accent",
  "metrics",
  "metricLabels",
  "widgets",
  "showAnimatedBackground",
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Cada área de atuação tem seu próprio painel. As preferências ficam separadas
// por workspace_key no mesmo JSON: `{ [workspaceKey]: { style, metrics... } }`.
// Contas antigas guardam a config achatada na raiz — nesse caso ela vale como
// fallback para todas as áreas até a pessoa salvar o painel de cada uma.
export function resolveScopedPreferenceValue(value: unknown, workspaceKey?: string): unknown {
  if (!isPlainObject(value)) return {};
  if (!workspaceKey) return value;
  const scoped = value[workspaceKey];
  if (isPlainObject(scoped)) return scoped;
  if (LEGACY_PREFERENCE_FIELDS.some((field) => field in value)) return value;
  return {};
}

// Grava a config de um workspace sem perder as dos outros (nem o fallback
// legado da raiz), preservando a separação por área.
export function mergeScopedPreferences(
  value: unknown,
  workspaceKey: string,
  preferences: DashboardPreferences
): Record<string, unknown> {
  const base = isPlainObject(value) ? value : {};
  return { ...base, [workspaceKey]: preferences };
}

export function getDashboardPreferences(
  value: unknown,
  preset: ProfessionPreset,
  workspaceKey?: string
): DashboardPreferences {
  const scoped = resolveScopedPreferenceValue(value, workspaceKey);
  const raw = isPlainObject(scoped)
    ? (scoped as Partial<DashboardPreferences>)
    : {};
  const presetMetrics = preset.metrics.map((metric) => metric.key);
  const metricLabels = normalizeMetricLabels(raw.metricLabels);
  const normalizedMetrics = normalizeMetricKeys(raw.metrics, presetMetrics);
  const shouldUpgradeSellerDefaults =
    workspaceKey === "autonomous_seller" &&
    Object.keys(metricLabels).length === 0 &&
    sameKeys(normalizedMetrics, LEGACY_AUTONOMOUS_SELLER_METRICS);

  return {
    style: isDashboardStyle(raw.style) ? raw.style : "clean",
    accent: isDashboardAccent(raw.accent) ? raw.accent : "purple",
    metrics: shouldUpgradeSellerDefaults ? presetMetrics : normalizedMetrics,
    metricLabels,
    widgets: normalizeWidgetKeys(raw.widgets),
    showAnimatedBackground: raw.showAnimatedBackground === true,
    salesMarketingCostCents: normalizeNonNegativeNumber(raw.salesMarketingCostCents),
  };
}

export function metricLabel(
  key: MetricKey,
  preset: ProfessionPreset,
  preferences: DashboardPreferences
) {
  const custom = cleanDashboardText(preferences.metricLabels[key], 42);
  if (custom) return custom;
  return (
    preset.metrics.find((metric) => metric.key === key)?.label ??
    ALL_DASHBOARD_METRICS.find((metric) => metric.key === key)?.fallbackLabel ??
    key
  );
}

export function cleanDashboardText(value: unknown, max = 42): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function isMetricKey(value: unknown): value is MetricKey {
  return ALL_DASHBOARD_METRICS.some((metric) => metric.key === value);
}

export function isDashboardWidgetKey(value: unknown): value is DashboardWidgetKey {
  return DASHBOARD_WIDGETS.some((widget) => widget === value);
}

export function isDashboardStyle(value: unknown): value is DashboardStyle {
  return DASHBOARD_STYLES.some((style) => style === value);
}

export function isDashboardAccent(value: unknown): value is DashboardAccent {
  return DASHBOARD_ACCENTS.some((accent) => accent === value);
}

function normalizeMetricKeys(value: unknown, fallback: MetricKey[]): MetricKey[] {
  const raw = Array.isArray(value) ? value : fallback;
  const keys = raw.filter(isMetricKey);
  return keys.length > 0 ? unique(keys).slice(0, 8) : fallback;
}

function normalizeWidgetKeys(value: unknown): DashboardWidgetKey[] {
  const raw = Array.isArray(value) ? value : DASHBOARD_WIDGETS;
  const keys = raw.filter(isDashboardWidgetKey);
  if (sameStringKeys(keys, LEGACY_DASHBOARD_WIDGETS)) {
    return [...DASHBOARD_WIDGETS];
  }
  return keys.length > 0 ? unique(keys) : [...DASHBOARD_WIDGETS];
}

function normalizeMetricLabels(value: unknown): Partial<Record<MetricKey, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => isMetricKey(key))
      .map(([key, label]) => [key, cleanDashboardText(label)])
      .filter(([, label]) => Boolean(label))
  ) as Partial<Record<MetricKey, string>>;
}

function unique<T extends string>(values: T[]): T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function sameKeys(left: MetricKey[], right: MetricKey[]) {
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

function sameStringKeys(left: string[], right: readonly string[]) {
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

function normalizeNonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
}
