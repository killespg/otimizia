import { describe, expect, it } from "vitest";
import {
  canonicalizeLegalPipelineList,
  findSensitiveLegalTerms,
  LEGAL_INTAKE_COLUMN,
  LEGAL_PIPELINE_COLUMNS,
  legalColumnTitle,
  mergeLegalIntakeDetails,
} from "./legal-pipeline";

describe("findSensitiveLegalTerms", () => {
  it("flags critical legal words without matching lookalikes", () => {
    expect(findSensitiveLegalTerms("O juiz marcou audiência e falou em liminar.")).toEqual(
      expect.arrayContaining(["audiencia", "juiz", "liminar"]),
    );
    expect(findSensitiveLegalTerms("Quero ajuizar uma reclamação.")).toEqual([]);
  });
});

describe("mergeLegalIntakeDetails", () => {
  it("fills the intake column and case metadata without wiping existing details", () => {
    expect(
      mergeLegalIntakeDetails(
        { comarca: "Campinas" },
        { area: "Trabalhista", summary: "Demissão sem justa causa", urgency: "Alta", sensitiveTerms: ["prazo"] },
      ),
    ).toEqual({
      comarca: "Campinas",
      pipeline_list: LEGAL_INTAKE_COLUMN,
      area_direito: "Trabalhista",
      resumo_caso: "Demissão sem justa causa",
      urgencia: "Alta",
      sensitive_alert: "true",
      sensitive_terms: "prazo",
    });
  });
});

describe("canonicalizeLegalPipelineList", () => {
  it("keeps the six office columns and folds leftover CRM names into them", () => {
    expect(LEGAL_PIPELINE_COLUMNS).toHaveLength(6);
    expect(canonicalizeLegalPipelineList("Triagem Inicial")).toBe("Triagem Inicial");
    expect(canonicalizeLegalPipelineList("Novo lead")).toBe("Triagem Inicial");
    expect(canonicalizeLegalPipelineList("Novo")).toBe("Triagem Inicial");
    expect(canonicalizeLegalPipelineList("Qualificação")).toBe("Análise de Viabilidade");
    expect(canonicalizeLegalPipelineList("Documentos pendentes")).toBe("Documentação Pendente");
    expect(canonicalizeLegalPipelineList("Proposta enviada")).toBe("Proposta / Honorários");
    expect(canonicalizeLegalPipelineList("Contratado")).toBe("Convertido (Processo Ativo)");
    expect(canonicalizeLegalPipelineList("Perdido")).toBe("Não contratado");
    expect(legalColumnTitle("Triagem Inicial")).toBe("Triagem");
    expect(legalColumnTitle("Proposta / Honorários")).toBe("Honorários");
  });
});
