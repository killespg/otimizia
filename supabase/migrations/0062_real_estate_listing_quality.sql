-- Vertical imobiliário, Fase 5 do plano de evolução (RE-5xx): captação,
-- documentos e qualidade do anúncio.
--
-- listing_quality_score, exclusive_listing e exclusive_until já existem
-- desde a Fase 0 (0056) — esta migration só adiciona o checklist
-- documental, que é a única peça de schema nova desta fase (o resto —
-- score, subtipo de atendimento — é lib/ação nova sobre schema já
-- existente, ver commit).
--
-- Reversível: rollback = `drop table if exists public.real_estate_property_documents;`
-- numa migration nova.

create table public.real_estate_property_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null,
  -- Texto livre (mesmo motivo de capture_source/occupancy_status em 0056):
  -- o conjunto de documentos exigidos varia demais por tipo de imóvel/
  -- negociação pra travar num enum agora.
  document_type text not null,
  status text not null default 'pending' check (status in ('pending', 'received', 'waived')),
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, property_id) references public.real_estate_properties(org_id, id) on delete cascade
);
create index real_estate_property_documents_property_idx on public.real_estate_property_documents(property_id, status);

create trigger real_estate_property_documents_touch
  before update on public.real_estate_property_documents
  for each row execute function public.touch_real_estate_record();

alter table public.real_estate_property_documents enable row level security;
create policy "real_estate_property_documents_select" on public.real_estate_property_documents
  for select using (public.can_view_realestate(org_id));
create policy "real_estate_property_documents_write" on public.real_estate_property_documents
  for all using (public.can_manage_realestate(org_id)) with check (public.can_manage_realestate(org_id));
