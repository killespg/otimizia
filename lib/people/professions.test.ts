import { describe, expect, it } from "vitest";
import { ASSIGNABLE_PROFESSION_OPTIONS, PROFESSION_OPTIONS, getProfessionPreset, normalizeProfession } from "./professions";

describe("normalizeProfession", () => {
  it("accepts any publicly listed profession value", () => {
    for (const option of PROFESSION_OPTIONS) {
      expect(normalizeProfession(option.value)).toBe(option.value);
    }
  });

  it("never resolves 'founder' from user input", () => {
    expect(normalizeProfession("founder")).toBe("autonomous_seller");
  });

  it("falls back to autonomous_seller for unknown or non-string input", () => {
    expect(normalizeProfession("not-a-profession")).toBe("autonomous_seller");
    expect(normalizeProfession(undefined)).toBe("autonomous_seller");
    expect(normalizeProfession(42)).toBe("autonomous_seller");
  });
});

describe("getProfessionPreset", () => {
  it("returns a preset matching the requested key for every public option", () => {
    for (const option of PROFESSION_OPTIONS) {
      expect(getProfessionPreset(option.value as never).key).toBe(option.value);
    }
  });

  it("resolves the founder preset when explicitly requested", () => {
    expect(getProfessionPreset("founder" as never).key).toBe("founder");
  });

  it("falls back to autonomous_seller for an unrecognized key", () => {
    expect(getProfessionPreset("bogus" as never).key).toBe("autonomous_seller");
  });
});

describe("profissoes desativadas para novos cadastros", () => {
  const desativadas = ["service_provider", "consultant", "freelancer", "livestock_producer", "small_business", "other"];

  it("nao aparecem no cadastro", () => {
    const ofertadas = PROFESSION_OPTIONS.map((option) => option.value);
    expect(ofertadas).toEqual(["autonomous_seller", "law_office", "real_estate_broker"]);
    for (const key of desativadas) expect(ofertadas).not.toContain(key);
  });

  // O ponto da separacao: validar contra a lista do cadastro rebaixaria um
  // consultor existente para vendedor autonomo, trocando a workspace dele sem
  // aviso na primeira vez que o perfil fosse lido.
  it("continuam validas para quem ja as tem", () => {
    for (const key of desativadas) expect(normalizeProfession(key)).toBe(key);
  });

  it("seguem na lista atribuivel, mas nunca incluem founder", () => {
    const atribuiveis = ASSIGNABLE_PROFESSION_OPTIONS.map((option) => option.value);
    for (const key of desativadas) expect(atribuiveis).toContain(key);
    expect(atribuiveis).not.toContain("founder");
    expect(normalizeProfession("founder")).toBe("autonomous_seller");
  });
});
