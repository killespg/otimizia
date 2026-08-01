import Link from "next/link";
import { BrandName } from "@/components/design-system/BrandName";
import { CaptchaField } from "@/components/auth/CaptchaField";
import { PendingButton } from "@/components/ui/PendingButton";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { AuthPasswordField } from "@/components/auth/AuthPasswordField";
import { MIN_PASSWORD_LENGTH } from "@/lib/account/auth-constants";
import { PROFESSION_OPTIONS } from "@/lib/people/professions";
import { signup } from "../actions";
import { AuthShell, AuthField } from "../AuthShell";

export default async function SignupPage(
  props: {
    searchParams: Promise<{ error?: string; next?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return (
    <AuthShell
      title="Criar conta"
      subtitle="Comece a organizar suas vendas em poucos minutos."
      error={searchParams.error}
      footer={
        <>
          Já tem conta?{" "}
          <Link
            href={searchParams.next ? `/login?next=${encodeURIComponent(searchParams.next)}` : "/login"}
            className="nav-item inline-flex min-h-11 items-center font-black text-brand-700 hover:text-od-text"
          >
            Entrar
          </Link>
        </>
      }
    >
      <form action={signup} className="mt-6">
        {searchParams.next ? <input type="hidden" name="next" value={searchParams.next} /> : null}
        <div className="space-y-4">
          <AuthField
            name="name"
            label="Seu nome"
            maxLength={120}
            autoComplete="name"
          />
          <AuthField
            name="email"
            label="E-mail"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
          />
          <AuthPasswordField
            name="password"
            label="Senha"
            required
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={200}
            autoComplete="new-password"
          />
          <div>
            <label className="label" htmlFor="cpf">
              CPF
              <span className="ml-1 text-brand-700" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> obrigatório</span>
            </label>
            <input
              id="cpf"
              name="cpf"
              type="text"
              required
              inputMode="numeric"
              maxLength={14}
              placeholder="000.000.000-00"
              autoComplete="off"
              className="field mt-1.5"
            />
          </div>
        </div>
        <fieldset className="mt-7 space-y-2.5">
          <legend className="label">Em quais áreas você atua?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {PROFESSION_OPTIONS.map((option, index) => (
              <label
                key={option.value}
                className="flex min-h-11 items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-bold text-ink-soft"
              >
                <input
                  type="checkbox"
                  name="profession_types"
                  value={option.value}
                  defaultChecked={index === 0}
                  className="h-4 w-4 shrink-0 rounded border-line text-brand-700 focus:ring-brand-600"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-7 space-y-3">
          <label className="flex min-h-11 items-start gap-2.5 text-sm font-medium text-ink-soft">
            <input
              type="checkbox"
              name="terms_accepted"
              required
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-700 focus:ring-brand-600"
            />
            <span>
              Li e aceito os{" "}
              <Link
                href="/termos"
                target="_blank"
                className="nav-item inline-flex min-h-11 items-center font-black text-brand-700 hover:text-od-text"
              >
                Termos de Uso e o Contrato de Prestação de Serviço
              </Link>
              .
            </span>
          </label>
          <label className="flex min-h-11 items-start gap-2.5 rounded-lg border border-line bg-surface-2 p-3 text-sm font-medium text-ink-soft">
            <input
              type="checkbox"
              name="trial_notice_accepted"
              required
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-700 focus:ring-brand-600"
            />
            <span>
              Estou ciente de que o teste grátis dura 30 dias e que, depois disso,
              será necessário contratar um plano pago para continuar usando o{" "}
              <BrandName />.
            </span>
          </label>
        </div>
        <div className="mt-6">
          <CaptchaField />
        </div>
        <PendingButton className="btn btn-lg mt-8 w-full" pendingLabel="Criando">
          Criar conta grátis
        </PendingButton>
      </form>
      <SocialAuthButtons next={searchParams.next} />
    </AuthShell>
  );
}
