import { describe, expect, it } from "vitest";
import {
  createDeletionCode,
  extractDeletionCode,
  hashDeletionCode,
} from "./deletion-confirmation";

describe("confirmação de exclusão do Tim", () => {
  it("só extrai a frase explícita com código", () => {
    expect(extractDeletionCode("sim, pode excluir")).toBeNull();
    expect(extractDeletionCode("EXCLUIR A1B2C3")).toBe("A1B2C3");
    expect(extractDeletionCode("excluir a1b2c3")).toBe("A1B2C3");
  });

  it("gera código curto e hash não reversível", () => {
    const code = createDeletionCode();
    expect(code).toMatch(/^[A-F0-9]{6}$/);
    expect(hashDeletionCode(code)).toHaveLength(64);
    expect(hashDeletionCode(code.toLowerCase())).toBe(hashDeletionCode(code));
  });
});
