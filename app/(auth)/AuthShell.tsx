import Link from "next/link";
import Image from "next/image";
import { IconAlert } from "../(app)/icons";

export function AuthShell({
  title,
  subtitle,
  error,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  error?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4 py-10">
      <div className="hero-rise w-full max-w-sm">
        <Link
          href="/"
          className="nav-item mx-auto mb-7 flex w-max items-center gap-2.5 hover:opacity-80"
        >
          <Image
            src="/otimizia-logo.png"
            alt="OtimizIA"
            width={204}
            height={60}
            priority
            sizes="204px"
            className="h-10 w-auto"
          />
        </Link>

        <div className="border border-t-2 border-line border-t-brand-700 bg-surface">
          <div className="border-b border-line px-7 pb-5 pt-6 sm:px-8">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>
          </div>

          <div className="px-7 py-6 sm:px-8">
            {error && (
              <div className="mb-5 flex items-start gap-2 rounded-sm border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm font-medium text-danger-700">
                <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 text-safe">{error}</span>
              </div>
            )}

            {children}
          </div>

          <div className="border-t border-line px-7 py-4 text-center text-sm text-ink-soft sm:px-8">
            {footer}
          </div>
        </div>
      </div>
    </main>
  );
}

export function AuthField({
  name,
  label,
  type = "text",
  required = false,
  minLength,
  autoComplete,
  maxLength,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className="field mt-1.5"
      />
    </div>
  );
}
