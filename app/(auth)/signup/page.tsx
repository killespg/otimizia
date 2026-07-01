import Link from "next/link";
import { PendingButton } from "@/components/PendingButton";
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
        <PendingButton className="btn w-full py-3 text-base" pendingLabel="Criando">
          Criar conta grátis
        </PendingButton>
      </form>
    </AuthShell>
  );
}
