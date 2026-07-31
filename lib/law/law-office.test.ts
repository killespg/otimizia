import { describe, expect, it } from "vitest";
import { canViewLegal, hasLegalWorkspace } from "@/lib/law/law-office";

describe("hasLegalWorkspace", () => {
  it("libera quem tem law_office entre as profissoes habilitadas", () => {
    expect(
      hasLegalWorkspace({ profession_types: ["law_office"] }),
    ).toBe(true);
  });

  it("libera quem e advogado e corretor, sem depender da workspace ativa", () => {
    expect(
      hasLegalWorkspace({
        profession_types: ["real_estate_broker", "law_office"],
        profession_type: "real_estate_broker",
      }),
    ).toBe(true);
  });

  it("cai para profession_type quando profession_types vem vazio", () => {
    expect(
      hasLegalWorkspace({ profession_types: [], profession_type: "law_office" }),
    ).toBe(true);
  });

  it("barra corretor sem a workspace juridica", () => {
    expect(
      hasLegalWorkspace({
        profession_types: ["real_estate_broker"],
        profession_type: "real_estate_broker",
      }),
    ).toBe(false);
  });

  it("libera o fundador da plataforma", () => {
    expect(hasLegalWorkspace({ is_admin: true })).toBe(true);
  });

  it("falha fechado quando o perfil nao diz nada", () => {
    expect(hasLegalWorkspace({})).toBe(false);
    expect(
      hasLegalWorkspace({ profession_types: null, profession_type: null }),
    ).toBe(false);
    expect(hasLegalWorkspace({ profession_types: "law_office" })).toBe(false);
  });

  it("ignora valor que nao existe na lista publica de profissoes", () => {
    expect(
      hasLegalWorkspace({ profession_types: ["founder"] }),
    ).toBe(false);
    expect(
      hasLegalWorkspace({ profession_type: "nao_existe" }),
    ).toBe(false);
  });
});

describe("canViewLegal como segundo fator", () => {
  // Documenta por que canViewLegal nao pode ser a porta: ele libera qualquer
  // admin de organizacao, e todo cliente e admin da propria org. O primeiro
  // fator e hasLegalWorkspace.
  it("libera admin de organizacao independente do cargo", () => {
    expect(canViewLegal(null, true)).toBe(true);
    expect(canViewLegal("receptionist", true)).toBe(true);
  });

  it("sem admin, respeita a lista de cargos", () => {
    expect(canViewLegal("lawyer")).toBe(true);
    expect(canViewLegal("paralegal")).toBe(true);
    expect(canViewLegal("finance")).toBe(false);
    expect(canViewLegal("receptionist")).toBe(false);
    expect(canViewLegal(null)).toBe(false);
  });
});
