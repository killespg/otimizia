import Link from "next/link";
import { CaptchaField } from "@/components/auth/CaptchaField";
import { PendingButton } from "@/components/ui/PendingButton";
import { requestPasswordReset } from "../actions";
import { AuthShell, AuthField } from "../AuthShell";

export default async function ForgotPasswordPage(
  props: {
    searchParams: Promise<{ error?: string; message?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  return (
    <AuthShell
      title="Esqueci minha senha"
      subtitle="Informe seu e-mail e mandamos um link para criar uma nova senha."
      error={searchParams.error}
      notice={searchParams.message}
      footer={
        <>
          Lembrou a senha?{" "}
          <Link
            href="/login"
            className="nav-item font-black text-brand-700 hover:text-od-text"
          >
            Entrar
          </Link>
        </>
      }
    >
      <form action={requestPasswordReset} className="mt-6">
        <AuthField
          name="email"
          label="E-mail"
          type="email"
          required
          maxLength={160}
          autoComplete="email"
        />
        <div className="mt-6">
          <CaptchaField />
        </div>
        <PendingButton className="btn btn-lg mt-8 w-full" pendingLabel="Enviando">
          Enviar link de redefinição
        </PendingButton>
      </form>
    </AuthShell>
  );
}
