import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IconAlert, IconBell, IconBot, IconColumns } from "../(app)/icons";

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
    <main className="min-h-[100dvh] bg-[linear-gradient(135deg,#b518ff_0%,#5c22e8_43%,#0bbfe8_100%)] p-2 sm:p-5 md:p-6">
      <div className="relative mx-auto grid min-h-[calc(100dvh-1rem)] max-w-6xl overflow-hidden rounded-2xl bg-white shadow-[0_32px_90px_-42px_rgba(7,8,28,0.85)] md:min-h-[calc(100dvh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <ThemeToggle compact className="absolute right-4 top-4 z-20" />

        <section className="hidden bg-[#f8fbff] p-8 lg:block">
          <Link href="/" className="nav-item inline-flex items-center rounded-md">
            <Image
              src="/otimizia-logo.png"
              alt="OtimizIA"
              width={206}
              height={60}
              priority
              sizes="206px"
              className="h-10 w-auto dark:hidden"
            />
            <Image
              src="/otimizia-logo-dark.png"
              alt="OtimizIA"
              width={216}
              height={61}
              priority
              sizes="216px"
              className="hidden h-10 w-auto dark:block"
            />
          </Link>

          <div className="mt-16 max-w-xl">
            <p className="text-sm font-black text-brand-700">CRM com IA</p>
            <h2 className="mt-4 text-[clamp(2.5rem,6vw,4.5rem)] font-black leading-[0.94] tracking-[-0.04em] text-ink">
              Sua rotina de vendas em ordem.
            </h2>
            <p className="mt-5 max-w-md text-base font-medium leading-relaxed text-ink-soft">
              Entre para ver clientes para chamar, vendas abertas e lembretes em
              uma tela simples.
            </p>
          </div>

          <div className="mt-12 grid max-w-xl gap-3">
            <PreviewItem icon={IconBell} title="Fila do dia" body="Quem precisa de resposta aparece primeiro." />
            <PreviewItem icon={IconColumns} title="Vendas abertas" body="Etapas claras para cada negócio." />
            <PreviewItem icon={IconBot} title="Agente IA" body="Ajuda para resumir e decidir o próximo passo." />
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="hero-rise w-full max-w-[420px]">
            <Link
              href="/"
              className="nav-item mx-auto mb-8 flex w-max items-center gap-2.5 hover:opacity-80 lg:hidden"
            >
              <Image
                src="/otimizia-logo.png"
                alt="OtimizIA"
                width={204}
                height={60}
                priority
                sizes="204px"
                className="h-10 w-auto dark:hidden"
              />
              <Image
                src="/otimizia-logo-dark.png"
                alt="OtimizIA"
                width={216}
                height={61}
                priority
                sizes="216px"
                className="hidden h-10 w-auto dark:block"
              />
            </Link>

            <div className="panel overflow-hidden">
              <div className="border-b border-line px-6 pb-5 pt-6 sm:px-8">
                <h1 className="text-3xl font-black tracking-[-0.03em] text-ink">
                  {title}
                </h1>
                <p className="mt-2 text-sm font-medium text-ink-soft">{subtitle}</p>
              </div>

              <div className="px-6 py-6 sm:px-8">
                {error && (
                  <div className="mb-5 flex items-start gap-2 rounded-md border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm font-bold text-danger-700">
                    <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0 text-safe">{error}</span>
                  </div>
                )}

                {children}
              </div>

              <div className="border-t border-line bg-[#f8fbff] px-6 py-4 text-center text-sm font-medium text-ink-soft sm:px-8">
                {footer}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function PreviewItem({
  icon: Icon,
  title,
  body,
}: {
  icon: (props: { className?: string }) => JSX.Element;
  title: string;
  body: string;
}) {
  return (
    <article className="flex items-start gap-3 rounded-lg border border-line bg-white p-4 shadow-[0_18px_44px_-34px_rgba(21,19,46,0.72)]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="text-sm font-black text-ink">{title}</h3>
        <p className="mt-1 text-sm font-medium leading-relaxed text-ink-muted">
          {body}
        </p>
      </div>
    </article>
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
        {required && (
          <>
            <span className="ml-1 text-brand-700" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> obrigatório</span>
          </>
        )}
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
