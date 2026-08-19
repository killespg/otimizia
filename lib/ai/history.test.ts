import { describe, expect, it, vi } from "vitest";
import { NIL_CONVERSATION_UUID } from "./types";
import { listAssistantConversations } from "./history";

type GroupedRow = {
  conversation_id: string | null;
  content: string | null;
  created_at: string | null;
};

// Mock encadeável do cliente Supabase: rpc() e from().select()...limit()
// retornam o que cada cenário precisa. O segundo from() simula o fallback
// "clássico" (sem a coluna conversation_id).
function buildSupabaseMock(options: {
  rpcError?: { code: string; message: string } | null;
  rows?: GroupedRow[];
  queryError?: { code: string; message: string } | null;
  classicRow?: { content: string; created_at: string | null } | null;
} = {}) {
  const { rpcError = null, rows = [], queryError = null, classicRow = null } = options;

  const groupedChain: Record<string, unknown> = {};
  groupedChain.select = () => groupedChain;
  groupedChain.eq = () => groupedChain;
  groupedChain.order = () => groupedChain;
  groupedChain.limit = () => ({ data: rows, error: queryError });

  const classicChain: Record<string, unknown> = {};
  classicChain.select = () => classicChain;
  classicChain.eq = () => classicChain;
  classicChain.order = () => classicChain;
  classicChain.limit = () => ({ data: classicRow ? [classicRow] : [], error: null });

  const rpc = vi.fn<() => Promise<{ data: unknown; error: { code: string; message: string } | null }>>(
    async () => ({ data: null, error: rpcError })
  );
  let queryCalls = 0;
  const from = vi.fn(() => {
    queryCalls += 1;
    return queryCalls === 1 ? groupedChain : classicChain;
  });

  return { rpc, from };
}

type MockedSupabase = ReturnType<typeof buildSupabaseMock>;

function asSupabase(mock: MockedSupabase) {
  return mock as unknown as Parameters<typeof listAssistantConversations>[0];
}

describe("listAssistantConversations", () => {
  it("usa o RPC quando ele responde (mapeando o uuid NIL para a conversa clássica)", async () => {
    const mock = buildSupabaseMock();
    mock.rpc.mockResolvedValueOnce({
      data: [
        {
          conversation_id: "33333333-3333-3333-3333-333333333333",
          preview: "Nova conversa",
          last_at: "2026-08-02T10:00:00Z",
        },
        { conversation_id: NIL_CONVERSATION_UUID, preview: "Clássica", last_at: "2026-08-01T10:00:00Z" },
      ],
      error: null,
    });

    const result = await listAssistantConversations(asSupabase(mock), "user-1", "org-1", 50);

    expect(result).toEqual([
      { id: "33333333-3333-3333-3333-333333333333", preview: "Nova conversa", lastAt: "2026-08-02T10:00:00Z" },
      { id: null, preview: "Clássica", lastAt: "2026-08-01T10:00:00Z" },
    ]);
  });

  it("agrupa por conversation_id em JS quando o RPC falha com PGRST202", async () => {
    const mock = buildSupabaseMock({
      rpcError: {
        code: "PGRST202",
        message: "Could not find the function public.list_assistant_conversations in the schema cache",
      },
      rows: [
        {
          conversation_id: "33333333-3333-3333-3333-333333333333",
          content: "Resposta da nova conversa",
          created_at: "2026-08-02T10:01:00Z",
        },
        { conversation_id: null, content: "Resposta clássica", created_at: "2026-08-01T10:01:00Z" },
        {
          conversation_id: "33333333-3333-3333-3333-333333333333",
          content: "Mensagem da nova conversa",
          created_at: "2026-08-02T10:00:00Z",
        },
        { conversation_id: null, content: "Mensagem clássica antiga", created_at: "2026-08-01T10:00:00Z" },
      ],
    });

    const result = await listAssistantConversations(asSupabase(mock), "user-1", "org-1", 50);

    expect(result).toEqual([
      {
        id: "33333333-3333-3333-3333-333333333333",
        preview: "Resposta da nova conversa",
        lastAt: "2026-08-02T10:01:00Z",
      },
      { id: null, preview: "Resposta clássica", lastAt: "2026-08-01T10:01:00Z" },
    ]);
  });

  it("usa a primeira linha como preview e limita a 120 caracteres", async () => {
    const mock = buildSupabaseMock({
      rpcError: { code: "PGRST202", message: "function not in schema cache" },
      rows: [
        {
          conversation_id: null,
          content: "Linha um com bastante texto\nLinha dois",
          created_at: "2026-08-01T10:00:00Z",
        },
      ],
    });

    const result = await listAssistantConversations(asSupabase(mock), "user-1", "org-1", 50);

    expect(result[0]?.preview).toBe("Linha um com bastante texto");
    expect(result[0]?.preview?.length).toBeLessThanOrEqual(120);
  });

  it("cai para a conversa clássica única quando a coluna conversation_id não existe", async () => {
    const mock = buildSupabaseMock({
      rpcError: { code: "PGRST202", message: "function not in schema cache" },
      queryError: { code: "42703", message: 'column assistant_messages.conversation_id does not exist' },
      classicRow: { content: "Última mensagem clássica", created_at: "2026-08-01T10:00:00Z" },
    });

    const result = await listAssistantConversations(asSupabase(mock), "user-1", "org-1", 50);

    expect(result).toEqual([
      { id: null, preview: "Última mensagem clássica", lastAt: "2026-08-01T10:00:00Z" },
    ]);
  });

  it("devolve lista vazia para erros não previstos do RPC", async () => {
    const mock = buildSupabaseMock({ rpcError: { code: "PGRST300", message: "database error" } });

    const result = await listAssistantConversations(asSupabase(mock), "user-1", "org-1", 50);

    expect(result).toEqual([]);
  });
});
