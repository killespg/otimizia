import Link from "next/link";
import { CaptchaField } from "@/components/auth/CaptchaField";
import { PendingButton } from "@/components/ui/PendingButton";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { AuthPasswordField } from "@/components/auth/AuthPasswordField";
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
      subtitle="Entre para acompanhar seus clientes, vendas e compromissos."
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
      <form action={login} className="mt-6">
        {searchParams.next ? <input type="hidden" name="next" value={searchParams.next} /> : null}
        <div className="space-y-4">
          <AuthField
            name="email"
            label="E-mail"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
          />
          <div>
            <AuthPasswordField
              name="password"
              label="Senha"
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
        </div>
        <div className="mt-6">
          <CaptchaField />
        </div>
        <PendingButton className="btn btn-lg mt-8 w-full" pendingLabel="Entrando">
          Entrar
        </PendingButton>
      </form>
      <SocialAuthButtons next={searchParams.next} />
    </AuthShell>
  );
}
