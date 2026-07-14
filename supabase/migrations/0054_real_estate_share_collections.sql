-- Vertical imobiliário, parte 4: vitrine compartilhável (link público, sem
-- login) de uma seleção curada de imóveis. Mesmo padrão de
-- legal_case_share_links (0044): token opaco, revogação/expiração,
-- throttle de escrita, e a função de leitura nunca seleciona coluna
-- sensível (created_by, assignee_id, ai_suggested_fields, extra_features,
-- endereço exato, condo_fee_cents/iptu_cents) — ausência estrutural na
-- query, não filtro de app, então um token vazado nunca expõe isso.
--
-- Nome mantido com prefixo de vertical (não uma tabela share_links
-- genérica): o caso jurídico é single-target/somente-leitura, este é
-- multi-item/leitura+escrita (reações do visitante) — contratos de RPC
-- estruturalmente diferentes o suficiente pra não valer a pena unificar.

create table public.real_estate_share_collections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null default 'real_estate_broker' check (workspace_key = 'real_estate_broker'),
  token uuid not null unique default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  client_contact_id uuid,
  revoked_at timestamptz,
  expires_at timestamptz,
  last_accessed_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (org_id, client_contact_id) references public.contacts(org_id, id) on delete set null
);
create index real_estate_share_collections_org_idx on public.real_estate_share_collections(org_id);

create table public.real_estate_share_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.real_estate_share_collections(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (org_id, property_id) references public.real_estate_properties(org_id, id) on delete cascade,
  unique (collection_id, property_id)
);
create index real_estate_share_collection_items_collection_idx
  on public.real_estate_share_collection_items(collection_id, position);

alter table public.real_estate_share_collections enable row level security;
alter table public.real_estate_share_collection_items enable row level security;
create policy "real_estate_share_collections_access" on public.real_estate_share_collections
  for all using (public.can_manage_realestate(org_id)) with check (public.can_manage_realestate(org_id));
-- Deriva a permissão da coleção (não só do org_id da própria linha): assim um
-- insert com org_id da própria organização mas collection_id de uma vitrine
-- alheia é barrado, mesmo padrão de legal_case_share_links_access (0044).
create policy "real_estate_share_collection_items_access" on public.real_estate_share_collection_items
  for all using (
    exists(select 1 from public.real_estate_share_collections c
      where c.id = collection_id and c.org_id = real_estate_share_collection_items.org_id
        and public.can_manage_realestate(c.org_id))
  )
  with check (
    exists(select 1 from public.real_estate_share_collections c
      where c.id = collection_id and c.org_id = real_estate_share_collection_items.org_id
        and public.can_manage_realestate(c.org_id))
  );

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

  -- "não existe", "revogado" e "expirado" retornam o mesmo null — não dar
  -- pista pra quem está tentando adivinhar um token.
  if not found then
    return null;
  end if;

  -- Throttle de 60s: função pública sem sessão, sem rate limit em outra
  -- camada — sem isso, um bot/crawler/preview de link batendo repetido
  -- gera um UPDATE por request nessa linha (write amplification).
  if link.last_accessed_at is null or link.last_accessed_at < now() - interval '60 seconds' then
    update public.real_estate_share_collections
    set last_accessed_at = now(), view_count = view_count + 1
    where id = link.id;
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

grant execute on function public.get_shared_property_collection(uuid) to anon, authenticated;
