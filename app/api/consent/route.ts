import { NextResponse } from "next/server";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_POLICY_VERSION,
  actionFor,
  isVisitorId,
  parseConsent,
  serializeConsent,
} from "@/lib/consent";
import { logError } from "@/lib/logger";
import { resolveOrigin } from "@/lib/request-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Grava a escolha de cookies: cookie de primeira parte (o que o navegador
// consulta) + linha em cookie_consent_logs (o comprovante). O log usa a
// service role porque o visitante não pode ser quem assina o próprio
// comprovante — e porque a escolha vale também para quem não tem conta.
export async function POST(request: Request) {
  // Só aceita chamada vinda do próprio site. Não é autenticação — é para o
  // endpoint não virar um formulário aberto de escrita em tabela.
  const origin = request.headers.get("origin");
  if (origin && origin.replace(/\/+$/, "") !== resolveOrigin(request.headers)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const payload = body as { visitorId?: unknown; analytics?: unknown; marketing?: unknown };
  if (
    !isVisitorId(payload.visitorId) ||
    typeof payload.analytics !== "boolean" ||
    typeof payload.marketing !== "boolean"
  ) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const categories = { analytics: payload.analytics, marketing: payload.marketing };
  const previous = parseConsent(readCookie(request.headers.get("cookie"), CONSENT_COOKIE));
  const state = {
    version: CONSENT_POLICY_VERSION,
    visitorId: payload.visitorId,
    ...categories,
    action: actionFor(categories, previous),
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await createAdminClient().from("cookie_consent_logs").insert({
    visitor_id: state.visitorId,
    user_id: user?.id ?? null,
    policy_version: state.version,
    action: state.action,
    analytics: state.analytics,
    marketing: state.marketing,
    user_agent: (request.headers.get("user-agent") ?? "").slice(0, 400) || null,
  });
  if (error) {
    // Sem comprovante, não há consentimento válido — então não gravamos o
    // cookie e o banner continua aparecendo, em vez de liberar rastreamento
    // que não conseguimos provar que foi autorizado.
    logError("consent.log-failed", error, { action: state.action });
    return NextResponse.json({ error: "log_failed" }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true, consent: categories });
  response.cookies.set(CONSENT_COOKIE, serializeConsent(state), {
    maxAge: CONSENT_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Legível pelo JS de propósito: é o próprio banner que decide, no
    // navegador, se carrega os scripts de terceiro.
    httpOnly: false,
  });
  return response;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
