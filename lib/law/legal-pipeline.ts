import { stageFromPipelineList } from "@/lib/crm/pipeline-stage";
import type { DealStage } from "@/lib/supabase/types";

export const LEGAL_PIPELINE_COLUMNS = [
  "Triagem Inicial",
  "Documentação Pendente",
  "Análise de Viabilidade",
  "Proposta / Honorários",
  "Convertido (Processo Ativo)",
  "Não contratado",
] as const;

export type LegalPipelineColumn = (typeof LEGAL_PIPELINE_COLUMNS)[number];

export const LEGAL_INTAKE_COLUMN = LEGAL_PIPELINE_COLUMNS[0];

export const LEGAL_STAGE_COLUMNS: Record<DealStage, LegalPipelineColumn> = {
  novo: "Triagem Inicial",
  em_contato: "Análise de Viabilidade",
  negociacao: "Proposta / Honorários",
  ganho: "Convertido (Processo Ativo)",
  perdido: "Não contratado",
};

export const LEGAL_COLUMN_META: Record<
  LegalPipelineColumn,
  { title: string; hint: string; empty: string }
> = {
  "Triagem Inicial": {
    title: "Triagem",
    hint: "Chegou agora",
    empty: "Novos possíveis clientes entram aqui.",
  },
  "Documentação Pendente": {
    title: "Documentos",
    hint: "Falta papel",
    empty: "Nada aguardando documento.",
  },
  "Análise de Viabilidade": {
    title: "Viabilidade",
    hint: "Dá para seguir?",
    empty: "Nenhuma análise em aberto.",
  },
  "Proposta / Honorários": {
    title: "Honorários",
    hint: "Proposta na mesa",
    empty: "Nenhuma proposta em andamento.",
  },
  "Convertido (Processo Ativo)": {
    title: "Convertido",
    hint: "Virou processo",
    empty: "Nenhum caso convertido ainda.",
  },
  "Não contratado": {
    title: "Não contratado",
    hint: "Não fechou",
    empty: "Nada arquivado nesta etapa.",
  },
};

export function isLegalPipelineColumn(value: string): value is LegalPipelineColumn {
  return (LEGAL_PIPELINE_COLUMNS as readonly string[]).includes(value);
}

export function legalColumnTitle(listName: string) {
  return LEGAL_COLUMN_META[canonicalizeLegalPipelineList(listName)].title;
}

export function legalColumnMeta(listName: string) {
  return LEGAL_COLUMN_META[canonicalizeLegalPipelineList(listName)];
}

export function canonicalizeLegalPipelineList(listName?: string | null): LegalPipelineColumn {
  if (!listName?.trim()) return LEGAL_INTAKE_COLUMN;
  const trimmed = listName.trim();
  if (isLegalPipelineColumn(trimmed)) return trimmed;

  const value = normalized(trimmed);
  if (
    value.includes("nao contratado") ||
    value.includes("perdido") ||
    value.includes("perda") ||
    value.includes("lost") ||
    value.includes("arquiv")
  ) {
    return "Não contratado";
  }
  if (value.includes("document")) return "Documentação Pendente";
  if (value.includes("honorario") || value.includes("proposta") || value.includes("negociacao")) {
    return "Proposta / Honorários";
  }
  if (
    value.includes("convertido") ||
    value.includes("processo ativo") ||
    value.includes("contratado") ||
    value.includes("ganho") ||
    value.includes("fechado")
  ) {
    return "Convertido (Processo Ativo)";
  }
  if (
    value.includes("viabilidade") ||
    value.includes("qualific") ||
    value.includes("analise") ||
    value.includes("contato") ||
    value.includes("follow")
  ) {
    return "Análise de Viabilidade";
  }
  if (value.includes("triagem") || value.includes("novo") || value.includes("lead") || value.includes("intake")) {
    return "Triagem Inicial";
  }
  return LEGAL_STAGE_COLUMNS[stageFromPipelineList(trimmed)];
}

const SENSITIVE_TERMS = [
  "prazo",
  "audiencia",
  "audiência",
  "juiz",
  "juiza",
  "juíza",
  "prisao",
  "prisão",
  "liminar",
  "intimacao",
  "intimação",
  "citacao",
  "citação",
  "mandado",
  "depoimento",
] as const;

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function findSensitiveLegalTerms(text: string) {
  const haystack = normalized(text);
  const found: string[] = [];
  const seen = new Set<string>();
  for (const term of SENSITIVE_TERMS) {
    const needle = normalized(term);
    if (seen.has(needle)) continue;
    if (new RegExp(`(?:^|[^a-z0-9])${needle}(?:[^a-z0-9]|$)`).test(haystack)) {
      seen.add(needle);
      found.push(term);
    }
  }
  return found;
}

export function mergeLegalIntakeDetails(
  current: Record<string, string> | null | undefined,
  intake: {
    area?: string;
    summary?: string;
    urgency?: string;
    sensitiveTerms?: string[];
  },
): Record<string, string> {
  const next = { ...(current ?? {}) };
  if (!next.pipeline_list) next.pipeline_list = LEGAL_INTAKE_COLUMN;
  if (intake.area) next.area_direito = intake.area;
  if (intake.summary) next.resumo_caso = intake.summary.slice(0, 500);
  if (intake.urgency) next.urgencia = intake.urgency;
  if (intake.sensitiveTerms?.length) {
    next.sensitive_alert = "true";
    next.sensitive_terms = intake.sensitiveTerms.join(", ");
  }
  return next;
}
