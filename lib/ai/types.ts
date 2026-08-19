// Sentinel que identifica a conversa "clássica" (pré-0085, sem
// conversation_id) nas listagens e nas chamadas à API — mesmo critério da
// migration 0086. Mensagens clássicas têm conversation_id NULL, então este
// uuid serve só como representação no transporte (query params, respostas).
export const NIL_CONVERSATION_UUID = "00000000-0000-0000-0000-000000000000";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  attachmentName?: string;
  createdAt?: string;
};

// Resumo de uma conversa antiga com o Tim, listado no painel de histórico.
// id === null identifica a conversa "clássica" (mensagens anteriores à 0085,
// sem conversation_id) — o fluxo único que existia antes do novo chat.
export type ConversationSummary = {
  id: string | null;
  preview: string;
  lastAt: string;
};
