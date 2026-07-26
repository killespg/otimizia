import { describe, expect, it } from "vitest";
import { generateWebhookSecret, signWebhookPayload, verifyWebhookSignature } from "@/lib/webhooks";

describe("signWebhookPayload / verifyWebhookSignature", () => {
  it("gera uma assinatura verificável com o mesmo secret e corpo", () => {
    const secret = generateWebhookSecret();
    const body = JSON.stringify({ event: "deal.created", deal_id: "123" });
    const signature = signWebhookPayload(secret, body);
    expect(verifyWebhookSignature(secret, body, signature)).toBe(true);
  });

  it("rejeita quando o corpo foi alterado", () => {
    const secret = generateWebhookSecret();
    const signature = signWebhookPayload(secret, JSON.stringify({ a: 1 }));
    expect(verifyWebhookSignature(secret, JSON.stringify({ a: 2 }), signature)).toBe(false);
  });

  it("rejeita quando o secret é outro", () => {
    const body = JSON.stringify({ a: 1 });
    const signature = signWebhookPayload(generateWebhookSecret(), body);
    expect(verifyWebhookSignature(generateWebhookSecret(), body, signature)).toBe(false);
  });
});

describe("generateWebhookSecret", () => {
  it("gera secrets distintos a cada chamada", () => {
    expect(generateWebhookSecret()).not.toEqual(generateWebhookSecret());
  });
});
