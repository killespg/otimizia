-- Novo chat com o Tim: cada conversa passa a ter um conversation_id para que
-- o histórico não seja um único fluxo linear. Mensagens antigas (anterior a
-- esta migration) ficam com conversation_id NULL e são tratadas como a
-- conversa "padrão" — o comportamento atual continua intacto.
alter table public.assistant_messages
  add column if not exists conversation_id uuid;

create index if not exists assistant_messages_conversation_idx
  on public.assistant_messages (user_id, org_id, conversation_id, created_at);
