import type { HTMLAttributes, ReactNode } from "react";

export type MetricItem = {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
};

export function MetricBand({
  items,
  className = "",
  ...props
}: HTMLAttributes<HTMLDListElement> & { items: MetricItem[] }) {
  return (
    <dl {...props} className={`ui-metric-band ${className}`.trim()}>
      {items.map((item, index) => (
        <div className="ui-metric" key={index}>
          <dt className="ui-metric__label">{item.label}</dt>
          <dd className="ui-metric__value">{item.value}</dd>
          {item.detail ? (
            <dd className="ui-metric__detail">{item.detail}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export type StatusIntent =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export function Status({
  intent = "neutral",
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { intent?: StatusIntent }) {
  return (
    <span
      {...props}
      className={`ui-status ui-status--${intent} ${className}`.trim()}
    >
      <span className="ui-status__marker" aria-hidden="true" />
      {children}
    </span>
  );
}
