-- Vertical imobiliário, Fase 4 do plano de evolução (RE-4xx): propostas e
-- negociação. Contraproposta = registro novo encadeado por parent_offer_id
-- (nunca sobrescreve a proposta anterior) — histórico imutável de versões.
--
-- Reversível: rollback = rodar numa migration nova:
--   drop table if exists public.real_estate_offers;
--   alter table public.notification_log drop constraint if exists notification_log_kind_check;
--   alter table public.notification_log add constraint notification_log_kind_check
--     check (kind in ('daily_push','daily_summary_email','stalled_deal_email','visit_reminder_24h_whatsapp','visit_reminder_2h_push'));

create table public.real_estate_offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null,
  deal_id uuid not null,
  property_id uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  down_payment_cents integer check (down_payment_cents >= 0),
  financing_amount_cents integer check (financing_amount_cents >= 0),
  payment_terms text,
  conditions text,
  expires_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'countered', 'accepted', 'declined', 'expired')),
  sent_at timestamptz,
  responded_at timestamptz,
  -- Contraproposta: novo registro com parent_offer_id apontando pra
  -- proposta anterior. Nunca dá update em amount_cents/conditions de uma
  -- proposta já enviada — isso preservaria menos histórico que uma nova
  -- linha (e complicaria auditoria de "quem ofereceu o quê, quando").
  parent_offer_id uuid references public.real_estate_offers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, contact_id) references public.contacts(org_id, id) on delete cascade,
  foreign key (org_id, deal_id) references public.deals(org_id, id) on delete cascade,
  foreign key (org_id, property_id) references public.real_estate_properties(org_id, id) on delete cascade
);
create index real_estate_offers_deal_idx on public.real_estate_offers(deal_id, created_at desc);
create index real_estate_offers_property_idx on public.real_estate_offers(property_id);
create index real_estate_offers_expiring_idx on public.real_estate_offers(expires_at) where status in ('sent', 'viewed');

create trigger real_estate_offers_touch
  before update on public.real_estate_offers
  for each row execute function public.touch_real_estate_record();

alter table public.real_estate_offers enable row level security;
create policy "real_estate_offers_select" on public.real_estate_offers
  for select using (public.can_view_realestate(org_id));
create policy "real_estate_offers_write" on public.real_estate_offers
  for all using (public.can_manage_realestate(org_id)) with check (public.can_manage_realestate(org_id));

alter table public.notification_log drop constraint if exists notification_log_kind_check;
alter table public.notification_log add constraint notification_log_kind_check
  check (kind in (
    'daily_push', 'daily_summary_email', 'stalled_deal_email',
    'visit_reminder_24h_whatsapp', 'visit_reminder_2h_push', 'offer_expiry_push'
  ));
