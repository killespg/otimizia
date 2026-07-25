import Link from "next/link";
import { CaptchaField } from "@/components/CaptchaField";
import { PendingButton } from "@/components/PendingButton";
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
            className="nav-item font-black text-brand-700 hover:text-brand-900"
          >
            Entrar
          </Link>
        </>
      }
    >
      <form action={requestPasswordReset} className="mt-6 space-y-4">
        <AuthField
          name="email"
          label="E-mail"
          type="email"
          required
          maxLength={160}
          autoComplete="email"
        />
        <CaptchaField />
        <PendingButton className="btn w-full py-3 text-base" pendingLabel="Enviando">
          Enviar link de redefinição
        </PendingButton>
      </form>
    </AuthShell>
  );
}
