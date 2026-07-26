-- 5.2 (Fase 5): administração multiunidade. Depende de 0.3 e 3.4 —
-- "multiunidade multiplica a superfície de RLS/RBAC; precisa da fundação
-- de segurança já madura" (o próprio texto do roadmap pra este item).
--
-- Decisão de segurança central: vincular uma organização como unidade de
-- uma rede NUNCA concede acesso automático aos dados brutos (contatos,
-- negócios) de outra organização — nenhuma policy de RLS existente muda.
-- O único acesso entre organizações é via a função de benchmark abaixo,
-- que devolve só CONTAGENS agregadas, nunca linhas. Isso evita exatamente
-- o risco que o roadmap aponta como motivo de depender de 0.3/3.4 madura.
--
-- Vincular unidades é ação de operação (service role), não self-service —
-- mesmo padrão de real_estate_v2_enabled/granular_rbac_enabled: uma
-- organização não pode se auto-anexar como unidade de outra rede.
--
-- Reversível: rollback = numa migration nova,
--   drop function if exists public.get_network_benchmark(uuid);
--   alter table public.organizations drop column if exists parent_org_id;

alter table public.organizations
  add column if not exists parent_org_id uuid references public.organizations (id) on delete set null;
create index organizations_parent_idx on public.organizations (parent_org_id) where parent_org_id is not null;

-- Só devolve linha pra quem é admin da organização matriz (parent) —
-- nunca pra admin de uma unidade filha vendo outras unidades irmãs, e
-- nunca dado bruto (contato/negócio individual), só contagem.
create or replace function public.get_network_benchmark(p_parent_org_id uuid)
returns table (
  org_id uuid,
  org_name text,
  total_contacts bigint,
  total_deals bigint,
  open_deals bigint,
  won_deals_30d bigint
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_org_admin(p_parent_org_id) then
    raise exception 'Não autorizado.';
  end if;

  return query
  select
    o.id,
    o.name,
    (select count(*) from public.contacts c where c.org_id = o.id),
    (select count(*) from public.deals d where d.org_id = o.id),
    (select count(*) from public.deals d where d.org_id = o.id and d.stage not in ('ganho', 'perdido')),
    (select count(*) from public.deals d where d.org_id = o.id and d.stage = 'ganho' and d.closed_at >= now() - interval '30 days')
  from public.organizations o
  where o.id = p_parent_org_id or o.parent_org_id = p_parent_org_id
  order by (o.id = p_parent_org_id) desc, o.name;
end;
$$;

grant execute on function public.get_network_benchmark(uuid) to authenticated;
