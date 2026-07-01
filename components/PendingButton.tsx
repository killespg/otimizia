"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type PendingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
  iconOnly?: boolean;
  pendingChildren?: ReactNode;
};

export function PendingButton({
  children,
  className = "",
  disabled,
  pendingLabel = "Carregando",
  pendingChildren,
  iconOnly = false,
  type = "submit",
  ...props
}: PendingButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={pending || undefined}
      className={`relative ${className}`}
    >
      <span
        className={
          "inline-flex items-center justify-center gap-2 " +
          (pending ? "invisible" : "")
        }
      >
        {children}
      </span>
      {pending && (
        <span
          className="absolute inset-0 flex items-center justify-center gap-2"
          aria-live="polite"
        >
          {pendingChildren ?? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                aria-hidden="true"
              />
              <span className={iconOnly ? "sr-only" : undefined}>
                {pendingLabel}
              </span>
            </>
          )}
        </span>
      )}
    </button>
  );
}
