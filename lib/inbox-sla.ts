// 2.2 (Fase 2): SLA de resposta do inbox comercial. Fixo em 2h (decisão de
// produto, não calibrado por dado real ainda — ver
// docs/roadmap-imobiliario/2.2-inbox-omnicanal.md).
export const SLA_HOURS = 2;

export type ConversationSla = {
  waitingReply: boolean;
  breached: boolean;
  hoursWaiting: number | null;
};

export function computeConversationSla(
  lastInboundAt: string | null,
  lastOutboundAt: string | null,
  now: Date = new Date(),
  slaHours: number = SLA_HOURS
): ConversationSla {
  if (!lastInboundAt) return { waitingReply: false, breached: false, hoursWaiting: null };

  const waitingReply = !lastOutboundAt || lastOutboundAt < lastInboundAt;
  if (!waitingReply) return { waitingReply: false, breached: false, hoursWaiting: null };

  const hoursWaiting = (now.getTime() - new Date(lastInboundAt).getTime()) / (60 * 60 * 1000);
  return { waitingReply: true, breached: hoursWaiting > slaHours, hoursWaiting };
}
