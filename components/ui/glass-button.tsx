"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";

function cn(...inputs: Array<string | undefined | null | false>) {
  return inputs.filter(Boolean).join(" ");
}

export const glassButtonVariants = cva(
  "glass-button relative isolate inline-flex cursor-pointer items-center rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      appearance: {
        default: "glass-button--default",
        nav: "glass-button--nav",
      },
      size: {
        default: "",
        sm: "",
        lg: "",
        icon: "",
      },
    },
    compoundVariants: [
      { appearance: "default", size: "default", class: "text-base font-medium" },
      { appearance: "default", size: "sm", class: "text-sm font-medium" },
      { appearance: "default", size: "lg", class: "text-lg font-medium" },
      { appearance: "default", size: "icon", class: "h-10 w-10 justify-center" },
      { appearance: "nav", size: "default", class: "w-full text-[13px]" },
      { appearance: "nav", size: "sm", class: "w-full text-[12px]" },
      { appearance: "nav", size: "lg", class: "w-full text-sm" },
      { appearance: "nav", size: "icon", class: "size-11 shrink-0 justify-center" },
    ],
    defaultVariants: {
      appearance: "default",
      size: "default",
    },
  },
);

export const glassButtonTextVariants = cva(
  "glass-button-text relative flex min-w-0 select-none items-center tracking-tight",
  {
    variants: {
      appearance: {
        default: "",
        nav: "min-h-11 w-full gap-2.5 px-2.5 py-0",
      },
      size: {
        default: "glass-button-text--default",
        sm: "glass-button-text--sm",
        lg: "glass-button-text--lg",
        icon: "justify-center p-0",
      },
    },
    defaultVariants: {
      appearance: "default",
      size: "default",
    },
  },
);

type GlassVariants = VariantProps<typeof glassButtonVariants>;

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, GlassVariants {
  contentClassName?: string;
}

export type GlassButtonLinkProps = Omit<
  React.ComponentPropsWithoutRef<typeof Link>,
  "className" | "children"
> &
  GlassVariants & {
    active?: boolean;
    children?: React.ReactNode;
    className?: string;
    contentClassName?: string;
  };

function appearanceValue(appearance: GlassVariants["appearance"]) {
  return appearance ?? "default";
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ appearance, size, className, contentClassName, children, ...props }, ref) => (
    <div
      className={cn("glass-button-wrap cursor-pointer rounded-full", className)}
      data-appearance={appearanceValue(appearance)}
    >
      <button
        {...props}
        ref={ref}
        data-glass-button="true"
        data-appearance={appearanceValue(appearance)}
        className={glassButtonVariants({ appearance, size })}
      >
        <span
          className={cn(
            glassButtonTextVariants({ appearance, size }),
            contentClassName,
          )}
        >
          {children}
        </span>
      </button>
      <span aria-hidden="true" className="glass-button-shadow rounded-full" />
    </div>
  ),
);
GlassButton.displayName = "GlassButton";

export const GlassButtonLink = React.forwardRef<
  HTMLAnchorElement,
  GlassButtonLinkProps
>(
  (
    {
      appearance,
      size,
      active = false,
      className,
      contentClassName,
      children,
      "aria-current": ariaCurrent,
      ...props
    },
    ref,
  ) => (
    <div
      className={cn("glass-button-wrap cursor-pointer rounded-full", className)}
      data-active={active ? "true" : undefined}
      data-appearance={appearanceValue(appearance)}
    >
      <Link
        {...props}
        ref={ref}
        aria-current={active ? "page" : ariaCurrent}
        data-glass-button="true"
        data-appearance={appearanceValue(appearance)}
        className={glassButtonVariants({ appearance, size })}
      >
        <span
          className={cn(
            glassButtonTextVariants({ appearance, size }),
            contentClassName,
          )}
        >
          {children}
        </span>
      </Link>
      <span aria-hidden="true" className="glass-button-shadow rounded-full" />
    </div>
  ),
);
GlassButtonLink.displayName = "GlassButtonLink";
