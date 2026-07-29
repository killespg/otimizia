import { timingSafeEqual } from "node:crypto";

export const EVOLUTION_WEBHOOK_AUTH_HEADER = "authorization";

export function evolutionWebhookSecret(): string {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("EVOLUTION_WEBHOOK_SECRET precisa ter pelo menos 32 caracteres.");
  }
  return secret;
}

export function verifyEvolutionWebhookAuthorization(
  authorization: string | null,
  secret = process.env.EVOLUTION_WEBHOOK_SECRET
): boolean {
  if (!authorization || !secret || secret.length < 32) return false;
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const provided = Buffer.from(authorization, "utf8");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
