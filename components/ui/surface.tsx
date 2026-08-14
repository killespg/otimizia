import type { HTMLAttributes, ReactNode } from "react";

type SurfaceElement = "div" | "section" | "article" | "aside";

export type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: SurfaceElement;
  tone?: "primary" | "secondary" | "raised";
  children?: ReactNode;
};

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
}: HTMLAttributes<HTMLElement> & {
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
