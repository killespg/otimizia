import Link from "next/link";
import { PendingButton } from "@/components/PendingButton";
import { PROFESSION_OPTIONS } from "@/lib/professions";
import { signup } from "../actions";
import { AuthShell, AuthField } from "../AuthShell";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
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
            className="nav-item font-black text-brand-700 hover:text-brand-900"
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
        <label className="block">
          <span className="label">Qual perfil combina mais com você?</span>
          <select
            name="profession_type"
            className="field mt-1.5"
            defaultValue="autonomous_seller"
          >
            {PROFESSION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
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
              className="nav-item font-black text-brand-700 hover:text-brand-900"
            >
              Termos de Uso e o Contrato de Prestação de Serviço
            </Link>
            .
          </span>
        </label>
        <PendingButton className="btn w-full py-3 text-base" pendingLabel="Criando">
          Criar conta grátis
        </PendingButton>
      </form>
    </AuthShell>
  );
}
