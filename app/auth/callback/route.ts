import { NextResponse } from "next/server";
import { safeInternalPath } from "@/lib/crm/invitations";
import { resolveOrigin } from "@/lib/utils/request-origin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Volta do OAuth (Google/Apple/Facebook): o provedor manda o navegador de
 * volta pra cá com um `code` na query. Troca o code por sessão (grava os
 * cookies via o mesmo client de Server Component/Route Handler usado no
 * resto do app) e segue pro `next` que a tela de login/cadastro colocou na
 * URL de callback — o mesmo parâmetro que o login por senha já respeita.
 *
 * `error`/`error_description` chegam quando o usuário cancela no provedor
 * ou o consentimento falha; nesse caso não tem code pra trocar, só volta
 * pro login com uma mensagem.
 *
 * OAuth não tem checkbox de termos — quem cria conta pelo Google aceita ao
 * clicar em "Continuar com Google" (aviso ao lado do botão, ver
 * SocialAuthButtons). Esse aceite é registrado aqui, no servidor, logo após
 * a troca de code por sessão, via a RPC `complete_oauth_profile` (só ela
 * grava `terms_accepted_at`/`cpf` — a 0072_explicit_api_table_grants tirou
 * essas colunas do update direto que o cliente autenticado normal tem).
 * A função só marca aceite se ainda não tinha nenhum — não sobrescreve quem
 * já aceitou antes pelo cadastro por senha. CPF fica de fora de propósito:
 * o gate que cobra isso depois vive no middleware
 * (`lib/supabase/middleware.ts`) e manda pra `/onboarding/cpf`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  const nextPath = safeInternalPath(url.searchParams.get("next"));
  const origin = resolveOrigin(request.headers);

  if (code && !providerError) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) {
        await supabase.rpc("complete_oauth_profile", { p_cpf: null, p_profession_types: null });
      }
      return NextResponse.redirect(`${origin}${nextPath}`);
    }
  }

  const message = "Não foi possível entrar com esse provedor. Tente de novo.";
  const loginPath = nextPath === "/painel" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`;
  return NextResponse.redirect(
    `${origin}${loginPath}${loginPath.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`
  );
}
