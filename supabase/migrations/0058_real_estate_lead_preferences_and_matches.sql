-- Vertical imobiliário, Fase 1 do plano de evolução do CRM imobiliário
-- (RE-1xx, documento externo — não versionado neste repo, resumo nas
-- mensagens de commit da série RE-*): perfil de busca do cliente e o
-- resultado do match determinístico contra a carteira.
--
-- Reversível: nenhuma dessas tabelas é referenciada por outra migration
-- ainda. Rollback = rodar isto numa migration nova:
--   drop table if exists public.real_estate_deal_properties;
--   drop table if exists public.real_estate_lead_preferences;

create table public.real_estate_lead_preferences (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null,
  deal_id uuid,
  transaction_type text check (transaction_type in ('venda', 'aluguel', 'venda_aluguel')),
  property_types text[] not null default '{}',
  min_price_cents integer check (min_price_cents >= 0),
  max_price_cents integer check (max_price_cents >= 0),
  neighborhoods text[] not null default '{}',
  cities text[] not null default '{}',
  min_bedrooms integer check (min_bedrooms >= 0),
  min_bathrooms integer check (min_bathrooms >= 0),
  min_parking_spots integer check (min_parking_spots >= 0),
  min_area_m2 numeric(8,2) check (min_area_m2 >= 0),
  -- Mesmo padrão de extra_features em real_estate_properties (0052):
  -- chave livre -> valor livre, o vocabulário de "características" não é
  -- fixo o bastante pra virar coluna ou enum.
  required_features jsonb not null default '{}',
  desired_features jsonb not null default '{}',
  financing_needed boolean,
  move_deadline date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, contact_id) references public.contacts(org_id, id) on delete cascade,
  foreign key (org_id, deal_id) references public.deals(org_id, id) on delete set null
);

-- "Uma preferência por atendimento, não só por contato" (RE-1xx): deal_id
-- fica nullable pra permitir capturar perfil antes de existir um
-- atendimento formal (ex: IA anota preferência no primeiro contato), mas
-- quando setado só pode aparecer numa linha — índice único parcial em vez
-- de unique(deal_id) direto, que rejeitaria múltiplos nulls.
create unique index real_estate_lead_preferences_deal_unique
  on public.real_estate_lead_preferences(deal_id) where deal_id is not null;
create index real_estate_lead_preferences_contact_idx
  on public.real_estate_lead_preferences(org_id, contact_id);

create trigger real_estate_lead_preferences_touch
  before update on public.real_estate_lead_preferences
  for each row execute function public.touch_real_estate_record();

alter table public.real_estate_lead_preferences enable row level security;
create policy "real_estate_lead_preferences_select" on public.real_estate_lead_preferences
  for select using (public.can_view_realestate(org_id));
create policy "real_estate_lead_preferences_write" on public.real_estate_lead_preferences
  for all using (public.can_manage_realestate(org_id)) with check (public.can_manage_realestate(org_id));

-- Vínculo imóvel <-> atendimento com o resultado do match (score +
-- explicação) e o estado da jornada dele dentro daquele atendimento
-- especificamente (o mesmo imóvel pode estar em 'enviado' num atendimento
-- e 'descartado' noutro).
create table public.real_estate_deal_properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  deal_id uuid not null,
  property_id uuid not null,
  match_score integer check (match_score >= 0 and match_score <= 100),
  -- Formato: { "criterio": { "points": 20, "max": 20, "reason": "..." } }
  -- — o score sozinho nunca é suficiente na UI, precisa sempre poder
  -- mostrar o "porquê" (RE-1xx).
  match_explanation jsonb not null default '{}',
  status text not null default 'suggested' check (status in
    ('suggested', 'selected', 'sent', 'viewed', 'interested', 'rejected', 'visit_scheduled', 'offer', 'won')),
  source text not null default 'manual' check (source in ('manual', 'ai_match', 'share_collection')),
  sent_at timestamptz,
  viewed_at timestamptz,
  reaction text,
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deal_id, property_id),
  foreign key (org_id, deal_id) references public.deals(org_id, id) on delete cascade,
  foreign key (org_id, property_id) references public.real_estate_properties(org_id, id) on delete cascade
);
create index real_estate_deal_properties_deal_idx on public.real_estate_deal_properties(deal_id, status);
create index real_estate_deal_properties_property_idx on public.real_estate_deal_properties(property_id);

create trigger real_estate_deal_properties_touch
  before update on public.real_estate_deal_properties
  for each row execute function public.touch_real_estate_record();

alter table public.real_estate_deal_properties enable row level security;
create policy "real_estate_deal_properties_select" on public.real_estate_deal_properties
  for select using (public.can_view_realestate(org_id));
create policy "real_estate_deal_properties_write" on public.real_estate_deal_properties
  for all using (public.can_manage_realestate(org_id)) with check (public.can_manage_realestate(org_id));
