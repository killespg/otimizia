-- Vertical imobiliário, parte 5: reação do visitante anônimo na vitrine
-- ("Tenho interesse" / "Não gostei" / "Quero visitar"), gravada de volta no
-- CRM. Única tabela deste vertical com escrita vinda de anon — por isso o
-- enum é fixo (nunca texto livre) e toda escrita passa por uma função que
-- valida o token e que o imóvel pertence àquela coleção antes de gravar.

create table public.real_estate_property_reactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  collection_id uuid not null references public.real_estate_share_collections(id) on delete cascade,
  property_id uuid not null,
  reaction text not null check (reaction in ('interessado','sem_interesse','quero_visitar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, property_id) references public.real_estate_properties(org_id, id) on delete cascade,
  unique (collection_id, property_id)
);

alter table public.real_estate_property_reactions enable row level security;
-- Equipe lê reações no CRM. Nenhuma policy dá insert/update a anon nem a
-- authenticated — toda escrita é exclusivamente via record_property_reaction.
create policy "real_estate_property_reactions_select" on public.real_estate_property_reactions
  for select using (public.can_view_realestate(org_id));

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
end;
$$;

grant execute on function public.record_property_reaction(uuid, uuid, text) to anon, authenticated;
