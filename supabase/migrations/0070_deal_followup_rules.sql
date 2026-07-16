-- 1.4 (Fase 1): follow-up por inatividade configurável por pipeline/etapa.
-- "Configurável por etapa" pressupõe o schema da 1.1 (pipeline_id,
-- pipeline_stages.key) — por isso este item depende dela.
--
-- Reversível: rollback = numa migration nova,
--   alter table public.tasks drop column if exists source_rule_id;
--   alter table public.tasks drop column if exists source;
--   drop table if exists public.deal_followup_rules;

create table public.deal_followup_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  workspace_key text not null,
  -- null = aplica a qualquer pipeline do workspace; null em stage_key =
  -- aplica a qualquer etapa aberta. lib/followup.ts escolhe a regra mais
  -- específica quando mais de uma casa (mesmo pipeline+etapa > só pipeline
  -- > só etapa > nenhum dos dois).
  pipeline_id uuid,
  stage_key text,
  inactivity_days integer not null default 5 check (inactivity_days > 0),
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (org_id, pipeline_id) references public.pipelines (org_id, id) on delete cascade
);
create index deal_followup_rules_org_idx on public.deal_followup_rules (org_id, workspace_key) where active;

alter table public.deal_followup_rules enable row level security;
create policy "deal_followup_rules_all_org" on public.deal_followup_rules
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

-- Dedupe/cooldown do follow-up: em vez de uma tabela de log separada
-- (notification_log não serve — seu índice único por entity_id+kind
-- bloqueia permanentemente um segundo disparo pro mesmo negócio, e
-- follow-up precisa poder disparar de novo depois que a tarefa anterior
-- for concluída e o negócio esfriar outra vez). O dedupe é: "já existe uma
-- tarefa aberta com source='followup_rule' pra este negócio? então não cria
-- outra." Enquanto a tarefa anterior estiver aberta, ela já é o
-- lembrete — reabrir a inatividade só faz sentido depois que ela fecha.
alter table public.tasks
  add column if not exists source text check (source is null or source in ('followup_rule')),
  add column if not exists source_rule_id uuid references public.deal_followup_rules (id) on delete set null;
create index tasks_source_open_idx on public.tasks (deal_id, source) where done = false and source is not null;
