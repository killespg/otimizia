-- 3.1 (Fase 3): motor de regras v1. Migra o follow-up por inatividade
-- (1.4, deal_followup_rules) pra dentro de um motor genérico — mesmo
-- comportamento observável (dedupe por tarefa aberta, regra mais
-- específica vence), sem manter duas implementações concorrentes
-- (explicitamente pedido pelo roadmap). deal_followup_rules nunca chegou
-- a rodar em produção (introduzida nesta mesma leva de PRs), então a
-- migração de dados abaixo é por completude/consistência, não por
-- necessidade real de preservar dado de cliente.
--
-- Reversível: rollback = numa migration nova,
--   drop table if exists public.automation_executions;
--   drop table if exists public.automation_rules;
--   alter table public.tasks drop constraint if exists tasks_source_check;
--   alter table public.tasks add constraint tasks_source_check
--     check (source is null or source in ('followup_rule'));
--   -- e recriar deal_followup_rules exatamente como em 0070, se precisar
--   -- do dado de volta (não recomendado — recrie a regra pela UI nova).

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  workspace_key text not null,
  name text not null default 'Regra sem nome',
  trigger_kind text not null check (trigger_kind in ('deal_created', 'deal_stage_changed', 'deal_inactive')),
  -- deal_inactive: {"inactivity_days": N}. deal_stage_changed: {"to_stage": "..."} opcional (ausente = qualquer mudança de etapa).
  trigger_params jsonb not null default '{}',
  -- Coringas de escopo (null = qualquer pipeline/etapa), mesmo padrão de deal_followup_rules.
  pipeline_id uuid,
  stage_key text,
  action_type text not null check (action_type in ('create_task', 'send_email', 'change_stage')),
  -- create_task: {"title_template": "..."}. send_email: {"subject_template": "...", "body_template": "..."}. change_stage: {"to_stage": "..."}.
  action_params jsonb not null default '{}',
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (org_id, pipeline_id) references public.pipelines (org_id, id) on delete cascade
);
create index automation_rules_org_idx on public.automation_rules (org_id, workspace_key) where active;

alter table public.automation_rules enable row level security;
create policy "automation_rules_all_org" on public.automation_rules
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create table public.automation_executions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  rule_id uuid not null references public.automation_rules (id) on delete cascade,
  -- Presente pra gatilhos de evento discreto (deal_created/deal_stage_changed);
  -- null pra deal_inactive, que é checado por polling, não por evento.
  event_id uuid references public.crm_domain_events (id) on delete set null,
  deal_id uuid,
  status text not null check (status in ('success', 'failed', 'skipped')),
  error_message text,
  created_at timestamptz not null default now()
);
-- Dedupe pra gatilho de evento: a mesma regra nunca executa duas vezes pro
-- mesmo evento. deal_inactive não tem essa garantia de banco — dedupe dele
-- continua sendo "já existe tarefa aberta" (lógica de aplicação, igual à 1.4).
create unique index automation_executions_rule_event_unique
  on public.automation_executions (rule_id, event_id) where event_id is not null;
create index automation_executions_rule_idx on public.automation_executions (rule_id, created_at desc);

alter table public.automation_executions enable row level security;
create policy "automation_executions_admin_select" on public.automation_executions
  for select using (public.is_org_admin(org_id));

alter table public.tasks drop constraint if exists tasks_source_check;
alter table public.tasks add constraint tasks_source_check
  check (source is null or source in ('followup_rule', 'automation_rule'));

insert into public.automation_rules
  (org_id, workspace_key, name, trigger_kind, trigger_params, pipeline_id, stage_key, action_type, action_params, active, created_at)
select
  org_id, workspace_key, 'Follow-up por inatividade (migrado da 1.4)', 'deal_inactive',
  jsonb_build_object('inactivity_days', inactivity_days), pipeline_id, stage_key,
  'create_task', jsonb_build_object('title_template', 'Retomar contato — {{deal.title}}'),
  active, created_at
from public.deal_followup_rules;

drop table public.deal_followup_rules;
