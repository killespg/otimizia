import { describe, expect, it } from "vitest";
import { sanitizeContactSummary } from "@/lib/ai/contact-summary";

describe("sanitizeContactSummary", () => {
  it("mantém fatos com fonte_index válido dentro do tamanho da timeline", () => {
    const summary = sanitizeContactSummary(
      {
        resumo: "Cliente ativo, aguardando proposta.",
        pendencias: ["Enviar proposta"],
        fatos_citaveis: [{ fato: "Visitou o imóvel na terça", fonte_index: 1 }],
        sugestao_resposta: "Oi! Vamos seguir com a proposta?",
      },
      3
    );
    expect(summary.fatos_citaveis).toHaveLength(1);
    expect(summary.fatos_citaveis[0].fonte_index).toEqual(1);
  });

  it("descarta fato com fonte_index fora do intervalo da timeline (link quebrado)", () => {
    const summary = sanitizeContactSummary(
      { resumo: "x", pendencias: [], fatos_citaveis: [{ fato: "Fato inventado", fonte_index: 99 }], sugestao_resposta: "" },
      3
    );
    expect(summary.fatos_citaveis).toHaveLength(0);
  });

  it("descarta fato sem fonte_index numérico", () => {
    const summary = sanitizeContactSummary(
      { resumo: "x", pendencias: [], fatos_citaveis: [{ fato: "Sem índice", fonte_index: "não é número" }], sugestao_resposta: "" },
      5
    );
    expect(summary.fatos_citaveis).toHaveLength(0);
  });

  it("lida com entrada vazia/malformada sem lançar erro", () => {
    const summary = sanitizeContactSummary(null, 0);
    expect(summary).toEqual({ resumo: "", pendencias: [], fatos_citaveis: [], sugestao_resposta: "" });
  });

  it("limita o número de pendências e fatos citáveis", () => {
    const summary = sanitizeContactSummary(
      {
        resumo: "x",
        pendencias: Array.from({ length: 20 }, (_, i) => `pendência ${i}`),
        fatos_citaveis: Array.from({ length: 20 }, (_, i) => ({ fato: `fato ${i}`, fonte_index: 0 })),
        sugestao_resposta: "",
      },
      1
    );
    expect(summary.pendencias.length).toBeLessThanOrEqual(10);
    expect(summary.fatos_citaveis.length).toBeLessThanOrEqual(15);
  });
});
