"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import {
  ALL_DASHBOARD_METRICS,
  DASHBOARD_ACCENTS,
  DASHBOARD_STYLES,
  type DashboardAccent,
  type DashboardPreferences,
  type DashboardStyle,
  metricLabel,
} from "@/lib/dashboard-preferences";
import type { MetricKey, ProfessionPreset } from "@/lib/professions";
import { IconCheck, IconGrip } from "@/app/(app)/icons";

type DashboardPreferencesFormProps = {
  preferences: DashboardPreferences;
  preset: ProfessionPreset;
  compact?: boolean;
  returnTo?: string;
  action: (formData: FormData) => void | Promise<void>;
};

const STYLE_LABELS: Record<DashboardStyle, string> = {
  glow: "Roxo iluminado",
  clean: "Claro e limpo",
  compact: "Compacto",
  executive: "Executivo escuro",
};

const ACCENT_LABELS: Record<DashboardAccent, string> = {
  purple: "Roxo OtimizIA",
  violet: "Violeta",
  cyan: "Ciano",
  pink: "Magenta",
};

export function DashboardPreferencesForm({
  preferences,
  preset,
  compact = false,
  returnTo = "/dashboard",
  action,
}: DashboardPreferencesFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [style, setStyle] = useState(preferences.style);
  const [accent, setAccent] = useState(preferences.accent);
  const [metrics, setMetrics] = useState(preferences.metrics);
  const [metricLabels, setMetricLabels] = useState(preferences.metricLabels);
  const [draggingMetric, setDraggingMetric] = useState<MetricKey | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const availableMetrics = useMemo(
    () =>
      ALL_DASHBOARD_METRICS.map((metric) => ({
        ...metric,
        label: metricLabel(metric.key, preset, preferences),
      })),
    [preferences, preset]
  );

  useEffect(() => {
    const board = formRef.current?.closest(".dashboard-board");
    if (!board) return;
    board.classList.remove(
      ...DASHBOARD_STYLES.map((item) => `dashboard-board-${item}`),
      ...DASHBOARD_ACCENTS.map((item) => `dashboard-accent-${item}`)
    );
    board.classList.add(`dashboard-board-${style}`, `dashboard-accent-${accent}`);


    ALL_DASHBOARD_METRICS.forEach(({ key, fallbackLabel }) => {
      const element = board.querySelector<HTMLElement>(`[data-dashboard-metric="${key}"]`);
      if (!element) return;
      const index = metrics.indexOf(key);
      element.style.display = index >= 0 ? "" : "none";
      element.style.order = String(index >= 0 ? index : 99);

      const labelElement = board.querySelector<HTMLElement>(`[data-dashboard-metric-label="${key}"]`);
      if (labelElement) {
        labelElement.textContent =
          cleanLabel(metricLabels[key]) ||
          preset.metrics.find((metric) => metric.key === key)?.label ||
          fallbackLabel;
      }
    });
  }, [accent, metricLabels, metrics, preset, style]);

  function submitPreferences(formData: FormData) {
    setSaveStatus("idle");
    startSaving(() => {
      void (async () => {
        try {
          await action(formData);
          setSaveStatus("saved");
          router.refresh();
        } catch {
          setSaveStatus("error");
        }
      })();
    });
  }

  function toggleMetric(metric: MetricKey) {
    setMetrics((current) => {
      if (current.includes(metric)) return current.filter((item) => item !== metric);
      if (current.length >= 8) return current;
      return [...current, metric];
    });
  }

  function moveMetric(from: MetricKey, to: MetricKey) {
    setMetrics((current) => reorder(current, from, to));
  }

  return (
    <form ref={formRef} action={submitPreferences} className="space-y-5">
      <input type="hidden" name="dashboard_style" value={style} />
      <input type="hidden" name="dashboard_accent" value={accent} />
      <input type="hidden" name="return_to" value={returnTo} />
      {metrics.map((metric) => (
        <input key={metric} type="hidden" name="dashboard_metrics" value={metric} />
      ))}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Estilo" description="A cara do painel, sem mexer nos dados.">
          <div className="grid gap-2 sm:grid-cols-2">
            {DASHBOARD_STYLES.map((item) => (
              <OptionButton
                key={item}
                active={style === item}
                label={STYLE_LABELS[item]}
                onClick={() => setStyle(item)}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Cor de destaque" description="Um toque visual para seu espaço de trabalho.">
          <div className="grid gap-2 sm:grid-cols-2">
            {DASHBOARD_ACCENTS.map((item) => (
              <OptionButton
                key={item}
                active={accent === item}
                label={ACCENT_LABELS[item]}
                swatch={`dashboard-swatch-${item}`}
                onClick={() => setAccent(item)}
              />
            ))}
          </div>
        </Panel>
      </div>


      <Panel
        title="Estatísticas"
        description="Escolha até 8 métricas, arraste a ordem e personalize os nomes."
      >
        <div className="grid gap-2 lg:grid-cols-3">
          {availableMetrics.map(({ key, fallbackLabel, label }) => {
            const active = metrics.includes(key);
            return (
              <div
                key={key}
                draggable={active}
                onDragStart={() => setDraggingMetric(key)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggingMetric && draggingMetric !== key) moveMetric(draggingMetric, key);
                  setDraggingMetric(null);
                }}
                className={
                  "rounded-lg border p-3 transition " +
                  (active
                    ? "border-brand-300 bg-brand-50/70 dark:border-brand-800 dark:bg-brand-950/50"
                    : "border-line bg-surface")
                }
              >
                <button
                  type="button"
                  onClick={() => toggleMetric(key)}
                  className="flex w-full items-start gap-2 text-left"
                >
                  <span
                    className={
                      "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border " +
                      (active
                        ? "border-brand-600 bg-brand-700 text-white"
                        : "border-line bg-white text-transparent")
                    }
                  >
                    <IconCheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-black text-ink">
                      {active && <IconGrip className="h-4 w-4 shrink-0 text-ink-muted" />}
                      {label}
                    </span>
                    <span className="mt-0.5 block text-xs font-semibold text-ink-muted">
                      {active ? "Ativa no painel" : "Disponível"}
                    </span>
                  </span>
                </button>
                <input
                  name={`metric_label_${key}`}
                  value={metricLabels[key] ?? ""}
                  onChange={(event) =>
                    setMetricLabels((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  placeholder={preset.metrics.find((metric) => metric.key === key)?.label ?? fallbackLabel}
                  maxLength={42}
                  className="field mt-2 h-9 text-sm"
                />
                {active && (
                  <MobileOrderButtons
                    onMoveUp={() => setMetrics((current) => moveBy(current, key, -1))}
                    onMoveDown={() => setMetrics((current) => moveBy(current, key, 1))}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-ink-muted">
          {saveStatus === "saved"
            ? "Personalização salva."
            : saveStatus === "error"
              ? "Não deu para salvar. Tente novamente."
              : "Arraste os widgets direto no painel. Aqui ficam só estilo e estatísticas."}
        </p>
        <PendingButton
          className={compact ? "btn-soft" : "btn"}
          disabled={isSaving}
          pendingLabel="Salvando"
        >
          {isSaving ? "Salvando" : "Salvar personalização"}
        </PendingButton>
      </div>
    </form>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-3 sm:p-4">
      <div className="mb-3">
        <h3 className="text-sm font-black text-ink">{title}</h3>
        <p className="mt-0.5 text-xs font-semibold leading-relaxed text-ink-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function OptionButton({
  active,
  label,
  swatch,
  onClick,
}: {
  active: boolean;
  label: string;
  swatch?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-black transition " +
        (active
          ? "border-brand-400 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-950/70 dark:text-brand-100"
          : "border-line bg-white text-ink-soft hover:border-brand-300 hover:text-ink dark:bg-[#151426]")
      }
    >
      {swatch && <span className={`h-4 w-4 rounded-full ${swatch}`} />}
      {label}
    </button>
  );
}

function MobileOrderButtons({
  onMoveUp,
  onMoveDown,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
      <button type="button" onClick={onMoveUp} className="rounded-md border border-line bg-white px-2 py-1.5 text-xs font-black text-ink-soft">
        Subir
      </button>
      <button type="button" onClick={onMoveDown} className="rounded-md border border-line bg-white px-2 py-1.5 text-xs font-black text-ink-soft">
        Descer
      </button>
    </div>
  );
}

function reorder<T extends string>(items: T[], from: T, to: T) {
  const next = [...items];
  const fromIndex = next.indexOf(from);
  const toIndex = next.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) return items;
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, from);
  return next;
}

function moveBy<T extends string>(items: T[], item: T, delta: number) {
  const next = [...items];
  const index = next.indexOf(item);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= next.length) return items;
  next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

function cleanLabel(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 42);
}
