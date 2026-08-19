import { stageFromPipelineList } from "@/lib/crm/pipeline-stage";
import type { DealStage } from "@/lib/supabase/types";

export type PipelineMeta = { dot: string; chip: string; empty: string };

const STAGE_META: Record<DealStage, PipelineMeta> = {
  novo: {
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-200",
    empty: "Novos cards entram aqui.",
  },
  em_contato: {
    dot: "bg-brand-500",
    chip: "bg-brand-50 text-brand-700",
    empty: "Sem cards nesta lista.",
  },
  negociacao: {
    dot: "bg-warning-500",
    chip: "bg-warning-50 text-warning-700",
    empty: "Nenhum card agora.",
  },
  ganho: {
    dot: "bg-success-500",
    chip: "bg-success-50 text-success-700 dark:bg-[#062d1c] dark:text-[#9ff0c5]",
    empty: "Nenhum card fechado.",
  },
  perdido: {
    dot: "bg-danger-500",
    chip: "bg-danger-50 text-danger-700 dark:bg-[#3a0b08] dark:text-[#ffb4ac]",
    empty: "Sem cards perdidos.",
  },
};

export function pipelineMetaFromList(listName: string): PipelineMeta {
  return STAGE_META[stageFromPipelineList(listName)];
}
