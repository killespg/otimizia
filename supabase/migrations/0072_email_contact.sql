-- 2.1 (Fase 2): e-mail integrado com registro automático na timeline.
-- Reaproveita o mesmo padrão de consentimento já usado pro WhatsApp
-- (0066_whatsapp_opt_out.sql) — opt_out boolean + opt_out_at timestamptz,
-- por contato.
--
-- Reversível: rollback = numa migration nova,
--   drop table if exists public.email_logs;
--   alter table public.contacts
--     drop column if exists email_opt_out, drop column if exists email_opt_out_at;

alter table public.contacts
  add column if not exists email_opt_out boolean not null default false,
  add column if not exists email_opt_out_at timestamptz;

-- Registro de envio pra contato — não é o e-mail transacional do produto
-- (dailySummaryEmail/stalledDealEmail em lib/email.ts, que vai pro dono da
-- conta, não pro contato/cliente dele). Cada linha vira uma entrada na
-- timeline do contato (lib/timeline.ts).
create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  workspace_key text not null,
  contact_id uuid not null,
  deal_id uuid,
  created_by uuid not null references auth.users (id) on delete restrict,
  subject text not null,
  template_key text,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  provider_message_id text,
  created_at timestamptz not null default now(),
  foreign key (org_id, contact_id) references public.contacts (org_id, id) on delete cascade,
  foreign key (org_id, deal_id) references public.deals (org_id, id) on delete set null
);
create index email_logs_contact_idx on public.email_logs (contact_id, created_at desc);

alter table public.email_logs enable row level security;
create policy "email_logs_all_org" on public.email_logs
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
