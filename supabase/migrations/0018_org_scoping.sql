-- Colunas de escopo por organização (ainda nullable — o backfill em 0013
-- preenche os valores antes de travar not null e trocar as FKs compostas).
alter table public.contacts add column if not exists org_id uuid references public.organizations (id) on delete cascade;
alter table public.deals add column if not exists org_id uuid references public.organizations (id) on delete cascade;
alter table public.tasks add column if not exists org_id uuid references public.organizations (id) on delete cascade;
alter table public.interactions add column if not exists org_id uuid references public.organizations (id) on delete cascade;

-- Distribuição de tarefas: responsável atual e (se houver) alvo de uma
-- solicitação de transferência pendente de aceite.
alter table public.tasks add column if not exists assignee_id uuid references auth.users (id) on delete set null;
alter table public.tasks add column if not exists pending_assignee_id uuid references auth.users (id) on delete set null;
