import Link from "next/link";
import type { InputHTMLAttributes } from "react";
import {
  AlertCircle,
  CalendarCheck2,
  Check,
  ContactRound,
  Sparkles,
} from "lucide-react";
import { LogoWordmark } from "@/components/design-system/logo";
import { Input } from "@/components/ui/form-controls";

const AUTH_FEATURES = [
  [
    ContactRound,
    "Clientes organizados",
    "Histórico completo e próximos passos sempre disponíveis.",
  ],
  [
    Sparkles,
    "Tim, seu assistente de IA",
    "Responde no WhatsApp e sinaliza o momento certo de agir.",
  ],
  [
    CalendarCheck2,
    "Lembretes no momento certo",
    "Você sempre terá noção clara dos seus vencimentos.",
  ],
] as const;

export function AuthShell({
  title,
  subtitle,
  error,
  notice,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  error?: string;
  notice?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main
      className="grid min-h-[100dvh] place-items-center bg-od-bg p-3 sm:p-5"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto grid min-h-[min(720px,calc(100dvh-2.5rem))] w-full max-w-5xl overflow-hidden rounded-[var(--radius-panel)] border border-od-border bg-od-surface lg:grid-cols-[1fr_.92fr]">
        <section className="hidden flex-col justify-between border-r border-od-border bg-od-sidebar p-10 lg:flex">
          <div>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] focus-visible:ring-2 focus-visible:ring-od-accent"
            >
              <LogoWordmark height={32} />
            </Link>
            <h2 className="mt-16 max-w-lg text-[34px] font-bold leading-[1.14] tracking-[-0.025em] text-od-text">
              A IA que atende seu WhatsApp e organiza toda a operação do seu
              negócio.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-od-text-2">
              Cada profissão tem um painel dedicado, com telas específicas e o
              apoio constante do Tim. Funciona para vendedor autônomo, advogado
              e corretor de imóveis.
            </p>
          </div>
          <div className="border-y border-od-border">
            {AUTH_FEATURES.map(([FeatureIcon, label, description]) => (
              <div
                key={label}
                className="flex gap-4 border-t border-od-border py-5 first:border-t-0"
              >
                <FeatureIcon
                  size={18}
                  className="mt-0.5 shrink-0 text-od-accent-soft"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-semibold text-od-text">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-od-text-3">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-0 overflow-y-auto bg-od-surface px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
          <div className="m-auto w-full max-w-md">
            <div className="mb-6 flex justify-center lg:hidden">
              <Link
                href="/"
                aria-label="OtimizIA, início"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] focus-visible:ring-2 focus-visible:ring-od-accent"
              >
                <LogoWordmark height={30} />
              </Link>
            </div>
            <h1 className="text-center text-[28px] font-bold tracking-[-0.02em] text-od-text lg:text-left">
              {title}
            </h1>
            <p className="mx-auto mt-2 max-w-[65ch] text-center text-sm leading-6 text-od-text-2 lg:mx-0 lg:text-left">
              {subtitle}
            </p>

            {error ? (
              <div
                role="alert"
                className="mt-5 flex items-start gap-3 rounded-[var(--radius-control)] border border-danger-200 bg-danger-50 p-3 text-sm text-danger-600"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            {notice ? (
              <div
                role="status"
                className="mt-5 flex items-start gap-3 rounded-[var(--radius-control)] border border-success-200 bg-success-50 p-3 text-sm text-success-600"
              >
                <Check size={17} className="mt-0.5 shrink-0" />
                <span>{notice}</span>
              </div>
            ) : null}

            {children}
            <p className="mt-7 border-t border-od-border pt-5 text-center text-sm text-od-text-2 lg:text-left">
              {footer}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthField({
  label,
  name,
  required,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <Input
      {...props}
      id={name}
      name={name}
      required={required}
      label={
        <>
          {label}
          {required ? <span className="sr-only"> obrigatório</span> : null}
        </>
      }
      className={className}
    />
  );
}
