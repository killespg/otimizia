"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "../AuthShell";

type Status = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        settled = true;
        setStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !settled) {
        settled = true;
        setStatus("ready");
      }
    });

    const timeout = setTimeout(() => {
      if (!settled) setStatus("invalid");
    }, 2500);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      setError("Use uma senha com pelo menos 6 caracteres.");
      return;
    }
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError("Não foi possível atualizar a senha. Peça um novo link.");
      return;
    }

    router.push(
      `/login?message=${encodeURIComponent("Senha atualizada. Entre com a nova senha.")}`
    );
  }

  return (
    <AuthShell
      title="Criar nova senha"
      subtitle="Escolha uma nova senha para sua conta."
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
      {status === "checking" && (
        <p className="mt-6 text-sm font-medium text-ink-soft">
          Verificando o link...
        </p>
      )}

      {status === "invalid" && (
        <div className="mt-6 space-y-3">
          <p className="text-sm font-medium text-ink-soft">
            Esse link é inválido ou expirou.
          </p>
          <Link
            href="/forgot-password"
            className="nav-item font-black text-brand-700 hover:text-brand-900"
          >
            Pedir um novo link
          </Link>
        </div>
      )}

      {status === "ready" && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="password">
              Nova senha
              <span className="ml-1 text-brand-700" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> obrigatório</span>
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              maxLength={200}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field mt-1.5"
            />
          </div>

          {error && (
            <p className="text-sm font-bold text-danger-700">{error}</p>
          )}

          <button type="submit" disabled={pending} className="btn w-full py-3 text-base">
            {pending ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
