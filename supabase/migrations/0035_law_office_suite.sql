-- Vertical de advocacia: cargos, casos, contratos de honorários e financeiro.
-- As tabelas mantêm o mesmo isolamento por organização e workspace do CRM.

alter table public.organization_members
  add column if not exists job_role text not null default 'staff'
  check (job_role in (
    'owner', 'managing_partner', 'lawyer', 'paralegal',
    'finance', 'receptionist', 'intern', 'staff'
  ));

update public.organization_members
set job_role = case when role = 'admin' then 'owner' else 'staff' end
where job_role = 'staff';

create or replace function public.org_job_role(target uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select m.job_role
    from public.organization_members m
    where m.org_id = target and m.user_id = auth.uid()
  ), '');
$$;

create or replace function public.can_view_legal(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_org_admin(target) or public.org_job_role(target) in
    ('owner', 'managing_partner', 'lawyer', 'paralegal', 'intern');
$$;

create or replace function public.can_manage_legal(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_org_admin(target) or public.org_job_role(target) in
    ('owner', 'managing_partner', 'lawyer', 'paralegal');
$$;

create or replace function public.can_view_finance(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_org_admin(target) or public.org_job_role(target) in
    ('owner', 'managing_partner', 'finance');
$$;

create or replace function public.can_manage_finance(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_org_admin(target) or public.org_job_role(target) in
    ('owner', 'managing_partner', 'finance');
$$;

grant execute on function public.org_job_role(uuid) to authenticated;
grant execute on function public.can_view_legal(uuid) to authenticated;
grant execute on function public.can_manage_legal(uuid) to authenticated;
grant execute on function public.can_view_finance(uuid) to authenticated;
grant execute on function public.can_manage_finance(uuid) to authenticated;

create table public.legal_cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null default 'law_office' check (workspace_key = 'law_office'),
  contact_id uuid references public.contacts(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  responsible_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  case_number text,
  area text,
  court text,
  jurisdiction text,
  opposing_party text,
  status text not null default 'intake' check (status in ('intake','active','waiting','suspended','closed','archived')),
  risk_level text not null default 'standard' check (risk_level in ('low','standard','high','critical')),
  confidentiality text not null default 'restricted' check (confidentiality in ('team','restricted')),
  next_deadline_at timestamptz,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index legal_cases_org_status_idx on public.legal_cases(org_id, status, next_deadline_at);
create index legal_cases_contact_idx on public.legal_cases(contact_id);

create table public.legal_case_members (
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'collaborator' check (role in ('lead','collaborator','viewer')),
  created_at timestamptz not null default now(),
  primary key(case_id, user_id)
);

create or replace function public.can_access_legal_case(
  target_case_id uuid,
  target uuid,
  visibility text,
  lead uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.can_view_legal(target)
    and (
      visibility = 'team'
      or public.is_org_admin(target)
      or public.org_job_role(target) in ('owner', 'managing_partner')
      or lead = auth.uid()
      or exists (
        select 1
        from public.legal_case_members m
        where m.case_id = target_case_id
          and m.user_id = auth.uid()
      )
    );
$$;

grant execute on function public.can_access_legal_case(uuid, uuid, text, uuid) to authenticated;

create table public.fee_agreements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null default 'law_office' check (workspace_key = 'law_office'),
  contact_id uuid references public.contacts(id) on delete set null,
  case_id uuid references public.legal_cases(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  fee_type text not null check (fee_type in ('fixed','recurring','stage','hourly','success','consultation')),
  total_cents integer not null default 0 check (total_cents >= 0),
  success_percent numeric(5,2),
  success_basis text,
  status text not null default 'active' check (status in ('draft','active','completed','cancelled')),
  signed_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fee_agreements_org_contact_idx on public.fee_agreements(org_id, contact_id, status);

create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_key text not null default 'law_office' check (workspace_key = 'law_office'),
  agreement_id uuid references public.fee_agreements(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  case_id uuid references public.legal_cases(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  description text not null,
  category text not null default 'office_fee' check (category in ('office_fee','success_fee','consultation','reimbursement','client_funds')),
  installment_number integer,
  installment_total integer,
  original_cents integer not null check (original_cents >= 0),
  paid_cents integer not null default 0 check (paid_cents >= 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending','partial','paid','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index receivables_org_due_idx on public.receivables(org_id, status, due_date);
create index receivables_contact_idx on public.receivables(contact_id, due_date);

create table public.receivable_payments (
  id uuid primary key default gen_random_uuid(),
  receivable_id uuid not null references public.receivables(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  paid_at timestamptz not null default now(),
  method text not null default 'pix' check (method in ('pix','boleto','card','transfer','cash','other')),
  reference text,
  notes text,
  created_at timestamptz not null default now()
);
create index receivable_payments_org_paid_idx on public.receivable_payments(org_id, paid_at desc);

create or replace function public.refresh_receivable_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  total_paid integer;
  original integer;
begin
  target_id := case when tg_op = 'DELETE' then old.receivable_id else new.receivable_id end;
  select coalesce(sum(amount_cents), 0) into total_paid
  from public.receivable_payments where receivable_id = target_id;
  select original_cents into original from public.receivables where id = target_id;
  update public.receivables
  set paid_cents = total_paid,
      status = case when total_paid >= original then 'paid' when total_paid > 0 then 'partial' else 'pending' end,
      updated_at = now()
  where id = target_id and status <> 'cancelled';
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger receivable_payment_refresh
after insert or update or delete on public.receivable_payments
for each row execute function public.refresh_receivable_balance();

create or replace function public.touch_law_office_record()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger legal_cases_touch before update on public.legal_cases for each row execute function public.touch_law_office_record();
create trigger fee_agreements_touch before update on public.fee_agreements for each row execute function public.touch_law_office_record();

alter table public.legal_cases enable row level security;
alter table public.legal_case_members enable row level security;
alter table public.fee_agreements enable row level security;
alter table public.receivables enable row level security;
alter table public.receivable_payments enable row level security;

create policy "legal_cases_select" on public.legal_cases for select using (
  public.can_access_legal_case(id, org_id, confidentiality, responsible_id)
);
create policy "legal_cases_write" on public.legal_cases for all using (public.can_manage_legal(org_id)) with check (public.can_manage_legal(org_id));
create policy "legal_case_members_select" on public.legal_case_members for select using (
  exists(select 1 from public.legal_cases c where c.id = case_id and public.can_view_legal(c.org_id))
);
create policy "legal_case_members_write" on public.legal_case_members for all using (
  exists(select 1 from public.legal_cases c where c.id = case_id and public.can_manage_legal(c.org_id))
) with check (
  exists(select 1 from public.legal_cases c where c.id = case_id and public.can_manage_legal(c.org_id))
);
create policy "fee_agreements_select" on public.fee_agreements for select using (public.can_view_finance(org_id));
create policy "fee_agreements_write" on public.fee_agreements for all using (public.can_manage_finance(org_id)) with check (public.can_manage_finance(org_id));
create policy "receivables_select" on public.receivables for select using (public.can_view_finance(org_id));
create policy "receivables_write" on public.receivables for all using (public.can_manage_finance(org_id)) with check (public.can_manage_finance(org_id));
create policy "receivable_payments_select" on public.receivable_payments for select using (public.can_view_finance(org_id));
create policy "receivable_payments_write" on public.receivable_payments for all using (public.can_manage_finance(org_id)) with check (public.can_manage_finance(org_id));

-- Mantém o cargo escolhido no convite, sem alterar o papel administrativo de tenancy.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_org_id uuid := nullif(new.raw_user_meta_data ->> 'invited_org_id', '')::uuid;
  invited_job_role text := coalesce(nullif(new.raw_user_meta_data ->> 'invited_job_role', ''), 'staff');
  new_org_id uuid;
  selected_professions text[];
  active_profession text;
begin
  if invited_job_role not in (
    'owner', 'managing_partner', 'lawyer', 'paralegal',
    'finance', 'receptionist', 'intern', 'staff'
  ) then
    invited_job_role := 'staff';
  end if;
  if jsonb_typeof(new.raw_user_meta_data -> 'profession_types') = 'array' then
    select array_agg(value) into selected_professions
    from jsonb_array_elements_text(new.raw_user_meta_data -> 'profession_types') as value;
  end if;
  active_profession := coalesce(new.raw_user_meta_data ->> 'profession_type', selected_professions[1], 'autonomous_seller');
  selected_professions := coalesce(selected_professions, array[active_profession]);
  if not active_profession = any(selected_professions) then selected_professions := array_prepend(active_profession, selected_professions); end if;
  insert into public.profiles (id,name,email,profession_type,profession_types,cpf,terms_accepted_at,plan,plan_status,trial_ends_at)
  values (new.id,coalesce(new.raw_user_meta_data ->> 'name',''),new.email,active_profession,selected_professions,new.raw_user_meta_data ->> 'cpf',case when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now() else null end,'pro','trialing',now()+interval '30 days');
  if invited_org_id is not null and exists (select 1 from public.organizations where id = invited_org_id) then
    insert into public.organization_members (org_id,user_id,role,job_role) values (invited_org_id,new.id,'member',invited_job_role) on conflict (org_id,user_id) do nothing;
    update public.profiles set active_org_id = invited_org_id where id = new.id;
  else
    insert into public.organizations (name,plan,plan_status,trial_ends_at) values (coalesce(nullif(new.raw_user_meta_data ->> 'name',''),'Minha empresa'),'pro','trialing',now()+interval '30 days') returning id into new_org_id;
    insert into public.organization_members (org_id,user_id,role,job_role) values (new_org_id,new.id,'admin','owner');
    update public.profiles set active_org_id = new_org_id where id = new.id;
  end if;
  return new;
end;
$$;
