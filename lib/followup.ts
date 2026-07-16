// 1.4 (Fase 1): follow-up por inatividade configurável por pipeline/etapa.
// Lógica pura — quem chama busca as linhas e cria a tarefa; isso só decide
// "quem precisa de um follow-up agora e com qual regra".
export type FollowupRule = {
  id: string;
  pipelineId: string | null;
  stageKey: string | null;
  inactivityDays: number;
  active: boolean;
};

export type DealForFollowup = {
  id: string;
  title: string;
  contactId: string | null;
  pipelineId: string | null;
  stage: string;
  lastActivityAt: string;
  hasOpenFollowupTask: boolean;
};

export type FollowupCandidate = {
  deal: DealForFollowup;
  rule: FollowupRule;
};

function specificity(rule: FollowupRule): number {
  return (rule.pipelineId !== null ? 1 : 0) + (rule.stageKey !== null ? 1 : 0);
}

// Regra mais específica vence quando mais de uma casa com o negócio (mesmo
// pipeline+etapa > só pipeline > só etapa > coringa total).
export function matchRule(rules: FollowupRule[], deal: DealForFollowup): FollowupRule | null {
  const candidates = rules.filter(
    (rule) =>
      rule.active &&
      (rule.pipelineId === null || rule.pipelineId === deal.pipelineId) &&
      (rule.stageKey === null || rule.stageKey === deal.stage)
  );
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => specificity(b) - specificity(a))[0];
}

export function computeFollowupCandidates(
  rules: FollowupRule[],
  deals: DealForFollowup[],
  now: Date = new Date()
): FollowupCandidate[] {
  const candidates: FollowupCandidate[] = [];
  for (const deal of deals) {
    if (deal.hasOpenFollowupTask) continue;
    const rule = matchRule(rules, deal);
    if (!rule) continue;
    const staleBefore = new Date(now.getTime() - rule.inactivityDays * 24 * 60 * 60 * 1000).toISOString();
    if (deal.lastActivityAt <= staleBefore) candidates.push({ deal, rule });
  }
  return candidates;
}
