import Link from "next/link";
import { BrandName } from "@/components/BrandName";
import { CaptchaField } from "@/components/CaptchaField";
import { PendingButton } from "@/components/PendingButton";
import { PROFESSION_OPTIONS } from "@/lib/professions";
import { signup } from "../actions";
import { AuthShell, AuthField } from "../AuthShell";

export default async function SignupPage(
  props: {
    searchParams: Promise<{ error?: string }>;
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
            href="/login"
            className="nav-item font-black text-brand-700 hover:text-od-text"
          >
            Entrar
          </Link>
        </>
      }
    >
      <form action={signup} className="mt-6 space-y-4">
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
        <AuthField
          name="password"
          label="Senha"
          type="password"
          required
          minLength={6}
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
        <fieldset className="space-y-2">
          <legend className="label">Em quais áreas você atua?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
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
        <label className="flex items-start gap-2.5 text-sm font-medium text-ink-soft">
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
              className="nav-item font-black text-brand-700 hover:text-od-text"
            >
              Termos de Uso e o Contrato de Prestação de Serviço
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 p-3 text-sm font-medium text-ink-soft">
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
        <CaptchaField />
        <PendingButton className="btn w-full py-3 text-base" pendingLabel="Criando">
          Criar conta grátis
        </PendingButton>
      </form>
    </AuthShell>
  );
}
