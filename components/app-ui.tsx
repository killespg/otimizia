import type { ReactNode } from "react";

/**
 * Primitivas do design system "Noturno" (docs/design-system.md).
 * Server components: sem estado, sem handlers — só estrutura e classes.
 * Toda tela de app/(app)/ compõe a partir daqui pra manter uma linguagem só.
 */

type IconRenderer = (props: { className?: string }) => JSX.Element;

export function PageHeader({
  navigation,
  eyebrow,
  title,
  description,
  actions,
  className = "",
  children,
}: {
  navigation?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className={`page-head enter ${className}`.trim()}>
      <div className="min-w-0">
        {navigation && <div className="mb-3">{navigation}</div>}
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-desc">{description}</p>}
        {children}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

const STAT_TONES = {
  brand: "",
  success: "stat-card--success",
  warning: "stat-card--warning",
  danger: "stat-card--danger",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  className = "",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconRenderer;
  tone?: keyof typeof STAT_TONES;
  className?: string;
}) {
  return (
    <article className={`card stat-card ${STAT_TONES[tone]} ${className}`.trim()}>
      <div className="stat-top">
        <p className="stat-label">{label}</p>
        {Icon && (
          <span className="stat-icon" aria-hidden="true">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <div>
        <p className="stat-value">{value}</p>
        {hint && <p className="stat-hint">{hint}</p>}
      </div>
    </article>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  id,
  className = "",
  flush = false,
  tone = "default",
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  id?: string;
  className?: string;
  /** true = sem padding interno (tabelas coladas na borda). */
  flush?: boolean;
  tone?: "default" | "brand" | "danger";
  children: ReactNode;
}) {
  const hasHead = Boolean(title || description || actions);
  const toneClass = tone === "brand" ? "card--brand" : tone === "danger" ? "card--danger" : "";
  return (
    <section id={id} className={`card ${toneClass} ${flush ? "overflow-hidden" : "p-5"} ${className}`.trim()}>
      {hasHead && (
        <div className={flush ? "card-head mb-0 border-b border-line px-5 py-4" : "card-head"}>
          <div className="min-w-0">
            {title && <h2 className="card-title">{title}</h2>}
            {description && <p className="card-desc">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const TAG_TONES = {
  brand: "tag-brand",
  success: "bg-success-50 text-success-700",
  warning: "tag-honey",
  danger: "tag-danger",
  muted: "tag-muted",
} as const;

export function Tag({
  tone = "muted",
  className = "",
  children,
}: {
  tone?: keyof typeof TAG_TONES;
  className?: string;
  children: ReactNode;
}) {
  return <span className={`tag ${TAG_TONES[tone]} ${className}`.trim()}>{children}</span>;
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className = "",
}: {
  icon?: IconRenderer;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      {Icon && <Icon className="h-8 w-8" />}
      <p className="empty-state-title">{title}</p>
      {hint && <p className="empty-state-hint">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
