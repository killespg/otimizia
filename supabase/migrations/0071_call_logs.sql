-- 2.6 (Fase 2): registro leve de chamadas, sem gravação. Mede se o hábito
-- de registrar chamadas pega antes de justificar o custo/risco de
-- compliance de integrar telefonia com gravação de áudio de verdade — ver
-- docs/roadmap-imobiliario/2.6-registro-leve-chamadas.md.
--
-- Tabela dedicada (não reaproveita `interactions`) porque a porta de saída
-- pede medir "parcela dos registros com resultado + próxima ação" — isso
-- exige colunas estruturadas, não um corpo de texto livre.
--
-- Reversível: rollback = numa migration nova, `drop table if exists
-- public.call_logs;`.

create table public.call_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  workspace_key text not null,
  contact_id uuid not null,
  deal_id uuid,
  created_by uuid not null references auth.users (id) on delete restrict,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  outcome text,
  next_step text,
  created_at timestamptz not null default now(),
  foreign key (org_id, contact_id) references public.contacts (org_id, id) on delete cascade,
  foreign key (org_id, deal_id) references public.deals (org_id, id) on delete set null
);
create index call_logs_contact_idx on public.call_logs (contact_id, created_at desc);

alter table public.call_logs enable row level security;
create policy "call_logs_all_org" on public.call_logs
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
