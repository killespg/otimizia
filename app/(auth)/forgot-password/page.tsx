import Link from "next/link";
import { PendingButton } from "@/components/PendingButton";
import { requestPasswordReset } from "../actions";
import { AuthShell, AuthField } from "../AuthShell";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell
      title="Esqueci minha senha"
      subtitle="Informe seu e-mail e mandamos um link para criar uma nova senha."
      error={params.error}
      notice={params.message}
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
        <PendingButton className="btn w-full py-3 text-base" pendingLabel="Enviando">
          Enviar link de redefinição
        </PendingButton>
      </form>
    </AuthShell>
  );
}
