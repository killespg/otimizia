import { describe, expect, it } from "vitest";
import { buildContactTimeline, filterTimeline } from "@/lib/timeline";

describe("buildContactTimeline", () => {
  it("mescla interactions, tasks, visitas e propostas em ordem cronológica decrescente", () => {
    const timeline = buildContactTimeline({
      interactions: [{ id: "i1", body: "Ligou perguntando sobre o apê", created_at: "2026-01-10T10:00:00.000Z" }],
      tasks: [{ id: "t1", title: "Retornar contato", due_at: "2026-01-12T00:00:00.000Z", done: false, created_at: "2026-01-09T00:00:00.000Z" }],
      visits: [
        {
          id: "v1",
          status: "completed",
          scheduled_at: "2026-01-11T14:00:00.000Z",
          completed_at: "2026-01-11T15:00:00.000Z",
          created_at: "2026-01-08T00:00:00.000Z",
        },
      ],
      offers: [
        { id: "o1", status: "sent", amount_cents: 50000000, sent_at: "2026-01-13T00:00:00.000Z", created_at: "2026-01-07T00:00:00.000Z" },
      ],
    });

    expect(timeline.map((e) => e.kind)).toEqual(["offer", "task", "visit", "interaction"]);
    expect(timeline[0].title).toEqual("Proposta enviada");
  });

  it("usa due_at pra ordenar tarefa, e created_at quando não há prazo", () => {
    const timeline = buildContactTimeline({
      interactions: [],
      tasks: [{ id: "t1", title: "Sem prazo", due_at: null, done: false, created_at: "2026-01-05T00:00:00.000Z" }],
      visits: [],
      offers: [],
    });
    expect(timeline[0].at).toEqual("2026-01-05T00:00:00.000Z");
    expect(timeline[0].detail).toEqual("Sem prazo definido");
  });

  it("funciona sem visitas/propostas (workspaces fora do imobiliário)", () => {
    const timeline = buildContactTimeline({
      interactions: [{ id: "i1", body: "Nota", created_at: "2026-01-01T00:00:00.000Z" }],
      tasks: [],
    });
    expect(timeline).toHaveLength(1);
  });

  it("monta título e detalhe de ligação a partir de resultado/duração/próximo passo (2.6)", () => {
    const timeline = buildContactTimeline({
      interactions: [],
      tasks: [],
      calls: [{ id: "c1", duration_minutes: 8, outcome: "Vai pensar", next_step: "Retornar em 3 dias", created_at: "2026-01-01T00:00:00.000Z" }],
    });
    expect(timeline[0].title).toEqual("Ligação — Vai pensar");
    expect(timeline[0].detail).toEqual("8 min · Próximo passo: Retornar em 3 dias");
  });

  it("usa título genérico de ligação quando não há resultado registrado", () => {
    const timeline = buildContactTimeline({
      interactions: [],
      tasks: [],
      calls: [{ id: "c1", duration_minutes: null, outcome: null, next_step: null, created_at: "2026-01-01T00:00:00.000Z" }],
    });
    expect(timeline[0].title).toEqual("Ligação registrada");
    expect(timeline[0].detail).toBeNull();
  });
});

describe("filterTimeline", () => {
  const entries = buildContactTimeline({
    interactions: [{ id: "i1", body: "Nota", created_at: "2026-01-01T00:00:00.000Z" }],
    tasks: [{ id: "t1", title: "Tarefa", due_at: "2026-01-02T00:00:00.000Z", done: false, created_at: "2026-01-01T00:00:00.000Z" }],
  });

  it("retorna tudo com kind 'all'", () => {
    expect(filterTimeline(entries, "all")).toHaveLength(2);
  });

  it("filtra por tipo", () => {
    expect(filterTimeline(entries, "task")).toHaveLength(1);
    expect(filterTimeline(entries, "task")[0].kind).toEqual("task");
    expect(filterTimeline(entries, "visit")).toHaveLength(0);
  });
});
