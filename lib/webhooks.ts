import { createHmac, randomBytes } from "node:crypto";

// 2.4 (Fase 2): assinatura HMAC-SHA256 do corpo do webhook — o cliente
// (Zapier/Make/n8n/receita própria) valida que a entrega veio da OtimizIA
// recomputando o mesmo HMAC com o secret que recebeu na criação do
// endpoint, mesmo princípio do Stripe/GitHub.
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

export function signWebhookPayload(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyWebhookSignature(secret: string, rawBody: string, signature: string): boolean {
  return signWebhookPayload(secret, rawBody) === signature;
}
