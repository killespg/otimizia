-- Operacao juridica completa: prazos, agenda, movimentacoes, documentos e despesas.

create table public.legal_deadlines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  deadline_type text not null default 'procedural' check (deadline_type in ('procedural','hearing','internal','client','administrative')),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index legal_deadlines_org_due_idx on public.legal_deadlines(org_id,status,due_at);
create index legal_deadlines_case_idx on public.legal_deadlines(case_id,due_at);

create table public.legal_case_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  event_type text not null default 'update' check (event_type in ('update','filing','decision','hearing','communication','note')),
  title text not null,
  description text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index legal_case_events_case_date_idx on public.legal_case_events(case_id,occurred_at desc);

create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  name text not null,
  document_type text not null default 'other' check (document_type in ('petition','contract','evidence','decision','power_of_attorney','client_document','other')),
  storage_path text,
  external_url text,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft','review','approved','filed','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);
create index legal_documents_case_idx on public.legal_documents(case_id,created_at desc);

create table public.legal_expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid references public.legal_cases(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  description text not null,
  category text not null default 'court_fee' check (category in ('court_fee','travel','registry','expert','correspondent','copy','other')),
  amount_cents integer not null check (amount_cents > 0),
  expense_date date not null default current_date,
  reimbursable boolean not null default true,
  reimbursed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create index legal_expenses_org_date_idx on public.legal_expenses(org_id,expense_date desc);

create trigger legal_deadlines_touch before update on public.legal_deadlines for each row execute function public.touch_law_office_record();
create trigger legal_documents_touch before update on public.legal_documents for each row execute function public.touch_law_office_record();

alter table public.legal_deadlines enable row level security;
alter table public.legal_case_events enable row level security;
alter table public.legal_documents enable row level security;
alter table public.legal_expenses enable row level security;

create policy "legal_deadlines_access" on public.legal_deadlines for select using (
  exists(select 1 from public.legal_cases c where c.id=case_id and public.can_access_legal_case(c.id,c.org_id,c.confidentiality,c.responsible_id))
);
create policy "legal_deadlines_write" on public.legal_deadlines for all using (public.can_manage_legal(org_id)) with check (public.can_manage_legal(org_id));
create policy "legal_events_access" on public.legal_case_events for select using (
  exists(select 1 from public.legal_cases c where c.id=case_id and public.can_access_legal_case(c.id,c.org_id,c.confidentiality,c.responsible_id))
);
create policy "legal_events_write" on public.legal_case_events for all using (public.can_manage_legal(org_id)) with check (public.can_manage_legal(org_id));
create policy "legal_documents_access" on public.legal_documents for select using (
  exists(select 1 from public.legal_cases c where c.id=case_id and public.can_access_legal_case(c.id,c.org_id,c.confidentiality,c.responsible_id))
);
create policy "legal_documents_write" on public.legal_documents for all using (public.can_manage_legal(org_id)) with check (public.can_manage_legal(org_id));
create policy "legal_expenses_select" on public.legal_expenses for select using (public.can_view_finance(org_id));
create policy "legal_expenses_write" on public.legal_expenses for all using (public.can_manage_finance(org_id)) with check (public.can_manage_finance(org_id));

-- Mantem o atalho legado sincronizado com o primeiro prazo pendente do caso.
create or replace function public.sync_legal_case_next_deadline()
returns trigger language plpgsql security definer set search_path=public as $$
declare target_case uuid;
begin
  target_case := case when tg_op='DELETE' then old.case_id else new.case_id end;
  update public.legal_cases set next_deadline_at=(
    select min(due_at) from public.legal_deadlines where case_id=target_case and status='pending'
  ) where id=target_case;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;
create trigger legal_deadline_sync after insert or update or delete on public.legal_deadlines
for each row execute function public.sync_legal_case_next_deadline();
