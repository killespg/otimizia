import Link from "next/link";
import { PendingButton } from "@/components/PendingButton";
import { login } from "../actions";
import { AuthShell, AuthField } from "../AuthShell";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  return (
    <AuthShell
      title="Entrar"
      subtitle="Entre e veja quem você precisa chamar hoje."
      error={searchParams.error}
      notice={searchParams.message}
      footer={
        <>
          Não tem conta?{" "}
          <Link
            href="/signup"
            className="nav-item font-black text-brand-700 hover:text-brand-900"
          >
            Criar agora
          </Link>
        </>
      }
    >
      <form action={login} className="mt-6 space-y-4">
        <AuthField
          name="email"
          label="E-mail"
          type="text"
          required
          maxLength={160}
          autoComplete="email"
        />
        <div>
          <AuthField
            name="password"
            label="Senha"
            type="password"
            required
            maxLength={200}
            autoComplete="current-password"
          />
          <Link
            href="/forgot-password"
            className="nav-item mt-1.5 inline-block text-xs font-bold text-ink-muted hover:text-brand-700"
          >
            Esqueci minha senha
          </Link>
        </div>
        <PendingButton className="btn w-full py-3 text-base" pendingLabel="Entrando">
          Entrar
        </PendingButton>
      </form>
    </AuthShell>
  );
}
