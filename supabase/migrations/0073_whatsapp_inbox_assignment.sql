-- 2.2 (Fase 2): inbox comercial — atribuição manual de conversa. Decisão de
-- produto: sem rodízio automático, sem SLA calibrado por dado real (fixo
-- em 2h, ver lib/inbox-sla.ts) — atribuição é o corretor escolhendo pra si
-- ou repassando pra outro membro da organização.
--
-- Reversível: rollback = `alter table public.whatsapp_conversations
--   drop column if exists assignee_id;` numa migration nova.
alter table public.whatsapp_conversations
  add column if not exists assignee_id uuid references auth.users (id) on delete set null;

create index whatsapp_conversations_assignee_idx on public.whatsapp_conversations (assignee_id);
