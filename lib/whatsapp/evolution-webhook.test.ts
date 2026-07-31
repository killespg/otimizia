import { describe, expect, it } from "vitest";
import { verifyEvolutionWebhookAuthorization } from "./evolution-webhook";

describe("autenticação do webhook Evolution", () => {
  const secret = "s".repeat(32);

  it("aceita somente o bearer exato", () => {
    expect(verifyEvolutionWebhookAuthorization(`Bearer ${secret}`, secret)).toBe(true);
    expect(verifyEvolutionWebhookAuthorization(`bearer ${secret}`, secret)).toBe(false);
    expect(verifyEvolutionWebhookAuthorization(`Bearer ${secret}x`, secret)).toBe(false);
  });

  it("falha fechado sem segredo forte", () => {
    expect(verifyEvolutionWebhookAuthorization(null, secret)).toBe(false);
    expect(verifyEvolutionWebhookAuthorization("Bearer curto", "curto")).toBe(false);
  });
});
