-- Vertical imobiliário, Fase 2 do plano de evolução (RE-2xx): conecta a
-- vitrine compartilhável ao atendimento (deal), então abrir/reagir na
-- vitrine pública avança a jornada do imóvel dentro daquele atendimento em
-- real_estate_deal_properties automaticamente, sem passo manual.
--
-- Reversível: rollback = rodar isto numa migration nova (o CREATE OR
-- REPLACE das duas funções também precisa voltar pra versão de 0054/0055):
--   alter table public.real_estate_share_collections drop column if exists deal_id;
--   -- e recriar get_shared_property_collection/record_property_reaction
--   -- exatamente como estavam em 0054/0055.

alter table public.real_estate_share_collections
  add column if not exists deal_id uuid,
  add constraint real_estate_share_collections_org_deal_fkey
    foreign key (org_id, deal_id) references public.deals(org_id, id) on delete set null;

-- Backfill "quando possível" (RE-2xx): só liga automaticamente vitrines já
-- existentes ao atendimento quando não há ambiguidade — contato com
-- exatamente um atendimento no mesmo workspace. Contato com zero ou vários
-- atendimentos fica sem palpite (deal_id continua null, corretor liga à
-- mão se quiser).
update public.real_estate_share_collections c
set deal_id = only_deal.id
from (
  -- uuid não tem agregado min()/max() nativo no Postgres — como o having
  -- abaixo já garante exatamente 1 linha por grupo, min() sobre o texto
  -- só precisa devolver "o" id (não importa ordenação, é o único valor).
  select d.contact_id, d.org_id, min(d.id::text)::uuid as id
  from public.deals d
  where d.workspace_key = 'real_estate_broker' and d.contact_id is not null
  group by d.contact_id, d.org_id
  having count(*) = 1
) only_deal
where c.client_contact_id = only_deal.contact_id
  and c.org_id = only_deal.org_id
  and c.deal_id is null;

create index if not exists real_estate_share_collections_deal_idx on public.real_estate_share_collections(deal_id);

-- Ao abrir a vitrine pública, avança o status do imóvel pra 'viewed' no
-- atendimento vinculado — só quando ainda está numa etapa anterior
-- (suggested/selected/sent), nunca regride um status mais avançado
-- (interested/visit_scheduled/...). viewed_at usa coalesce, então só grava
-- a primeira visualização — reabrir o link depois não sobrescreve a data.
-- Idempotente por construção: na segunda chamada em diante o WHERE já não
-- casa nenhuma linha (status deixou de estar em suggested/selected/sent).
create or replace function public.get_shared_property_collection(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.real_estate_share_collections%rowtype;
  result jsonb;
begin
  select * into link
  from public.real_estate_share_collections
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return null;
  end if;

  if link.last_accessed_at is null or link.last_accessed_at < now() - interval '60 seconds' then
    update public.real_estate_share_collections
    set last_accessed_at = now(), view_count = view_count + 1
    where id = link.id;
  end if;

  if link.deal_id is not null then
    update public.real_estate_deal_properties
    set status = 'viewed', viewed_at = coalesce(viewed_at, now())
    where deal_id = link.deal_id
      and status in ('suggested', 'selected', 'sent')
      and property_id in (
        select property_id from public.real_estate_share_collection_items where collection_id = link.id
      );
  end if;

  select jsonb_build_object(
    'title', link.title,
    'token', link.token,
    'properties', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'property_type', p.property_type,
        'transaction_type', p.transaction_type,
        'price_cents', p.price_cents,
        'rent_price_cents', p.rent_price_cents,
        'bedrooms', p.bedrooms,
        'bathrooms', p.bathrooms,
        'parking_spots', p.parking_spots,
        'area_m2', p.area_m2,
        'address_neighborhood', p.address_neighborhood,
        'address_city', p.address_city,
        'address_state', p.address_state,
        'description', p.description,
        'photos', coalesce((
          select jsonb_agg(m.storage_path order by m.position)
          from public.real_estate_property_media m
          where m.property_id = p.id
        ), '[]'::jsonb)
      ) order by i.position)
      from public.real_estate_share_collection_items i
      join public.real_estate_properties p on p.id = i.property_id
      where i.collection_id = link.id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- Reação do visitante também alimenta a linha do tempo do atendimento
-- vinculado: interessado/quero_visitar -> 'interested', sem_interesse ->
-- 'rejected'. Só avança (WHERE ... status in (etapas iniciais)) — uma
-- reação nunca sobrescreve um status mais adiantado como visit_scheduled/
-- offer/won que já exista pra esse imóvel neste atendimento.
create or replace function public.record_property_reaction(
  p_token uuid,
  p_property_id uuid,
  p_reaction text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.real_estate_share_collections%rowtype;
  v_status text;
begin
  if p_reaction not in ('interessado','sem_interesse','quero_visitar') then
    raise exception 'Reação inválida.';
  end if;

  select * into link
  from public.real_estate_share_collections
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;
  if not found then
    raise exception 'Link inválido ou expirado.';
  end if;

  if not exists (
    select 1 from public.real_estate_share_collection_items i
    where i.collection_id = link.id and i.property_id = p_property_id
  ) then
    raise exception 'Imóvel não faz parte desta seleção.';
  end if;

  insert into public.real_estate_property_reactions (org_id, collection_id, property_id, reaction)
  values (link.org_id, link.id, p_property_id, p_reaction)
  on conflict (collection_id, property_id)
  do update set reaction = excluded.reaction, updated_at = now();

  if link.deal_id is not null then
    v_status := case when p_reaction = 'sem_interesse' then 'rejected' else 'interested' end;
    insert into public.real_estate_deal_properties (org_id, deal_id, property_id, status, reaction, source, viewed_at)
    values (link.org_id, link.deal_id, p_property_id, v_status, p_reaction, 'share_collection', now())
    on conflict (deal_id, property_id) do update
    set status = excluded.status, reaction = excluded.reaction, viewed_at = coalesce(real_estate_deal_properties.viewed_at, now())
    where real_estate_deal_properties.status in ('suggested', 'selected', 'sent', 'viewed');
  end if;
end;
$$;
