import type { ReactNode } from "react";

type FeedbackProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

function Feedback({
  kind,
  title,
  description,
  action,
}: FeedbackProps & { kind: "empty" | "error" | "permission" }) {
  return (
    <section
      className={`ui-feedback ui-feedback--${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="ui-feedback__action">{action}</div> : null}
    </section>
  );
}

export const EmptyState = (props: FeedbackProps) => (
  <Feedback {...props} kind="empty" />
);
export const ErrorState = (props: FeedbackProps) => (
  <Feedback {...props} kind="error" />
);
export const PermissionState = (props: FeedbackProps) => (
  <Feedback {...props} kind="permission" />
);
