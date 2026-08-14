"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PendingButton } from "@/components/ui/PendingButton";
import {
  ALL_DASHBOARD_METRICS,
  DASHBOARD_ACCENTS,
  DASHBOARD_STYLES,
  type DashboardAccent,
  type DashboardPreferences,
  type DashboardStyle,
  metricLabel,
} from "@/lib/workspace/dashboard-preferences";
import type { MetricKey, ProfessionPreset } from "@/lib/people/professions";
import { IconCheck, IconGrip } from "@/app/(dashboard)/painel/icons";

type DashboardPreferencesFormProps = {
  preferences: DashboardPreferences;
  preset: ProfessionPreset;
  compact?: boolean;
  returnTo?: string;
  action: (formData: FormData) => void | Promise<void>;
};

const STYLE_LABELS: Record<DashboardStyle, string> = {
  glow: "Padrão",
  clean: "Discreto",
  compact: "Compacto",
  executive: "Executivo escuro",
};

const STYLE_PREVIEWS: Record<DashboardStyle, string> = {
  glow: "border-od-accent bg-od-accent-tint text-od-text",
  clean: "border-od-border bg-od-surface text-od-text",
  compact: "border-od-border bg-od-muted-surface text-od-text-2",
  executive: "border-od-border-strong bg-od-bg text-od-text",
};

const SELLER_STYLE_LABELS: Record<DashboardStyle, string> = {
  glow: "Padrão",
  clean: "Escuro limpo",
  compact: "Compacto",
  executive: "Executivo",
};

const SELLER_STYLE_PREVIEWS: Record<DashboardStyle, string> = {
  glow: "border-od-accent bg-od-accent-tint text-od-text",
  clean: "border-od-border bg-od-surface text-od-text",
  compact: "border-od-border bg-od-muted-surface text-od-text-2",
  executive: "border-od-border-strong bg-od-bg text-od-text",
};

const ACCENT_LABELS: Record<DashboardAccent, string> = {
  purple: "Cobalto",
  violet: "Azul suave",
  cyan: "Azul claro",
  pink: "Azul profundo",
};

export function DashboardPreferencesForm({
  preferences,
  preset,
  compact = false,
  returnTo = "/painel",
  action,
}: DashboardPreferencesFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [style, setStyle] = useState(preferences.style);
  const [accent, setAccent] = useState(preferences.accent);
  const [metrics, setMetrics] = useState(preferences.metrics);
  const [metricLabels, setMetricLabels] = useState(preferences.metricLabels);
  const [salesMarketingCost, setSalesMarketingCost] = useState(
    preferences.salesMarketingCostCents
      ? (preferences.salesMarketingCostCents / 100).toFixed(2).replace(".", ",")
      : "",
  );
  const [draggingMetric, setDraggingMetric] = useState<MetricKey | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [section, setSection] = useState<"appearance" | "metrics">("appearance");
  const shouldReduceMotion = useReducedMotion();
  const isSeller = preset.key === "autonomous_seller";
  const panelTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const };

  const availableMetrics = useMemo(
    () =>
      ALL_DASHBOARD_METRICS
        .filter((metric) => isSeller || metric.key !== "commission_open")
        .map((metric) => ({
          ...metric,
          label: metricLabel(metric.key, preset, preferences),
        })),
    [isSeller, preferences, preset]
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
          router.push(returnTo === "/painel/configuracoes" ? "/painel?customized=1" : returnTo);
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

  function handleSectionKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const sections = ["appearance", "metrics"] as const;
    const currentIndex = sections.indexOf(section);
    const nextSection = event.key === "Home"
      ? sections[0]
      : event.key === "End"
        ? sections[sections.length - 1]
        : event.key === "ArrowRight"
          ? sections[(currentIndex + 1) % sections.length]
          : sections[(currentIndex - 1 + sections.length) % sections.length];

    setSection(nextSection);
    event.currentTarget
      .querySelector<HTMLButtonElement>(`#dashboard-preferences-${nextSection}-tab`)
      ?.focus();
  }

  return (
    <form ref={formRef} action={submitPreferences} className={isSeller ? "seller-dashboard-preferences space-y-5" : "space-y-4"}>
      <input type="hidden" name="dashboard_style" value={style} />
      <input type="hidden" name="dashboard_accent" value={accent} />
      <input type="hidden" name="return_to" value={returnTo} />
      <input type="hidden" name="sales_marketing_cost" value={salesMarketingCost} />
      <input
        type="hidden"
        name="dashboard_animated_background"
        value="0"
      />
      {metrics.map((metric) => (
        <input key={metric} type="hidden" name="dashboard_metrics" value={metric} />
      ))}

      <div
        className="grid grid-cols-2 gap-1 rounded-inner border border-od-border bg-od-muted-surface p-1"
        role="tablist"
        aria-label="Seções da personalização"
        onKeyDown={handleSectionKeyDown}
      >
        <button
          id="dashboard-preferences-appearance-tab"
          type="button"
          role="tab"
          aria-selected={section === "appearance"}
          aria-controls="dashboard-preferences-appearance-panel"
          tabIndex={section === "appearance" ? 0 : -1}
          onClick={() => setSection("appearance")}
          className={`min-h-11 rounded-control px-3 text-xs font-semibold transition-colors ${section === "appearance" ? "bg-od-surface text-od-text" : "text-od-text-3 hover:bg-od-surface-hover hover:text-od-text"}`}
        >
          Aparência
        </button>
        <button
          id="dashboard-preferences-metrics-tab"
          type="button"
          role="tab"
          aria-selected={section === "metrics"}
          aria-controls="dashboard-preferences-metrics-panel"
          tabIndex={section === "metrics" ? 0 : -1}
          onClick={() => setSection("metrics")}
          className={`min-h-11 rounded-control px-3 text-xs font-semibold transition-colors ${section === "metrics" ? "bg-od-surface text-od-text" : "text-od-text-3 hover:bg-od-surface-hover hover:text-od-text"}`}
        >
          Estatísticas <span className="ml-1 text-od-text-3">{metrics.length}/8</span>
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
      {section === "appearance" && <motion.div
        key="appearance"
        id="dashboard-preferences-appearance-panel"
        className="grid gap-4 lg:grid-cols-2"
        role="tabpanel"
        aria-labelledby="dashboard-preferences-appearance-tab"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
        transition={panelTransition}
      >
        <Panel title="Estilo" description="A cara do painel, sem mexer nos dados." seller={isSeller}>
          <div className="grid gap-2 sm:grid-cols-2">
            {DASHBOARD_STYLES.map((item) => (
              <OptionButton
                key={item}
                active={style === item}
                label={(isSeller ? SELLER_STYLE_LABELS : STYLE_LABELS)[item]}
                previewClassName={(isSeller ? SELLER_STYLE_PREVIEWS : STYLE_PREVIEWS)[item]}
                onClick={() => setStyle(item)}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Cor de destaque" description="Um toque visual para seu espaço de trabalho." seller={isSeller}>
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

      </motion.div>}


      {section === "metrics" && <motion.div
        key="metrics"
        id="dashboard-preferences-metrics-panel"
        role="tabpanel"
        aria-labelledby="dashboard-preferences-metrics-tab"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
        transition={panelTransition}
      ><Panel
        title="Estatísticas"
        description="Escolha até 8 métricas, arraste a ordem e personalize os nomes."
        seller={isSeller}
      >
        {isSeller ? (
          <div className="mb-4 flex flex-col gap-3 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-md">
              <p className="text-sm font-semibold text-white/78">Custo mensal de vendas e marketing</p>
              <p className="mt-1 text-xs leading-relaxed text-od-text-3">Usado para calcular o CAC. Inclua anúncios, ferramentas e comissões comerciais do mês.</p>
            </div>
            <label className="block w-full sm:w-52">
              <span className="sr-only">Custo mensal de vendas e marketing</span>
              <span className="flex h-11 items-center rounded-control border border-od-border bg-od-muted-surface px-3 focus-within:border-od-focus">
                <span className="mr-2 text-sm text-od-text-3">R$</span>
                <input
                  value={salesMarketingCost}
                  onChange={(event) => setSalesMarketingCost(event.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-white outline-none placeholder:text-od-text-3"
                />
              </span>
            </label>
          </div>
        ) : null}
        <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
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
                className={isSeller
                  ? `rounded-md border p-3 transition-colors ${active ? "border-od-accent/35 bg-od-accent/[0.07]" : "border-white/[0.08] bg-white/[0.018]"}`
                  : "rounded-lg border p-3 transition " + (active ? "border-brand-300 bg-brand-50/70 dark:border-brand-800 dark:bg-brand-950/50" : "border-line bg-surface")}
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
                        ? isSeller ? "border-od-accent bg-od-accent text-white" : "border-brand-600 bg-brand-700 text-white"
                        : isSeller ? "border-white/[0.12] bg-transparent text-transparent" : "border-line bg-white text-transparent")
                    }
                  >
                    <IconCheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={isSeller ? "flex items-center gap-1.5 text-sm font-semibold text-white/78" : "flex items-center gap-1.5 text-sm font-black text-ink"}>
                      {active && <IconGrip className={isSeller ? "h-4 w-4 shrink-0 text-od-text-2" : "h-4 w-4 shrink-0 text-ink-muted"} />}
                      {label}
                    </span>
                    <span className={isSeller ? "mt-0.5 block text-xs text-od-text-3" : "mt-0.5 block text-xs font-semibold text-ink-muted"}>
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
                  className={isSeller ? "mt-2 h-10 w-full rounded-control border border-od-border bg-od-muted-surface px-3 text-sm text-od-text outline-none placeholder:text-od-text-3 focus:border-od-focus" : "field mt-2 h-9 text-sm"}
                />
                {active && (
                    <MobileOrderButtons
                      seller={isSeller}
                    onMoveUp={() => setMetrics((current) => moveBy(current, key, -1))}
                    onMoveDown={() => setMetrics((current) => moveBy(current, key, 1))}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Panel></motion.div>}
      </AnimatePresence>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className={isSeller ? "text-xs text-od-text-3" : "text-xs font-semibold text-ink-muted"}>
          {saveStatus === "saved"
            ? "Personalização salva."
            : saveStatus === "error"
              ? "Não deu para salvar. Tente novamente."
              : returnTo === "/painel/configuracoes"
                ? "Ao salvar, você vai direto ao painel para conferir o resultado."
                : "As mudanças aparecem no painel antes de você salvar."}
        </p>
        <PendingButton
          className={isSeller ? "inline-flex min-h-11 items-center justify-center rounded-control bg-od-accent px-4 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50" : compact ? "btn-soft" : "btn"}
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
  seller = false,
  className = "",
  children,
}: {
  title: string;
  description: string;
  seller?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section data-preferences-panel className={`${seller ? "rounded-panel border border-white/[0.08] bg-white/[0.018] p-4" : "rounded-panel border border-line bg-surface p-3 sm:p-4"} ${className}`}>
      <div className="mb-3">
        <h3 className={seller ? "text-sm font-semibold text-white" : "text-sm font-black text-ink"}>{title}</h3>
        <p className={seller ? "mt-1 text-xs leading-relaxed text-od-text-3" : "mt-0.5 text-xs font-semibold leading-relaxed text-ink-muted"}>{description}</p>
      </div>
      {children}
    </section>
  );
}

function OptionButton({
  active,
  label,
  swatch,
  previewClassName,
  onClick,
}: {
  active: boolean;
  label: string;
  swatch?: string;
  previewClassName?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "flex min-h-11 items-center gap-2 rounded-control border px-3 py-2 text-left text-sm font-black transition-colors focus-visible:ring-2 focus-visible:ring-brand-600 " +
        (previewClassName ?? "border-od-border bg-od-muted-surface text-od-text-2 hover:border-od-border-hover hover:text-od-text") +
        (active ? " ring-2 ring-od-focus ring-offset-1 ring-offset-od-bg" : " opacity-80 hover:opacity-100")
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
  seller = false,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  seller?: boolean;
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
      <button type="button" onClick={onMoveUp} className={seller ? "min-h-11 rounded-control border border-white/[0.09] px-2 text-xs font-semibold text-white/58" : "min-h-11 rounded-control border border-line bg-surface px-2 text-xs font-black text-ink-soft"}>
        Subir
      </button>
      <button type="button" onClick={onMoveDown} className={seller ? "min-h-11 rounded-control border border-white/[0.09] px-2 text-xs font-semibold text-white/58" : "min-h-11 rounded-control border border-line bg-surface px-2 text-xs font-black text-ink-soft"}>
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
