-- Vertical imobiliário, parte 2: carteira de imóveis. Colunas tipadas (não o
-- padrão details jsonb usado pelos outros presets) porque preço/quartos/
-- bairro precisam ser filtráveis/ordenáveis em listagem, não só exibidos.

create table public.real_estate_properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null default 'real_estate_broker' check (workspace_key = 'real_estate_broker'),
  created_by uuid not null references auth.users(id) on delete restrict,
  assignee_id uuid references auth.users(id) on delete set null,

  title text not null,
  property_type text not null check (property_type in
    ('apartamento','casa','cobertura','terreno','comercial','sala','galpao','rural','outro')),
  transaction_type text not null check (transaction_type in ('venda','aluguel','venda_aluguel')),
  status text not null default 'ativo' check (status in
    ('rascunho','ativo','reservado','vendido','alugado','inativo')),

  price_cents integer check (price_cents >= 0),
  rent_price_cents integer check (rent_price_cents >= 0),
  condo_fee_cents integer check (condo_fee_cents >= 0),
  iptu_cents integer check (iptu_cents >= 0),

  bedrooms integer check (bedrooms >= 0),
  bathrooms integer check (bathrooms >= 0),
  parking_spots integer check (parking_spots >= 0),
  area_m2 numeric(8,2) check (area_m2 >= 0),

  address_street text,
  address_number text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zip text,
  latitude numeric(9,6),
  longitude numeric(9,6),

  description text,

  -- IA nunca escreve direto nas colunas tipadas acima quando o dado vem de
  -- inferência (foto/mensagem/PDF) — fica pendurado aqui até confirmação
  -- humana. Formato: { "bedrooms": { "value": "3", "source": "assistant",
  -- "confidence": 0.7, "suggested_at": "..." } }. Chave = nome da coluna que
  -- está sendo sugerida; confirmar move o valor pra coluna e apaga a chave.
  ai_suggested_fields jsonb not null default '{}',

  -- Características soltas que não justificam coluna própria ainda (ex:
  -- "piscina", "vista_mar") — já confirmadas, ao contrário do jsonb acima.
  extra_features jsonb not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.real_estate_properties
  add constraint real_estate_properties_org_id_id_unique unique (org_id, id);

create index real_estate_properties_org_status_idx
  on public.real_estate_properties(org_id, workspace_key, status);
create index real_estate_properties_org_price_idx
  on public.real_estate_properties(org_id, workspace_key, price_cents);
create index real_estate_properties_org_neighborhood_idx
  on public.real_estate_properties(org_id, workspace_key, address_neighborhood);
create index real_estate_properties_assignee_idx
  on public.real_estate_properties(assignee_id);

create or replace function public.touch_real_estate_record()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger real_estate_properties_touch
  before update on public.real_estate_properties
  for each row execute function public.touch_real_estate_record();

alter table public.real_estate_properties enable row level security;
create policy "real_estate_properties_select" on public.real_estate_properties
  for select using (public.can_view_realestate(org_id));
create policy "real_estate_properties_write" on public.real_estate_properties
  for all using (public.can_manage_realestate(org_id)) with check (public.can_manage_realestate(org_id));
