-- 2.4 (Fase 2): webhooks de saída + API pública de leitura (chaves com
-- escopo). Depende de 1.1/1.2 (eventos de domínio estáveis) — reaproveita
-- crm_domain_events (0060_real_estate_visits_and_events.sql) como fonte de
-- verdade dos eventos, em vez de criar uma fila paralela.
--
-- Reversível: rollback = numa migration nova,
--   drop trigger if exists crm_domain_events_enqueue_webhooks on public.crm_domain_events;
--   drop function if exists public.enqueue_webhook_deliveries();
--   drop trigger if exists deals_emit_domain_event on public.deals;
--   drop function if exists public.emit_deal_domain_event();
--   drop table if exists public.webhook_deliveries;
--   drop table if exists public.webhook_endpoints;
--   drop table if exists public.api_keys;

-- crm_domain_events hoje só recebe evento de visita (RE-3xx). Estende pra
-- negócio: criação e mudança de etapa — os dois eventos "críticos" que o
-- roadmap pede pra Fase 2.
create or replace function public.emit_deal_domain_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.crm_domain_events (org_id, event_type, aggregate_type, aggregate_id, idempotency_key, payload)
    values (
      new.org_id, 'deal.created', 'deal', new.id, 'deal.created:' || new.id,
      jsonb_build_object('deal_id', new.id, 'stage', new.stage, 'title', new.title, 'workspace_key', new.workspace_key)
    )
    on conflict (idempotency_key) do nothing;
  elsif tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    insert into public.crm_domain_events (org_id, event_type, aggregate_type, aggregate_id, idempotency_key, payload)
    values (
      new.org_id, 'deal.stage_changed', 'deal', new.id,
      -- clock_timestamp() (não now(), que fica fixo por transação) garante
      -- uma idempotency_key distinta mesmo se o mesmo negócio mudar de
      -- etapa mais de uma vez na mesma transação.
      'deal.stage_changed:' || new.id || ':' || extract(epoch from clock_timestamp())::text,
      jsonb_build_object('deal_id', new.id, 'from_stage', old.stage, 'to_stage', new.stage, 'title', new.title, 'workspace_key', new.workspace_key)
    );
  end if;
  return new;
end;
$$;

create trigger deals_emit_domain_event
  after insert or update on public.deals
  for each row execute function public.emit_deal_domain_event();

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  url text not null,
  secret text not null,
  event_types text[] not null,
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index webhook_endpoints_org_idx on public.webhook_endpoints (org_id) where active;

alter table public.webhook_endpoints enable row level security;
-- Só admin gerencia — o "secret" de assinatura HMAC é dado sensível, mesma
-- régua de organization_members/audit_log (0.3).
create policy "webhook_endpoints_admin" on public.webhook_endpoints
  for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  endpoint_id uuid not null references public.webhook_endpoints (id) on delete cascade,
  event_id uuid not null references public.crm_domain_events (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  response_status integer,
  created_at timestamptz not null default now(),
  unique (endpoint_id, event_id)
);
create index webhook_deliveries_pending_idx
  on public.webhook_deliveries (created_at) where status in ('pending', 'failed');

alter table public.webhook_deliveries enable row level security;
create policy "webhook_deliveries_admin_select" on public.webhook_deliveries
  for select using (public.is_org_admin(org_id));

-- Enfileira uma entrega por endpoint ativo que assina aquele event_type.
-- Idempotente por construção: (endpoint_id, event_id) é único.
create or replace function public.enqueue_webhook_deliveries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.webhook_deliveries (org_id, endpoint_id, event_id)
  select new.org_id, e.id, new.id
  from public.webhook_endpoints e
  where e.org_id = new.org_id and e.active and new.event_type = any (e.event_types)
  on conflict (endpoint_id, event_id) do nothing;
  return new;
end;
$$;

create trigger crm_domain_events_enqueue_webhooks
  after insert on public.crm_domain_events
  for each row execute function public.enqueue_webhook_deliveries();

-- API pública de leitura: chave por organização, com escopo (só 'read'
-- emitido hoje — o schema já suporta mais escopos quando a API ganhar
-- escrita, sem migração nova).
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  scopes text[] not null default array['read'],
  created_by uuid references auth.users (id) on delete set null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index api_keys_org_idx on public.api_keys (org_id) where revoked_at is null;

alter table public.api_keys enable row level security;
create policy "api_keys_admin" on public.api_keys
  for all using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
