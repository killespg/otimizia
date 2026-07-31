"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/design-system/brand-icons";

/**
 * Linha "ou continue com" das telas de login/cadastro.
 *
 * Só Google por enquanto — Apple e Facebook saíram porque exigem app extra
 * nos respectivos consoles (Apple ainda nem tem Client ID criado). Dá pra
 * trazer os dois de volta depois: era só somar em `PROVIDERS` antes disso
 * virar um botão único.
 *
 * `signInWithOAuth` já faz o browser navegar pro provedor sozinho — não tem
 * o que esperar depois do clique além do provedor responder, então o loading
 * só existe pra não deixar clicar duas vezes enquanto a navegação começa.
 *
 * O retorno do provedor cai em `/auth/callback` (route handler que troca o
 * code por sessão) e de lá segue pro `next` que já vinha na URL desta
 * página, do mesmo jeito que o login por senha faz.
 *
 * Esse botão também cria conta (o Google não distingue "entrar" de
 * "cadastrar" — se o e-mail é novo, a conta nasce ali). Como o consentimento
 * do provedor não tem como incluir o checkbox de termos do cadastro normal,
 * o aviso abaixo do botão cobre isso, e o aceite em si é gravado no servidor
 * assim que a sessão volta (ver app/auth/callback/route.ts).
 */
export function SocialAuthButtons({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (loading) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });

    if (error) {
      setError("Não foi possível continuar com o Google. Tente de novo.");
      setLoading(false);
    }
    // Sem erro: o navegador já está saindo pra tela do Google.
  }

  return (
    <div>
      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-od-border" />
        <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-od-text-3">
          Ou continue com
        </span>
        <span className="h-px flex-1 bg-od-border" />
      </div>

      {error ? (
        <div role="alert" className="mb-3 flex items-center gap-2 text-xs text-danger-600">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-md border border-od-border bg-white/[0.02] text-sm font-semibold text-od-text transition-colors hover:border-od-border-hover hover:bg-white/[0.05] disabled:pointer-events-none disabled:opacity-50"
      >
        {loading ? (
          <span className="size-[18px] animate-spin rounded-full border-2 border-od-text-3 border-t-transparent" />
        ) : (
          <GoogleIcon className="size-[18px]" />
        )}
        Continuar com Google
      </button>

      <p className="mt-3 text-center text-[11px] leading-4 text-od-text-3">
        Ao continuar com o Google, você concorda com nossos{" "}
        <Link
          href="/termos"
          target="_blank"
          className="font-semibold text-od-text-2 hover:text-od-text"
        >
          Termos de Uso
        </Link>
        .
      </p>
    </div>
  );
}
