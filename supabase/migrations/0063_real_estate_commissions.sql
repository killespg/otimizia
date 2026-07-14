-- Vertical imobiliário, Fase 6 do plano de evolução (RE-6xx): comissão e
-- metas por corretor/equipe.
--
-- Reversível: rollback = rodar numa migration nova:
--   drop table if exists public.real_estate_targets;
--   drop table if exists public.real_estate_commissions;

create table public.real_estate_commissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  deal_id uuid not null,
  property_id uuid not null,
  broker_id uuid not null references auth.users(id) on delete restrict,
  gross_sale_value_cents integer not null check (gross_sale_value_cents >= 0),
  commission_percent numeric(5,2) not null check (commission_percent >= 0 and commission_percent <= 100),
  expected_amount_cents integer not null check (expected_amount_cents >= 0),
  received_amount_cents integer not null default 0 check (received_amount_cents >= 0),
  -- "Vencida" (RE-6xx: "prevista/vencida/parcial/recebida") é derivado
  -- (status='expected' e due_at no passado), não um valor guardado — não
  -- precisa de job pra ficar sincronizado, a query de listagem já calcula.
  status text not null default 'expected' check (status in ('expected', 'partial', 'received', 'cancelled')),
  due_at date,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, deal_id) references public.deals(org_id, id) on delete cascade,
  foreign key (org_id, property_id) references public.real_estate_properties(org_id, id) on delete cascade
);
create index real_estate_commissions_broker_idx on public.real_estate_commissions(broker_id, status);
create index real_estate_commissions_org_status_idx on public.real_estate_commissions(org_id, status, due_at);

create trigger real_estate_commissions_touch
  before update on public.real_estate_commissions
  for each row execute function public.touch_real_estate_record();

alter table public.real_estate_commissions enable row level security;
create policy "real_estate_commissions_select" on public.real_estate_commissions
  for select using (public.can_view_realestate(org_id));
create policy "real_estate_commissions_write" on public.real_estate_commissions
  for all using (public.can_manage_realestate(org_id)) with check (public.can_manage_realestate(org_id));

-- broker_id nulo = meta da equipe/organização inteira, não de uma pessoa.
create table public.real_estate_targets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  broker_id uuid references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  target_amount_cents integer not null check (target_amount_cents >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index real_estate_targets_org_period_idx on public.real_estate_targets(org_id, period_start, period_end);

alter table public.real_estate_targets enable row level security;
create policy "real_estate_targets_select" on public.real_estate_targets
  for select using (public.can_view_realestate(org_id));
create policy "real_estate_targets_write" on public.real_estate_targets
  for all using (public.can_manage_realestate(org_id)) with check (public.can_manage_realestate(org_id));
