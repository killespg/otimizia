import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export type ButtonIntent = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  intent?: ButtonIntent;
  size?: ButtonSize;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className = "",
      intent = "secondary",
      size = "md",
      loading = false,
      disabled,
      type = "button",
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        {...props}
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={`ui-button ui-button--${intent} ui-button--${size} ${className}`.trim()}
      >
        {children}
      </button>
    );
  },
);

export type IconButtonProps = Omit<ButtonProps, "aria-label"> & {
  label: string;
  children?: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, className = "", children, ...props }, ref) {
    return (
      <Button
        {...props}
        ref={ref}
        aria-label={label}
        className={`ui-icon-button ${className}`.trim()}
      >
        {children}
      </Button>
    );
  },
);
