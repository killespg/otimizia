import { describe, expect, it } from "vitest";
import { evaluateRateLimit } from "./rate-limit";

describe("evaluateRateLimit", () => {
  it("permite enquanto a contagem (incluindo esta requisição) não passar do máximo", () => {
    expect(evaluateRateLimit(1, 20, 60, 5).allowed).toBe(true);
    expect(evaluateRateLimit(19, 20, 60, 5).allowed).toBe(true);
    expect(evaluateRateLimit(20, 20, 60, 5).allowed).toBe(true);
  });

  it("bloqueia quando a contagem passa do máximo", () => {
    const result = evaluateRateLimit(21, 20, 60, 5);
    expect(result.allowed).toBe(false);
  });

  it("calcula retryAfterSeconds como o tempo restante até o fim da janela", () => {
    const result = evaluateRateLimit(21, 20, 60, 45);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(15);
  });

  it("nunca devolve retryAfterSeconds menor que 1, mesmo no fim exato da janela", () => {
    const result = evaluateRateLimit(21, 20, 60, 60);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("retryAfterSeconds é 0 quando permitido", () => {
    expect(evaluateRateLimit(5, 20, 60, 10).retryAfterSeconds).toBe(0);
  });
});
