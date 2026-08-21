import type { DealStage } from "@/lib/supabase/types";

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function stageFromPipelineList(listName: string): DealStage {
  const value = normalized(listName);
  if (value.includes("nao contratado") || value.includes("perdido") || value.includes("perda") || value.includes("lost")) return "perdido";
  if (
    value.includes("contratado") ||
    value.includes("convertido") ||
    value.includes("fechado") ||
    value.includes("vendido") ||
    value.includes("vendas") ||
    value.includes("ganho") ||
    value.includes("won")
  ) {
    return "ganho";
  }
  if (value.includes("proposta") || value.includes("negociacao") || value.includes("honorarios") || value.includes("visita")) {
    return "negociacao";
  }
  if (
    value.includes("qualificacao") ||
    value.includes("analise") ||
    value.includes("viabilidade") ||
    value.includes("documentacao") ||
    value.includes("contato") ||
    value.includes("follow")
  ) {
    return "em_contato";
  }
  return "novo";
}

export function isLostPipelineList(listName: string) {
  return stageFromPipelineList(listName) === "perdido";
}
