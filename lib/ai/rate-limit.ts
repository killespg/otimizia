import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/utils/logger";

// Limites por rota que chama a API da Anthropic direto (custo real por
// requisição). Sem Redis/Upstash: uma janela fixa contada em Postgres
// (ver supabase/migrations/0065_ai_rate_limits.sql) já resolve na escala
// atual — trocar por um limitador de verdade (token bucket, Redis) só faz
// sentido se isso virar gargalo, não antes.
export const RATE_LIMITS = {
  parse_property_filters: { max: 20, windowSeconds: 60 },
  assistant_chat: { max: 30, windowSeconds: 60 },
  whatsapp_ai_reply: { max: 60, windowSeconds: 60 },
} as const;

export type RateLimitRoute = keyof typeof RATE_LIMITS;

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

// Pura e testável sem banco: dado quantas requisições já existiam na janela
// ANTES desta (count já inclui a atual, por isso o -1) e quanto tempo já
// passou dentro da janela, decide se essa requisição pode seguir.
export function evaluateRateLimit(
  countIncludingThisRequest: number,
  max: number,
  windowSeconds: number,
  elapsedSecondsInWindow: number
): RateLimitResult {
  if (countIncludingThisRequest > max) {
    const retryAfterSeconds = Math.max(1, Math.ceil(windowSeconds - elapsedSecondsInWindow));
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

// subjectId é o quê rate-limitar por dentro da rota: um user_id (chat do
// usuário autenticado) ou um org_id (webhook sem usuário autenticado, ver
// app/api/whatsapp/webhook/route.ts). admin precisa ser um client com
// service role — a tabela não tem policy pra authenticated (ver migration).
export async function checkRateLimit(
  admin: SupabaseClient,
  route: RateLimitRoute,
  subjectId: string
): Promise<RateLimitResult> {
  const { max, windowSeconds } = RATE_LIMITS[route];
  const nowMs = Date.now();
  const windowStartMs = Math.floor(nowMs / (windowSeconds * 1000)) * (windowSeconds * 1000);
  const windowStart = new Date(windowStartMs).toISOString();
  const elapsedSecondsInWindow = (nowMs - windowStartMs) / 1000;

  const { data: count, error } = await admin.rpc("increment_ai_rate_limit", {
    p_route: route,
    p_subject_id: subjectId,
    p_window_start: windowStart,
  });

  if (error) {
    // Falha ao contar não pode derrubar a rota real (a IA continua
    // funcionando, só sem o limite desta requisição específica) — melhor
    // deixar passar e logar do que quebrar o produto por causa do limitador.
    logError("ai/rate-limit", error, { route, subjectId });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return evaluateRateLimit(count as number, max, windowSeconds, elapsedSecondsInWindow);
}
