import { describe, expect, it } from "vitest";
import { moneyToCentsOrNull, parseBrlAmount } from "./form-parse";

describe("parseBrlAmount", () => {
  it("lê o formato brasileiro completo", () => {
    expect(parseBrlAmount("1.234,56")).toBe(1234.56);
    expect(parseBrlAmount("12.345.678,90")).toBe(12345678.9);
  });

  it("lê vírgula sozinha como decimal", () => {
    expect(parseBrlAmount("250,5")).toBe(250.5);
    expect(parseBrlAmount("0,99")).toBe(0.99);
  });

  it("lê número inteiro sem separador", () => {
    expect(parseBrlAmount("250")).toBe(250);
  });

  describe("sem vírgula, o ponto é ambíguo", () => {
    it("grupo final de 3 dígitos é milhar", () => {
      // Real não tem três casas decimais, então "1.000" só pode ser mil.
      expect(parseBrlAmount("1.000")).toBe(1000);
      expect(parseBrlAmount("1.500")).toBe(1500);
      expect(parseBrlAmount("850.000")).toBe(850000);
    });

    it("grupo final de 1 ou 2 dígitos é decimal", () => {
      expect(parseBrlAmount("1.5")).toBe(1.5);
      expect(parseBrlAmount("1.50")).toBe(1.5);
      expect(parseBrlAmount("1234.56")).toBe(1234.56);
    });

    it("mais de um ponto é sempre milhar", () => {
      // Antes isto virava NaN e o valor era salvo como zero.
      expect(parseBrlAmount("1.234.567")).toBe(1234567);
    });

    it("ponto inicial continua sendo decimal", () => {
      expect(parseBrlAmount(".500")).toBe(0.5);
    });
  });

  it("devolve NaN para entrada vazia ou sem número", () => {
    expect(parseBrlAmount("")).toBeNaN();
    expect(parseBrlAmount("abc")).toBeNaN();
  });

  it("preserva o sinal para quem quiser rejeitar negativo", () => {
    expect(parseBrlAmount("-30")).toBe(-30);
  });
});

describe("moneyToCentsOrNull", () => {
  it("converte para centavos", () => {
    expect(moneyToCentsOrNull("R$ 1.234,56")).toBe(123456);
    expect(moneyToCentsOrNull("250")).toBe(25000);
  });

  it("agora salva mil reais como mil reais", () => {
    expect(moneyToCentsOrNull("R$ 850.000")).toBe(85000000);
  });

  it("campo vazio é null, não zero", () => {
    expect(moneyToCentsOrNull("")).toBeNull();
    expect(moneyToCentsOrNull(null)).toBeNull();
  });

  it("recusa negativo e texto com mensagem em português", () => {
    expect(() => moneyToCentsOrNull("-30")).toThrow("Informe um valor válido.");
    expect(() => moneyToCentsOrNull("abc")).toThrow("Informe um valor válido.");
  });
});
