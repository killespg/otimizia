-- Assinatura eletronica de documentos juridicos via Autentique
-- (https://www.autentique.com.br). Uma linha por envio para assinatura;
-- guarda o id do documento na Autentique pra casar com o webhook e o status
-- ("pending" ate o signatario assinar/recusar). O documento assinado final
-- fica so como link (files.signed da Autentique) — nao baixamos pro nosso
-- storage nesta primeira versao.

create table public.legal_document_signatures (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.legal_documents(id) on delete cascade,
  autentique_document_id text not null,
  status text not null default 'pending' check (status in ('pending','viewed','signed','rejected','delivery_failed')),
  signer_name text not null,
  signer_email text not null,
  signed_file_url text,
  sent_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index legal_document_signatures_document_idx on public.legal_document_signatures(document_id, created_at desc);
create index legal_document_signatures_autentique_idx on public.legal_document_signatures(autentique_document_id);

create trigger legal_document_signatures_touch before update on public.legal_document_signatures
  for each row execute function public.touch_law_office_record();

alter table public.legal_document_signatures enable row level security;

create policy "legal_document_signatures_access" on public.legal_document_signatures for select using (
  exists(
    select 1 from public.legal_documents d
    join public.legal_cases c on c.id = d.case_id
    where d.id = document_id and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id)
  )
);
create policy "legal_document_signatures_write" on public.legal_document_signatures for all
  using (public.can_manage_legal(org_id)) with check (public.can_manage_legal(org_id));

-- Dedupe de eventos do webhook Autentique, mesmo padrao de stripe_webhook_events
-- (0014) e whatsapp_webhook_events (0038): insere primeiro, unique-violation
-- (23505) = replay ja tratado. So a service role toca, sem policy pra
-- anon/authenticated.
create table public.autentique_webhook_events (
  event_id text primary key,
  event_type text,
  created_at timestamptz not null default now()
);
alter table public.autentique_webhook_events enable row level security;
