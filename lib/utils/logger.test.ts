import { afterEach, describe, expect, it, vi } from "vitest";
import { logError } from "./logger";

function capturar(fn: () => void): Record<string, unknown> {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  fn();
  const linha = spy.mock.calls.at(-1)?.[0] as string;
  return JSON.parse(linha) as Record<string, unknown>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logError", () => {
  it("preserva mensagem e stack de uma instância de Error", () => {
    const payload = capturar(() => logError("teste", new Error("deu ruim")));

    expect(payload.message).toBe("deu ruim");
    expect(payload.stack).toContain("Error: deu ruim");
  });

  // O caso que motivou a correção: por duas semanas o alerta de e-mail gravou
  // "[object Object]" todo dia, escondendo a recusa do Resend.
  it("serializa erro que vem como objeto puro, no formato do SDK do Resend", () => {
    const payload = capturar(() =>
      logError("email.send-failed", {
        statusCode: 403,
        name: "validation_error",
        message: "The useotimizia.com domain is not verified",
      })
    );

    expect(payload.message).not.toBe("[object Object]");
    expect(payload.message).toContain("not verified");
    expect(payload.message).toContain("403");
  });

  it("usa nome e mensagem quando as propriedades não são enumeráveis", () => {
    const opaco = {};
    Object.defineProperty(opaco, "name", { value: "AuthApiError", enumerable: false });
    Object.defineProperty(opaco, "message", { value: "Invalid Refresh Token", enumerable: false });

    const payload = capturar(() => logError("teste", opaco));

    expect(payload.message).toBe("AuthApiError: Invalid Refresh Token");
  });

  it("não quebra com referência circular", () => {
    const circular: Record<string, unknown> = { message: "loop", name: "Circular" };
    circular.self = circular;

    const payload = capturar(() => logError("teste", circular));

    expect(payload.message).toBe("Circular: loop");
  });

  it("mantém escopo e contexto na linha", () => {
    const payload = capturar(() =>
      logError("email.send-failed", new Error("x"), { to: "alguem@exemplo.com", subject: "Assunto" })
    );

    expect(payload.scope).toBe("email.send-failed");
    expect(payload.context).toEqual({ to: "alguem@exemplo.com", subject: "Assunto" });
  });
});
