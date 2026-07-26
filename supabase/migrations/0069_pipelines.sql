-- 1.1 (Fase 1): schema de múltiplos funis. Aditivo e sem regressão — nenhum
-- código de leitura existente muda nesta migração (Board.tsx, dashboard,
-- devMetrics, deals-report, actions.ts, ai/tools etc. continuam lendo
-- deals.stage exatamente como hoje, ver
-- docs/roadmap-imobiliario/0.2a-inventario-acoplamento-funil.md). Isso só
-- cria e preenche o schema novo; a UI continua liberando um funil só por
-- organização+workspace — múltiplos funis de verdade são a 3.3, que reusa
-- este schema sem outra migração.
--
-- Reversível: rollback = numa migration nova,
--   drop trigger if exists deals_ensure_default_pipeline on public.deals;
--   drop function if exists public.ensure_default_pipeline();
--   alter table public.deals drop constraint if exists deals_pipeline_fk;
--   alter table public.deals drop column if exists pipeline_id;
--   drop table if exists public.pipeline_stages;
--   drop table if exists public.pipelines;
--   drop type if exists public.pipeline_stage_type;

create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  workspace_key text not null,
  name text not null default 'Funil principal',
  is_default boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, id)
);

-- Só um funil padrão por organização+workspace hoje — a 3.3 relaxa isso
-- pra permitir outros funis não-padrão convivendo com o mesmo default.
create unique index pipelines_default_unique_idx
  on public.pipelines (org_id, workspace_key) where is_default;
create index pipelines_org_idx on public.pipelines (org_id);

create type public.pipeline_stage_type as enum ('aberto', 'ganho', 'perdido');

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  pipeline_id uuid not null,
  key text not null,
  label text not null,
  stage_type public.pipeline_stage_type not null default 'aberto',
  color text,
  position integer not null default 0,
  -- "regras de exclusão" (entrega da 1.1 na seção 8 do roadmap): as 5
  -- etapas seedadas por esta migração não podem ser excluídas — dezenas de
  -- pontos do código ainda leem essas chaves como fixas (0.2a). Só passa a
  -- fazer sentido permitir exclusão quando esses pontos migrarem para ler
  -- pipeline_stages em vez do enum deal_stage.
  is_deletable boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (org_id, pipeline_id) references public.pipelines (org_id, id) on delete cascade,
  unique (pipeline_id, key)
);
create index pipeline_stages_pipeline_idx on public.pipeline_stages (pipeline_id, position);

alter table public.deals
  add column if not exists pipeline_id uuid;
alter table public.deals
  add constraint deals_pipeline_fk
  foreign key (org_id, pipeline_id) references public.pipelines (org_id, id) on delete set null;
create index deals_pipeline_idx on public.deals (pipeline_id);

alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;

-- Mesmo modelo de acesso de contacts/deals hoje (0020_org_rls.sql): todo
-- membro da org lê e escreve, sem distinção por job_role — documentado
-- como gap conhecido em docs/roadmap-imobiliario/0.3-fundacao-seguranca-rollout.md,
-- resolvido de verdade só na 3.4.
create policy "pipelines_all_org" on public.pipelines
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "pipeline_stages_all_org" on public.pipeline_stages
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

-- Backfill: um pipeline padrão por (org_id, workspace_key) que já tem
-- negócio registrado. Os labels aqui são os genéricos (DEFAULT_STAGES em
-- lib/professions.ts) — labels customizados por profissão (ex.
-- real_estate_broker chama "negociacao" de "Visita/proposta") continuam
-- vindo do preset em TypeScript na renderização por enquanto, não desta
-- tabela. Ver docs/roadmap-imobiliario/1.1-funil-personalizavel.md.
insert into public.pipelines (org_id, workspace_key, name, is_default)
select distinct d.org_id, d.workspace_key, 'Funil principal', true
from public.deals d
on conflict (org_id, workspace_key) where is_default do nothing;

insert into public.pipeline_stages (org_id, pipeline_id, key, label, stage_type, position, is_deletable)
select p.org_id, p.id, s.key, s.label, s.stage_type::public.pipeline_stage_type, s.position, false
from public.pipelines p
cross join (values
  ('novo', 'Novo', 'aberto', 0),
  ('em_contato', 'Em contato', 'aberto', 1),
  ('negociacao', 'Proposta', 'aberto', 2),
  ('ganho', 'Ganho', 'ganho', 3),
  ('perdido', 'Perdido', 'perdido', 4)
) as s(key, label, stage_type, position)
where p.is_default
on conflict (pipeline_id, key) do nothing;

update public.deals d
set pipeline_id = p.id
from public.pipelines p
where p.org_id = d.org_id
  and p.workspace_key = d.workspace_key
  and p.is_default
  and d.pipeline_id is null;

-- Garante que todo negócio novo (inclusive de org/workspace que ainda não
-- existia no backfill acima) sempre nasce com um pipeline_id válido, sem
-- precisar que app code nenhum seja alterado para setar isso no insert.
create or replace function public.ensure_default_pipeline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pipeline_id uuid;
begin
  if new.pipeline_id is not null then
    return new;
  end if;

  select id into v_pipeline_id
  from public.pipelines
  where org_id = new.org_id and workspace_key = new.workspace_key and is_default;

  if v_pipeline_id is null then
    insert into public.pipelines (org_id, workspace_key, name, is_default)
    values (new.org_id, new.workspace_key, 'Funil principal', true)
    returning id into v_pipeline_id;

    insert into public.pipeline_stages (org_id, pipeline_id, key, label, stage_type, position, is_deletable)
    values
      (new.org_id, v_pipeline_id, 'novo', 'Novo', 'aberto', 0, false),
      (new.org_id, v_pipeline_id, 'em_contato', 'Em contato', 'aberto', 1, false),
      (new.org_id, v_pipeline_id, 'negociacao', 'Proposta', 'aberto', 2, false),
      (new.org_id, v_pipeline_id, 'ganho', 'Ganho', 'ganho', 3, false),
      (new.org_id, v_pipeline_id, 'perdido', 'Perdido', 'perdido', 4, false);
  end if;

  new.pipeline_id := v_pipeline_id;
  return new;
end;
$$;

create trigger deals_ensure_default_pipeline
  before insert on public.deals
  for each row execute function public.ensure_default_pipeline();
