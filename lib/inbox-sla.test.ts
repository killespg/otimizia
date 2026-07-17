import { describe, expect, it } from "vitest";
import { computeConversationSla } from "@/lib/inbox-sla";

const now = new Date("2026-01-15T12:00:00.000Z");

describe("computeConversationSla", () => {
  it("não está esperando resposta quando nunca houve mensagem inbound", () => {
    expect(computeConversationSla(null, null, now)).toEqual({ waitingReply: false, breached: false, hoursWaiting: null });
  });

  it("não está esperando quando a última mensagem outbound é mais recente que a inbound", () => {
    const sla = computeConversationSla("2026-01-15T10:00:00.000Z", "2026-01-15T11:00:00.000Z", now);
    expect(sla.waitingReply).toBe(false);
  });

  it("está dentro do SLA quando esperando há menos de 2h", () => {
    const sla = computeConversationSla("2026-01-15T11:00:00.000Z", null, now);
    expect(sla.waitingReply).toBe(true);
    expect(sla.breached).toBe(false);
    expect(sla.hoursWaiting).toEqual(1);
  });

  it("estoura o SLA quando esperando há mais de 2h", () => {
    const sla = computeConversationSla("2026-01-15T09:00:00.000Z", null, now);
    expect(sla.waitingReply).toBe(true);
    expect(sla.breached).toBe(true);
  });

  it("volta a esperar quando chega novo inbound depois do último outbound", () => {
    const sla = computeConversationSla("2026-01-15T11:30:00.000Z", "2026-01-15T10:00:00.000Z", now);
    expect(sla.waitingReply).toBe(true);
  });
});
