import type { MetricKey } from "@/lib/people/professions";

export function MetricCard({
  metricKey,
  label,
  value,
  compare,
  delta,
  tone,
  icon: Icon,
  visible,
  order,
}: {
  metricKey: MetricKey;
  label: string;
  value: string;
  compare?: string;
  delta?: string;
  tone: "purple" | "pink";
  icon: (props: { className?: string }) => React.ReactElement;
  visible: boolean;
  order: number;
}) {
  const toneClass =
    tone === "pink"
      ? {
          icon: "bg-warning-50 text-warning-700",
          badge: "bg-warning-50 text-warning-700",
        }
      : {
          icon: "bg-brand-100 text-brand-700",
          badge: "bg-brand-100 text-brand-800",
        };

  return (
    <article
      data-dashboard-metric={metricKey}
      className="enter relative min-h-[124px] overflow-hidden rounded-md border border-od-border bg-od-surface p-3 sm:min-h-[150px] sm:p-5"
      style={{ display: visible ? undefined : "none", order }}
    >
      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:text-left">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full sm:order-last sm:h-11 sm:w-11 ${toneClass.icon}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <div className="min-w-0">
          <p
            data-dashboard-metric-label={metricKey}
            className="text-xs font-semibold text-od-text-2 sm:text-sm"
          >
            {label}
          </p>
          <p className="text-safe mt-2 text-xl font-black leading-none tracking-[-0.03em] text-od-text sm:mt-3 sm:text-2xl">
            {value}
          </p>
        </div>
      </div>

      {(delta || compare) && (
        <div className="relative z-10 mt-3 hidden flex-wrap items-center gap-1.5 text-xs font-bold sm:mt-4 sm:flex sm:gap-2">
          {delta && <span className={`rounded-md px-2 py-1 ${toneClass.badge}`}>{delta}</span>}
          {compare && <span className="text-od-text-3">{compare}</span>}
        </div>
      )}
    </article>
  );
}
