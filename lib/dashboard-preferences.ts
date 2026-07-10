import type { MetricKey, ProfessionPreset } from "@/lib/professions";

export const DASHBOARD_WIDGETS = [
  "metrics",
  "chart",
  "deals",
  "tasks",
  "assistant",
  "open_claims",
  "onboarding",
] as const;

export type DashboardWidgetKey = (typeof DASHBOARD_WIDGETS)[number];

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
];

export type DashboardPreferences = {
  style: DashboardStyle;
  accent: DashboardAccent;
  metrics: MetricKey[];
  metricLabels: Partial<Record<MetricKey, string>>;
  widgets: DashboardWidgetKey[];
};

export function getDashboardPreferences(
  value: unknown,
  preset: ProfessionPreset
): DashboardPreferences {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Partial<DashboardPreferences>)
    : {};
  const presetMetrics = preset.metrics.map((metric) => metric.key);

  return {
    style: isDashboardStyle(raw.style) ? raw.style : "glow",
    accent: isDashboardAccent(raw.accent) ? raw.accent : "purple",
    metrics: normalizeMetricKeys(raw.metrics, presetMetrics),
    metricLabels: normalizeMetricLabels(raw.metricLabels),
    widgets: normalizeWidgetKeys(raw.widgets),
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
