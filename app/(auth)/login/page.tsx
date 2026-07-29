import Link from "next/link";
import { CaptchaField } from "@/components/CaptchaField";
import { PendingButton } from "@/components/PendingButton";
import { login } from "../actions";
import { AuthShell, AuthField } from "../AuthShell";

export default async function LoginPage(
  props: {
    searchParams: Promise<{ error?: string; message?: string; next?: string }>;
  }
) {
  const searchParams = await props.searchParams;
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
            href={searchParams.next ? `/signup?next=${encodeURIComponent(searchParams.next)}` : "/signup"}
            className="nav-item inline-flex min-h-11 items-center font-black text-brand-700 hover:text-od-text"
          >
            Criar agora
          </Link>
        </>
      }
    >
      <form action={login} className="mt-6 space-y-4">
        {searchParams.next ? <input type="hidden" name="next" value={searchParams.next} /> : null}
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
            className="nav-item mt-1.5 inline-flex min-h-11 items-center text-xs font-bold text-ink-muted hover:text-brand-700"
          >
            Esqueci minha senha
          </Link>
        </div>
        <CaptchaField />
        <PendingButton className="btn w-full py-3 text-base" pendingLabel="Entrando">
          Entrar
        </PendingButton>
      </form>
    </AuthShell>
  );
}
