import { describe, expect, it } from "vitest";
import { sanitizeParsedFilters } from "./property-filter-chat";

describe("sanitizeParsedFilters", () => {
  it("aceita campos válidos e converte preço/quartos pra número", () => {
    const result = sanitizeParsedFilters({
      resposta: "Beleza, filtrando apartamento até R$ 800.000 no Itaim com 2+ quartos.",
      status: "ativo",
      property_type: "apartamento",
      transaction_type: "venda",
      price_min: 300000,
      price_max: 800000,
      bedrooms_min: 2,
      neighborhood: "Itaim",
    });
    expect(result).toEqual({
      resposta: "Beleza, filtrando apartamento até R$ 800.000 no Itaim com 2+ quartos.",
      status: "ativo",
      property_type: "apartamento",
      transaction_type: "venda",
      price_min: 300000,
      price_max: 800000,
      bedrooms_min: 2,
      neighborhood: "Itaim",
    });
  });

  it("descarta enum fora do contrato em vez de repassar pro cliente", () => {
    const result = sanitizeParsedFilters({
      resposta: "ok",
      status: "algo_invalido",
      property_type: "iate",
      transaction_type: "permuta",
    });
    expect(result.status).toBeUndefined();
    expect(result.property_type).toBeUndefined();
    expect(result.transaction_type).toBeUndefined();
  });

  it("omite campos que a IA não mencionou (undefined, não zero/vazio)", () => {
    const result = sanitizeParsedFilters({ resposta: "Qual faixa de preço você procura?" });
    expect(result).toEqual({ resposta: "Qual faixa de preço você procura?" });
  });

  it("descarta preço/quartos não numéricos ou negativos", () => {
    const result = sanitizeParsedFilters({
      resposta: "ok",
      price_min: "muito",
      price_max: -100,
      bedrooms_min: -1,
    });
    expect(result.price_min).toBeUndefined();
    expect(result.price_max).toBeUndefined();
    expect(result.bedrooms_min).toBeUndefined();
  });

  it("rejeita quartos acima de um limite plausível", () => {
    const result = sanitizeParsedFilters({ resposta: "ok", bedrooms_min: 500 });
    expect(result.bedrooms_min).toBeUndefined();
  });

  it("nunca falha com entrada malformada — sempre devolve resposta (vazia se preciso)", () => {
    expect(sanitizeParsedFilters(null)).toEqual({ resposta: "" });
    expect(sanitizeParsedFilters(undefined)).toEqual({ resposta: "" });
    expect(sanitizeParsedFilters("string solta")).toEqual({ resposta: "" });
  });

  it("trunca bairro e resposta muito longos", () => {
    const result = sanitizeParsedFilters({
      resposta: "x".repeat(1000),
      neighborhood: "y".repeat(200),
    });
    expect(result.resposta.length).toBe(400);
    expect(result.neighborhood?.length).toBe(80);
  });
});
