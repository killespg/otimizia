-- Segurança multi-tenant: convites verificáveis, perfis privados e
-- confidencialidade efetiva para casos jurídicos.

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  job_role text not null default 'staff' check (job_role in (
    'owner', 'managing_partner', 'lawyer', 'paralegal', 'finance',
    'receptionist', 'intern', 'staff'
  )),
  token uuid not null unique default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index organization_invitations_pending_email_idx
  on public.organization_invitations(org_id, lower(email))
  where accepted_at is null;

alter table public.organization_invitations enable row level security;

-- O perfil contém CPF, e-mail, preferências e identificadores de cobrança.
-- RLS é por linha, não por coluna: a policy anterior de colegas expunha a
-- linha inteira. A lista de equipe passa a usar a função limitada abaixo.
drop policy if exists "profiles_select_org_peers" on public.profiles;

create or replace function public.get_org_member_profiles(p_org_id uuid)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not authorized';
  end if;

  return query
    select p.id, p.name
    from public.organization_members m
    join public.profiles p on p.id = m.user_id
    where m.org_id = p_org_id
    order by m.created_at asc;
end;
$$;

grant execute on function public.get_org_member_profiles(uuid) to authenticated;

-- Não confia mais em invited_org_id / invited_job_role vindos do metadata do
-- Auth: esses campos podem ser enviados por qualquer cliente no signUp.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_token uuid;
  invitation_org_id uuid;
  invitation_job_role text;
  new_org_id uuid;
  selected_professions text[];
  active_profession text;
begin
  if coalesce(new.raw_user_meta_data ->> 'invitation_token', '') ~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    invitation_token := (new.raw_user_meta_data ->> 'invitation_token')::uuid;
  end if;

  if invitation_token is not null then
    select i.org_id, i.job_role into invitation_org_id, invitation_job_role
    from public.organization_invitations i
    where i.token = invitation_token
      and lower(i.email) = lower(new.email)
      and i.accepted_at is null
      and i.expires_at > now()
    for update;
  end if;

  if jsonb_typeof(new.raw_user_meta_data -> 'profession_types') = 'array' then
    select array_agg(value) into selected_professions
    from jsonb_array_elements_text(new.raw_user_meta_data -> 'profession_types') as value;
  end if;
  active_profession := coalesce(new.raw_user_meta_data ->> 'profession_type', selected_professions[1], 'autonomous_seller');
  selected_professions := coalesce(selected_professions, array[active_profession]);
  if not active_profession = any(selected_professions) then
    selected_professions := array_prepend(active_profession, selected_professions);
  end if;

  insert into public.profiles (
    id, name, email, profession_type, profession_types, cpf, terms_accepted_at,
    plan, plan_status, trial_ends_at
  ) values (
    new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email,
    active_profession, selected_professions, new.raw_user_meta_data ->> 'cpf',
    case when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now() else null end,
    'pro', 'trialing', now() + interval '30 days'
  );

  if invitation_org_id is not null then
    insert into public.organization_members (org_id, user_id, role, job_role)
    values (invitation_org_id, new.id, 'member', invitation_job_role)
    on conflict (org_id, user_id) do nothing;
    update public.organization_invitations set accepted_at = now() where token = invitation_token;
    update public.profiles set active_org_id = invitation_org_id where id = new.id;
  else
    insert into public.organizations (name, plan, plan_status, trial_ends_at)
    values (coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Minha empresa'), 'pro', 'trialing', now() + interval '30 days')
    returning id into new_org_id;
    insert into public.organization_members (org_id, user_id, role, job_role)
    values (new_org_id, new.id, 'admin', 'owner');
    update public.profiles set active_org_id = new_org_id where id = new.id;
  end if;

  return new;
end;
$$;

-- "FOR ALL" também se aplica a SELECT; as policies anteriores portanto
-- anulavam a confidencialidade dos casos restritos para advogados/paralegais.
drop policy if exists "legal_cases_write" on public.legal_cases;
drop policy if exists "legal_case_members_select" on public.legal_case_members;
drop policy if exists "legal_case_members_write" on public.legal_case_members;
drop policy if exists "legal_deadlines_write" on public.legal_deadlines;
drop policy if exists "legal_events_write" on public.legal_case_events;
drop policy if exists "legal_documents_write" on public.legal_documents;

create policy "legal_cases_insert_manage" on public.legal_cases
  for insert with check (public.can_manage_legal(org_id));
create policy "legal_cases_update_manage_access" on public.legal_cases
  for update using (
    public.can_manage_legal(org_id)
    and public.can_access_legal_case(id, org_id, confidentiality, responsible_id)
  ) with check (public.can_manage_legal(org_id));
create policy "legal_cases_delete_manage_access" on public.legal_cases
  for delete using (
    public.can_manage_legal(org_id)
    and public.can_access_legal_case(id, org_id, confidentiality, responsible_id)
  );

create policy "legal_case_members_select_access" on public.legal_case_members
  for select using (
    exists (
      select 1 from public.legal_cases c
      where c.id = case_id
        and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id)
    )
  );
create policy "legal_case_members_insert_manage_access" on public.legal_case_members
  for insert with check (
    exists (
      select 1 from public.legal_cases c
      join public.organization_members m on m.org_id = c.org_id and m.user_id = legal_case_members.user_id
      where c.id = case_id
        and public.can_manage_legal(c.org_id)
        and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id)
    )
  );
create policy "legal_case_members_delete_manage_access" on public.legal_case_members
  for delete using (
    exists (
      select 1 from public.legal_cases c
      where c.id = case_id
        and public.can_manage_legal(c.org_id)
        and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id)
    )
  );

create policy "legal_deadlines_insert_manage_access" on public.legal_deadlines
  for insert with check (
    exists (select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_deadlines.org_id
      and public.can_manage_legal(c.org_id) and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id))
  );
create policy "legal_deadlines_update_manage_access" on public.legal_deadlines
  for update using (
    exists (select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_deadlines.org_id
      and public.can_manage_legal(c.org_id) and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id))
  ) with check (
    exists (select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_deadlines.org_id
      and public.can_manage_legal(c.org_id) and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id))
  );
create policy "legal_deadlines_delete_manage_access" on public.legal_deadlines
  for delete using (
    exists (select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_deadlines.org_id
      and public.can_manage_legal(c.org_id) and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id))
  );

create policy "legal_events_insert_manage_access" on public.legal_case_events
  for insert with check (
    exists (select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_case_events.org_id
      and public.can_manage_legal(c.org_id) and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id))
  );
create policy "legal_events_update_manage_access" on public.legal_case_events
  for update using (
    exists (select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_case_events.org_id
      and public.can_manage_legal(c.org_id) and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id))
  ) with check (
    exists (select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_case_events.org_id
      and public.can_manage_legal(c.org_id) and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id))
  );
create policy "legal_events_delete_manage_access" on public.legal_case_events
  for delete using (
    exists (select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_case_events.org_id
      and public.can_manage_legal(c.org_id) and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id))
  );

create policy "legal_documents_insert_manage_access" on public.legal_documents
  for insert with check (
    exists (select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_documents.org_id
      and public.can_manage_legal(c.org_id) and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id))
  );
create policy "legal_documents_update_manage_access" on public.legal_documents
  for update using (
    exists (select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_documents.org_id
      and public.can_manage_legal(c.org_id) and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id))
  ) with check (
    exists (select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_documents.org_id
      and public.can_manage_legal(c.org_id) and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id))
  );
create policy "legal_documents_delete_manage_access" on public.legal_documents
  for delete using (
    exists (select 1 from public.legal_cases c where c.id = case_id and c.org_id = legal_documents.org_id
      and public.can_manage_legal(c.org_id) and public.can_access_legal_case(c.id, c.org_id, c.confidentiality, c.responsible_id))
  );

-- Um pagamento precisa sempre pertencer ao mesmo tenant que o recebível.
drop policy if exists "receivable_payments_select" on public.receivable_payments;
drop policy if exists "receivable_payments_write" on public.receivable_payments;
create policy "receivable_payments_select_org" on public.receivable_payments
  for select using (
    public.can_view_finance(org_id)
    and exists (select 1 from public.receivables r where r.id = receivable_id and r.org_id = receivable_payments.org_id)
  );
create policy "receivable_payments_insert_org" on public.receivable_payments
  for insert with check (
    public.can_manage_finance(org_id)
    and exists (select 1 from public.receivables r where r.id = receivable_id and r.org_id = receivable_payments.org_id)
  );
create policy "receivable_payments_update_org" on public.receivable_payments
  for update using (
    public.can_manage_finance(org_id)
    and exists (select 1 from public.receivables r where r.id = receivable_id and r.org_id = receivable_payments.org_id)
  ) with check (
    public.can_manage_finance(org_id)
    and exists (select 1 from public.receivables r where r.id = receivable_id and r.org_id = receivable_payments.org_id)
  );
create policy "receivable_payments_delete_org" on public.receivable_payments
  for delete using (
    public.can_manage_finance(org_id)
    and exists (select 1 from public.receivables r where r.id = receivable_id and r.org_id = receivable_payments.org_id)
  );
