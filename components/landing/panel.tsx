import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Opt-in surface for genuinely independent units: white/dark surface,
 * 1px border, 6px radius and no default shadow. Page sections, tables and
 * lists should prefer shared dividers instead of reaching for Panel.
 */
export function Panel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-od-border bg-od-surface",
        className
      )}
      {...props}
    />
  );
}
