import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

type FieldChromeProps = {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
};

function FieldChrome({
  id,
  label,
  description,
  error,
  children,
  className = "",
}: FieldChromeProps) {
  return (
    <div className={`ui-field ${className}`.trim()}>
      <label className="ui-field__label" htmlFor={id}>
        {label}
      </label>
      {description ? (
        <p className="ui-field__description" id={`${id}-description`}>
          {description}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="ui-field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type CommonFieldProps = {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
};

function descriptions(id: string, description?: ReactNode, error?: ReactNode) {
  return [description ? `${id}-description` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ") || undefined;
}

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> &
  CommonFieldProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id: suppliedId,
    label,
    description,
    error,
    className = "",
    fieldClassName,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const id = suppliedId || `field-${generatedId.replace(/:/g, "")}`;
  return (
    <FieldChrome
      id={id}
      label={label}
      description={description}
      error={error}
      className={fieldClassName}
    >
      <input
        {...props}
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={descriptions(id, description, error)}
        className={`ui-control ${className}`.trim()}
      />
    </FieldChrome>
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  CommonFieldProps;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      id: suppliedId,
      label,
      description,
      error,
      className = "",
      fieldClassName,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const id = suppliedId || `field-${generatedId.replace(/:/g, "")}`;
    return (
      <FieldChrome
        id={id}
        label={label}
        description={description}
        error={error}
        className={fieldClassName}
      >
        <textarea
          {...props}
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptions(id, description, error)}
          className={`ui-control ui-control--textarea ${className}`.trim()}
        />
      </FieldChrome>
    );
  },
);

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  CommonFieldProps;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      id: suppliedId,
      label,
      description,
      error,
      className = "",
      fieldClassName,
      children,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const id = suppliedId || `field-${generatedId.replace(/:/g, "")}`;
    return (
      <FieldChrome
        id={id}
        label={label}
        description={description}
        error={error}
        className={fieldClassName}
      >
        <select
          {...props}
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptions(id, description, error)}
          className={`ui-control ui-control--select ${className}`.trim()}
        >
          {children}
        </select>
      </FieldChrome>
    );
  },
);
