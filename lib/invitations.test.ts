import { describe, expect, it } from "vitest";
import {
  createInvitationToken,
  hashInvitationToken,
  maskEmail,
  safeInternalPath,
} from "./invitations";

describe("convites de organização", () => {
  it("gera token aleatório e persiste apenas o hash", () => {
    const first = createInvitationToken();
    const second = createInvitationToken();
    expect(first.token).not.toEqual(second.token);
    expect(first.tokenHash).toHaveLength(64);
    expect(first.tokenHash).toEqual(hashInvitationToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
  });

  it("rejeita tokens fora do formato esperado", () => {
    expect(() => hashInvitationToken("../convite")).toThrow("Convite inválido");
  });

  it("não aceita redirecionamento externo", () => {
    expect(safeInternalPath("/convite?token=abc")).toBe("/convite?token=abc");
    expect(safeInternalPath("//evil.example")).toBe("/painel");
    expect(safeInternalPath("https://evil.example")).toBe("/painel");
  });

  it("mascara o endereço convidado", () => {
    expect(maskEmail("maria@example.com")).toMatch(/^ma.+@example\.com$/);
  });
});
