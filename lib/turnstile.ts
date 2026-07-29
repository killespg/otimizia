import "server-only";

// Verificação server-side canônica do Cloudflare Turnstile. O navegador
// resolve o desafio e manda o token no campo `cf-turnstile-response`; aqui o
// backend confirma esse token com o Cloudflare usando o TURNSTILE_SECRET
// (nunca exposto ao cliente) e só libera se `success === true`.
//
// Fluxo: navegador -> nosso backend (Server Action) -> siteverify -> gate.
// Nunca chamamos siteverify do navegador.

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const TURNSTILE_TOKEN_FIELD = "cf-turnstile-response";

export type TurnstileOutcome =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: "missing_token" | "verification_failed" | "siteverify_unreachable" };

// remoteIp é opcional no siteverify, mas ajuda o Cloudflare a pontuar risco.
export function clientIpFromHeaders(h: Headers): string | null {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip");
}

export async function verifyTurnstile(token: string, remoteIp: string | null): Promise<TurnstileOutcome> {
  const secret = process.env.TURNSTILE_SECRET;

  // Sem segredo, falha fechado em produção. O bypass existe apenas no ambiente
  // local para que login/signup possam ser desenvolvidos sem credenciais reais.
  if (!secret) {
    return process.env.NODE_ENV === "production"
      ? { ok: false, reason: "verification_failed" }
      : { ok: true, skipped: true };
  }

  if (!token) return { ok: false, reason: "missing_token" };

  let data: { success?: boolean };
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });
    data = (await res.json()) as { success?: boolean };
  } catch {
    // Segredo configurado mas siteverify inacessível: fail-closed. Como a
    // proteção foi explicitamente ligada, é mais seguro barrar e pedir
    // retry do que deixar passar sem verificar.
    return { ok: false, reason: "siteverify_unreachable" };
  }

  if (data.success === true) return { ok: true };
  return { ok: false, reason: "verification_failed" };
}
