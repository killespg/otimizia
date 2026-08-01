import { describe, expect, it } from "vitest";
import { isOptOutKeyword } from "./whatsapp-opt-out";

describe("isOptOutKeyword", () => {
  it("reconhece as palavras-chave de opt-out, com variação de caixa e acento", () => {
    expect(isOptOutKeyword("PARAR")).toBe(true);
    expect(isOptOutKeyword("parar")).toBe(true);
    expect(isOptOutKeyword("Sair")).toBe(true);
    expect(isOptOutKeyword("cancelar")).toBe(true);
    expect(isOptOutKeyword("Pare")).toBe(true);
    expect(isOptOutKeyword("STOP")).toBe(true);
  });

  it("tolera espaço em volta e pontuação final", () => {
    expect(isOptOutKeyword("  parar  ")).toBe(true);
    expect(isOptOutKeyword("Parar!")).toBe(true);
    expect(isOptOutKeyword("cancelar.")).toBe(true);
    expect(isOptOutKeyword("sair?")).toBe(true);
  });

  it("não aciona em frases que só contêm a palavra como parte do contexto", () => {
    expect(isOptOutKeyword("quero cancelar a visita de amanhã")).toBe(false);
    expect(isOptOutKeyword("vou sair mais cedo hoje")).toBe(false);
    expect(isOptOutKeyword("por favor pare de me ligar as 22h")).toBe(false);
  });

  it("não aciona em mensagens comuns sem relação com opt-out", () => {
    expect(isOptOutKeyword("oi, tudo bem?")).toBe(false);
    expect(isOptOutKeyword("")).toBe(false);
    expect(isOptOutKeyword("quero visitar o apartamento")).toBe(false);
  });
});
