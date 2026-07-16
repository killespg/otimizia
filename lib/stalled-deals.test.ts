import { describe, expect, it } from "vitest";
import { computeStalledDeals, getStalledDealsByUser } from "@/lib/stalled-deals";

type Row = Record<string, unknown>;

// Mock mínimo do client do Supabase: cada chamada de filtro (.eq/.not/.lte/
// .or/.in) só precisa devolver `this` pra manter a fluent API — os dados
// retornados vêm fixos por tabela, não são de fato filtrados pelo mock.
// Isso cobre o que importa aqui: a lógica de "parado ou não" e o
// agrupamento por usuário, que é o que o refactor de computeStalledDeals
// precisa preservar. Não valida que os filtros de org/owner são aplicados
// na query de verdade (isso é coberto pelos testes de RLS/integração).
function fakeAdmin(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      const builder = {
        select: () => builder,
        not: () => builder,
        lte: () => builder,
        eq: () => builder,
        or: () => builder,
        in: () => builder,
        then: (resolve: (v: { data: Row[] }) => void) => resolve({ data: rows }),
      };
      return builder;
    },
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

const STALE_DATE = "2020-01-01T00:00:00.000Z";
const RECENT_DATE = new Date().toISOString();

describe("computeStalledDeals", () => {
  it("marca como parado um negócio aberto sem interação recente", async () => {
    const admin = fakeAdmin({
      deals: [
        { id: "d1", title: "Negócio parado", contact_id: "c1", assignee_id: "u1", owner_id: "u1", created_at: STALE_DATE },
      ],
      interactions: [],
      contacts: [{ id: "c1", name: "Cliente Parado" }],
    });

    const stalled = await computeStalledDeals(admin);
    expect(stalled).toHaveLength(1);
    expect(stalled[0]).toMatchObject({ id: "d1", contactName: "Cliente Parado", assigneeId: "u1" });
  });

  it("não marca como parado quando há interação recente no contato", async () => {
    const admin = fakeAdmin({
      deals: [
        { id: "d1", title: "Negócio ativo", contact_id: "c1", assignee_id: "u1", owner_id: "u1", created_at: STALE_DATE },
      ],
      interactions: [{ contact_id: "c1", created_at: RECENT_DATE }],
      contacts: [{ id: "c1", name: "Cliente Ativo" }],
    });

    const stalled = await computeStalledDeals(admin);
    expect(stalled).toHaveLength(0);
  });

  it("usa owner_id quando assignee_id é nulo", async () => {
    const admin = fakeAdmin({
      deals: [{ id: "d1", title: "Sem responsável", contact_id: null, assignee_id: null, owner_id: "dono", created_at: STALE_DATE }],
      interactions: [],
      contacts: [],
    });

    const stalled = await computeStalledDeals(admin);
    expect(stalled[0].assigneeId).toEqual("dono");
    expect(stalled[0].contactName).toBeNull();
  });
});

describe("getStalledDealsByUser", () => {
  it("agrupa negócios parados por usuário responsável", async () => {
    const admin = fakeAdmin({
      deals: [
        { id: "d1", title: "Negócio 1", contact_id: null, assignee_id: "u1", owner_id: "u1", created_at: STALE_DATE },
        { id: "d2", title: "Negócio 2", contact_id: null, assignee_id: "u1", owner_id: "u1", created_at: STALE_DATE },
        { id: "d3", title: "Negócio 3", contact_id: null, assignee_id: "u2", owner_id: "u2", created_at: STALE_DATE },
      ],
      interactions: [],
      contacts: [],
    });

    const byUser = await getStalledDealsByUser(admin);
    expect(byUser.get("u1")).toHaveLength(2);
    expect(byUser.get("u2")).toHaveLength(1);
  });
});
