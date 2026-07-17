// 3.1 (Fase 3): motor de regras v1 — renderização de template simples
// ({{caminho.aninhado}}) usado pelas ações create_task/send_email. Sem
// lógica condicional nem loop — só substituição de variável, o suficiente
// pros templates do v1 (título de tarefa, assunto/corpo de e-mail).
export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path: string) => {
    const value = path
      .split(".")
      .reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), vars);
    return value === undefined || value === null ? "" : String(value);
  });
}

export type EventRuleScope = {
  pipelineId: string | null;
  stageKey: string | null;
};

export type EventForMatching = {
  pipelineId: string | null;
  stage: string | null;
};

// Filtra regras de gatilho por evento (deal_created/deal_stage_changed) —
// mesmo coringa de pipeline/etapa de 1.4/3.1 deal_inactive: null = qualquer
// pipeline/etapa. Pra deal_stage_changed, stage_key é a etapa de destino
// que dispara a regra (ex: só notificar quando o negócio chega em "ganho").
export function matchesEventRuleScope(rule: EventRuleScope, event: EventForMatching): boolean {
  if (rule.pipelineId !== null && rule.pipelineId !== event.pipelineId) return false;
  if (rule.stageKey !== null && rule.stageKey !== event.stage) return false;
  return true;
}
