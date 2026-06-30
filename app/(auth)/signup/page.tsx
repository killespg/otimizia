import Link from "next/link";
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
      subtitle="Comece a organizar suas vendas em minutos."
      error={searchParams.error}
      footer={
        <>
          Já tem conta?{" "}
          <Link
            href="/login"
            className="nav-item font-semibold text-brand-700 hover:text-brand-800"
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
        <button type="submit" className="btn w-full py-3 text-base">
          Criar conta grátis
        </button>
      </form>
    </AuthShell>
  );
}
