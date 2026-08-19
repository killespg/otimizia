import type { HTMLAttributes, ReactNode } from "react";

type SurfaceElement = "div" | "section" | "article" | "aside";

export type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: SurfaceElement;
  tone?: "primary" | "secondary" | "raised";
  children?: ReactNode;
};

export type PanelProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  count?: number;
  bodyClassName?: string;
};

export function Page({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      data-ui="page"
      className={`ui-page ${className}`.trim()}
    />
  );
}

export function PageZone({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      data-ui="page-zone"
      className={`ui-page__zone ${className}`.trim()}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
  ...props
}: Omit<HTMLAttributes<HTMLElement>, "title"> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header
      {...props}
      data-ui="page-header"
      className={`ui-page-header ${className}`.trim()}
    >
      <div className="ui-page-header__copy">
        {eyebrow ? <p className="ui-page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="ui-page-header__title">{title}</h1>
        {description ? <p className="ui-page-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </header>
  );
}

function Panel({
  kind,
  title,
  description,
  actions,
  count,
  bodyClassName = "",
  className = "",
  children,
  ...props
}: PanelProps & { kind: "data-panel" | "form-panel" }) {
  const hasHeader = title !== undefined || description !== undefined || actions !== undefined || count !== undefined;
  return (
    <section
      {...props}
      data-ui={kind}
      data-count={count}
      className={`ui-${kind} ${className}`.trim()}
    >
      {hasHeader ? (
        <header className={`ui-${kind}__header`}>
          <div className={`ui-${kind}__copy`}>
            {title !== undefined ? <h2 className={`ui-${kind}__title`}>{title}</h2> : null}
            {description !== undefined ? <p className={`ui-${kind}__description`}>{description}</p> : null}
          </div>
          {count !== undefined ? <span className={`ui-${kind}__count`}>{count}</span> : null}
          {actions !== undefined ? <div className={`ui-${kind}__actions`}>{actions}</div> : null}
        </header>
      ) : null}
      <div className={`ui-${kind}__body ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}

export function DataPanel(props: PanelProps) {
  return <Panel {...props} kind="data-panel" />;
}

export function FormPanel(props: PanelProps) {
  return <Panel {...props} kind="form-panel" />;
}

export function InsetGroup({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      data-ui="inset-group"
      className={`ui-inset-group ${className}`.trim()}
    />
  );
}

export function Surface({
  as: Element = "div",
  tone = "primary",
  className = "",
  children,
  ...props
}: SurfaceProps) {
  return (
    <Element
      {...props}
      data-ui="surface"
      data-tone={tone}
      className={`ui-surface ui-surface--${tone} ${className}`.trim()}
    >
      {children}
    </Element>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className = "",
  ...props
}: Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section {...props} className={`ui-section ${className}`.trim()}>
      <header className="ui-section__header">
        <div>
          <h2 className="ui-section__title">{title}</h2>
          {description ? (
            <p className="ui-section__description">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="ui-section__actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function Toolbar({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      role="toolbar"
      className={`ui-toolbar ${className}`.trim()}
    >
      {children}
    </div>
  );
}
