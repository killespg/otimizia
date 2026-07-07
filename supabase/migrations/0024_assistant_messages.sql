-- Memória de conversa do Sócio-Assistente: log append-only por (user_id, org_id).
-- Cada pessoa tem sua própria conversa, separada por organização ativa (o prompt
-- de sistema e as ferramentas variam por workspace/org).
create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index assistant_messages_user_org_idx
  on public.assistant_messages (user_id, org_id, created_at);

alter table public.assistant_messages enable row level security;

-- Só select/insert — sem update nem delete, nem para o próprio dono. O log é
-- append-only por design: ninguém, nem o usuário autenticado, consegue apagar
-- via API/RLS. Só o service role (admin client) contorna isso, e nenhuma rota
-- do app usa admin client aqui.
create policy "assistant_messages_select_own" on public.assistant_messages
  for select using (auth.uid() = user_id);
create policy "assistant_messages_insert_own" on public.assistant_messages
  for insert with check (auth.uid() = user_id);
