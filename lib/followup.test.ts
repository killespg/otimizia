import { describe, expect, it } from "vitest";
import { computeFollowupCandidates, matchRule, type DealForFollowup, type FollowupRule } from "@/lib/followup";

function rule(overrides: Partial<FollowupRule> = {}): FollowupRule {
  return { id: "r1", pipelineId: null, stageKey: null, inactivityDays: 5, active: true, ...overrides };
}

function deal(overrides: Partial<DealForFollowup> = {}): DealForFollowup {
  return {
    id: "d1",
    title: "Negócio",
    contactId: "c1",
    pipelineId: "p1",
    stage: "em_contato",
    lastActivityAt: "2020-01-01T00:00:00.000Z",
    hasOpenFollowupTask: false,
    ...overrides,
  };
}

describe("matchRule", () => {
  it("prefere a regra mais específica (pipeline + etapa) sobre um coringa", () => {
    const specific = rule({ id: "specific", pipelineId: "p1", stageKey: "em_contato", inactivityDays: 2 });
    const wildcard = rule({ id: "wildcard", inactivityDays: 10 });
    const matched = matchRule([wildcard, specific], deal());
    expect(matched?.id).toEqual("specific");
  });

  it("ignora regra inativa", () => {
    expect(matchRule([rule({ active: false })], deal())).toBeNull();
  });

  it("não casa regra de outro pipeline ou outra etapa", () => {
    expect(matchRule([rule({ pipelineId: "outro-pipeline" })], deal())).toBeNull();
    expect(matchRule([rule({ stageKey: "negociacao" })], deal())).toBeNull();
  });
});

describe("computeFollowupCandidates", () => {
  const now = new Date("2026-01-15T00:00:00.000Z");

  it("cria candidato quando o negócio está inativo há mais que inactivity_days", () => {
    const candidates = computeFollowupCandidates(
      [rule({ inactivityDays: 5 })],
      [deal({ lastActivityAt: "2026-01-01T00:00:00.000Z" })],
      now
    );
    expect(candidates).toHaveLength(1);
  });

  it("não cria candidato quando ainda dentro do prazo de inatividade", () => {
    const candidates = computeFollowupCandidates(
      [rule({ inactivityDays: 5 })],
      [deal({ lastActivityAt: "2026-01-14T00:00:00.000Z" })],
      now
    );
    expect(candidates).toHaveLength(0);
  });

  it("não cria candidato quando já existe tarefa de follow-up aberta (dedupe/cooldown)", () => {
    const candidates = computeFollowupCandidates(
      [rule({ inactivityDays: 5 })],
      [deal({ lastActivityAt: "2026-01-01T00:00:00.000Z", hasOpenFollowupTask: true })],
      now
    );
    expect(candidates).toHaveLength(0);
  });

  it("não cria candidato quando nenhuma regra casa com o negócio", () => {
    const candidates = computeFollowupCandidates(
      [rule({ pipelineId: "outro" })],
      [deal({ lastActivityAt: "2026-01-01T00:00:00.000Z" })],
      now
    );
    expect(candidates).toHaveLength(0);
  });
});
