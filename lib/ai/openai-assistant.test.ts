import { describe, expect, it } from "vitest";
import { resolveAiProvider } from "./openai-assistant";

describe("resolveAiProvider", () => {
  it("uses the explicitly selected provider", () => {
    expect(resolveAiProvider({ AI_PROVIDER: "openai", OPENAI_API_KEY: "set" })).toBe("openai");
    expect(resolveAiProvider({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "set" })).toBe("anthropic");
  });

  it("does not silently use another provider when the explicit one is missing", () => {
    expect(resolveAiProvider({ AI_PROVIDER: "openai", ANTHROPIC_API_KEY: "set" })).toBeNull();
  });

  it("keeps Anthropic as the compatibility default and falls back to OpenAI", () => {
    expect(resolveAiProvider({ ANTHROPIC_API_KEY: "set", OPENAI_API_KEY: "set" })).toBe("anthropic");
    expect(resolveAiProvider({ OPENAI_API_KEY: "set" })).toBe("openai");
    expect(resolveAiProvider({})).toBeNull();
  });
});
