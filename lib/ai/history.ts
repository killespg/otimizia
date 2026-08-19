import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage, ConversationSummary } from "@/lib/ai/types";
import { NIL_CONVERSATION_UUID } from "@/lib/ai/types";

const DEFAULT_LIMIT = 30;

// Marca uma foto anexada no fim do texto salvo (ver route.ts do assistente) —
// evita precisar de coluna própria pra imagem na tabela, que é append-only.
const IMAGE_MARKER = /\n\n\[imagem:(.+?)\]$/;

function parseStoredContent(raw: string): { content: string; imageUrl?: string } {
  const match = raw.match(IMAGE_MARKER);
  if (!match) return { content: raw };
  return { content: raw.slice(0, match.index).trimEnd(), imageUrl: match[1] };
}

// assistant_messages é append-only (RLS só libera select/insert — ver
// 0024_assistant_messages.sql). Nunca chamar delete/update nela.
//
// conversationId:
//  - string: retorna só as mensagens daquela conversa.
//  - null: retorna as mensagens "clássicas" (sem conversation_id), o fluxo
//    de antes da 0085. É o default para manter o comportamento atual.
//
// Se a migration 0085 ainda não foi aplicada no banco (coluna
// conversation_id inexistente), cai pro fluxo clássico — o chat continua
// funcionando mesmo com o deploy atrasado em relação às migrations.
function isColumnMissingError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "42703" ||
    code === "PGRST204" ||
    /conversation_id/.test(message) ||
    /column .* does not exist/i.test(message)
  );
}

export async function getRecentAssistantMessages(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  limit: number = DEFAULT_LIMIT,
  conversationId?: string | null
): Promise<ChatMessage[]> {
  const queryFor = (withConversationColumn: boolean) => {
    let query = supabase
      .from("assistant_messages")
      .select("role, content, created_at")
      .eq("user_id", userId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (withConversationColumn) {
      if (conversationId) query = query.eq("conversation_id", conversationId);
      else query = query.is("conversation_id", null);
    }
    return query;
  };

  const toMessages = (rows: unknown) =>
    ((rows ?? []) as Array<{ role: string; content: string; created_at: string | null }>)
      .slice()
      .reverse()
      .map((row) => ({
        role: row.role as ChatMessage["role"],
        createdAt: row.created_at ?? undefined,
        ...parseStoredContent(row.content),
      }));

  const { data, error } = await queryFor(true);
  if (error) {
    if (!isColumnMissingError(error)) {
      console.error("[ai/history]", error);
      return [];
    }
    const { data: fallbackData, error: fallbackError } = await queryFor(false);
    if (fallbackError) {
      console.error("[ai/history]", fallbackError);
      return [];
    }
    return toMessages(fallbackData);
  }
  return toMessages(data);
}

// A conversa mais recente do usuário: a que a última mensagem pertence.
// Retorna null quando o histórico é todo "clássico" (anterior à 0085).
export async function resolveLatestConversationId(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("assistant_messages")
    .select("conversation_id")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (!isColumnMissingError(error)) {
      console.error("[ai/history]", error);
    }
    return null;
  }
  return (data?.conversation_id as string | null) ?? null;
}

export async function saveAssistantMessage(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  role: ChatMessage["role"],
  content: string,
  conversationId?: string | null
): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) return;

  const { error } = await supabase.from("assistant_messages").insert({
    user_id: userId,
    org_id: orgId,
    role,
    content: trimmed,
    conversation_id: conversationId ?? null,
  });
  if (error) {
    if (!isColumnMissingError(error)) {
      console.error("[ai/history]", error);
      return;
    }
    // Migration 0085 ainda não aplicada: tenta o insert clássico.
    const { error: fallbackError } = await supabase.from("assistant_messages").insert({
      user_id: userId,
      org_id: orgId,
      role,
      content: trimmed,
    });
    if (fallbackError) console.error("[ai/history]", fallbackError);
  }
}

type ConversationRow = {
  conversation_id: string | null;
  preview: string | null;
  last_at: string | null;
};

// Lista as conversas do usuário, mais recente primeiro, via RPC
// list_assistant_conversations (migration 0086). A conversa clássica
// (conversation_id NULL) volta com id null.
//
// Quando o RPC existe no banco mas o schema cache do PostgREST ainda não o
// conhece (PGRST202), o fallback agrupa por conversation_id em JS em vez de
// devolver uma única "conversa clássica" enganosa — que era o bug em que a
// conversa antiga sumia do histórico. Só se a coluna conversation_id não
// existir mesmo (migration 0085 não aplicada) é que cai pra conversa clássica
// única montada a partir da última mensagem.
export async function listAssistantConversations(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  limit: number = 50
): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc("list_assistant_conversations", {
    p_user_id: userId,
    p_org_id: orgId,
    p_limit: limit,
  });

  if (error) {
    if (error.code === "PGRST202") {
      return listConversationsByGrouping(supabase, userId, orgId, limit);
    }
    console.error("[ai/history]", error);
    return [];
  }

  return ((data ?? []) as ConversationRow[])
    .map((row) => ({
      id: row.conversation_id && row.conversation_id !== NIL_CONVERSATION_UUID ? row.conversation_id : null,
      preview: (row.preview ?? "").split("\n")[0]?.slice(0, 120) ?? "",
      lastAt: row.last_at ?? new Date().toISOString(),
    }))
    .filter((row) => row.preview.length > 0);
}

// Fallback do PGRST202: repete o agrupamento do RPC em JS. As linhas vêm
// ordenadas por created_at desc, então a primeira vez que um grupo aparece
// é a mensagem mais recente dele; o preview usa a primeira mensagem com
// conteúdo não vazio do grupo.
async function listConversationsByGrouping(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  limit: number
): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from("assistant_messages")
    .select("conversation_id, content, created_at")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    if (!isColumnMissingError(error)) {
      console.error("[ai/history]", error);
      return [];
    }
    // Coluna conversation_id não existe: não tem como agrupar. Mantém o
    // comportamento de antes da 0085, uma única conversa clássica.
    return listSingleClassicConversation(supabase, userId, orgId);
  }

  type Group = { lastAt: string; preview: string };
  const groups = new Map<string | null, Group>();

  for (const row of (data ?? []) as Array<{
    conversation_id: string | null;
    content: string | null;
    created_at: string | null;
  }>) {
    const key = row.conversation_id ?? null;
    const content = (row.content ?? "").trim();
    const lastAt = row.created_at ?? new Date().toISOString();
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { lastAt, preview: content });
    } else {
      if (lastAt > existing.lastAt) existing.lastAt = lastAt;
      if (!existing.preview && content) existing.preview = content;
    }
  }

  return Array.from(groups.entries())
    .sort((a, b) => (b[1].lastAt < a[1].lastAt ? -1 : b[1].lastAt > a[1].lastAt ? 1 : 0))
    .slice(0, limit)
    .map(([key, group]) => ({
      id: key === NIL_CONVERSATION_UUID ? null : key,
      preview: group.preview.split("\n")[0]?.slice(0, 120) ?? "",
      lastAt: group.lastAt,
    }))
    .filter((row) => row.preview.length > 0);
}

// Fallback final (banco ainda sem a coluna conversation_id): devolve a
// conversa clássica única a partir da última mensagem salva.
async function listSingleClassicConversation(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<ConversationSummary[]> {
  const { data: rows, error } = await supabase
    .from("assistant_messages")
    .select("content, created_at")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("[ai/history]", error);
    return [];
  }
  const latest = (rows ?? [])[0];
  if (!latest?.content) return [];
  return [
    {
      id: null,
      preview: latest.content.split("\n")[0]?.slice(0, 120) ?? "",
      lastAt: (latest.created_at as string | null) ?? new Date().toISOString(),
    },
  ];
}
