import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey, hasScope } from "@/lib/api-keys";

describe("generateApiKey", () => {
  it("gera uma chave crua com prefixo previsível e hash correspondente", () => {
    const { rawKey, keyHash, keyPrefix } = generateApiKey();
    expect(rawKey).toMatch(/^otz_[0-9a-f]{48}$/);
    expect(keyPrefix).toEqual(rawKey.slice(0, 8));
    expect(keyHash).toEqual(hashApiKey(rawKey));
  });

  it("gera chaves diferentes a cada chamada", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.rawKey).not.toEqual(b.rawKey);
  });
});

describe("hashApiKey", () => {
  it("é determinístico para a mesma chave", () => {
    expect(hashApiKey("otz_teste")).toEqual(hashApiKey("otz_teste"));
  });

  it("produz hashes diferentes para chaves diferentes", () => {
    expect(hashApiKey("otz_a")).not.toEqual(hashApiKey("otz_b"));
  });
});

describe("hasScope", () => {
  it("confirma escopo presente e nega ausente", () => {
    expect(hasScope(["read"], "read")).toBe(true);
    expect(hasScope(["read"], "write")).toBe(false);
  });
});
