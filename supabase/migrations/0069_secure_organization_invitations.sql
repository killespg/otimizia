-- Convites de organização deixam de confiar em raw_user_meta_data, que pode
-- ser enviado por qualquer cliente do Supabase Auth. A associação só acontece
-- quando um usuário autenticado, com o mesmo e-mail, consome um token válido.

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  job_role text not null default 'staff' check (
    job_role in (
      'owner', 'managing_partner', 'lawyer', 'paralegal',
      'finance', 'receptionist', 'intern', 'staff',
      'broker', 'agent', 'assistant'
    )
  ),
  invited_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists organization_invitations_org_created_idx
  on public.organization_invitations (org_id, created_at desc);
create index if not exists organization_invitations_email_idx
  on public.organization_invitations (lower(email));

alter table public.organization_invitations enable row level security;

create policy "organization_invitations_admin_select"
on public.organization_invitations
for select
using (public.is_org_admin(org_id));

create policy "organization_invitations_admin_insert"
on public.organization_invitations
for insert
with check (
  public.is_org_admin(org_id)
  and invited_by = auth.uid()
);

create policy "organization_invitations_admin_update"
on public.organization_invitations
for update
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));

create policy "organization_invitations_admin_delete"
on public.organization_invitations
for delete
using (public.is_org_admin(org_id));

create or replace function public.accept_organization_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.organization_invitations%rowtype;
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select i.*
  into invitation
  from public.organization_invitations i
  where i.token_hash = lower(p_token_hash)
    and i.accepted_at is null
    and i.revoked_at is null
    and i.expires_at > now()
  for update;

  if not found then
    raise exception 'invalid_or_expired_invitation';
  end if;

  if current_email = '' or current_email <> lower(invitation.email) then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into public.organization_members (org_id, user_id, role, job_role)
  values (invitation.org_id, current_user_id, 'member', invitation.job_role)
  on conflict (org_id, user_id) do nothing;

  update public.profiles
  set active_org_id = invitation.org_id
  where id = current_user_id;

  update public.organization_invitations
  set
    accepted_at = now(),
    accepted_user_id = current_user_id
  where id = invitation.id;

  return invitation.org_id;
end;
$$;

revoke all on function public.accept_organization_invitation(text) from public;
revoke all on function public.accept_organization_invitation(text) from anon;
grant execute on function public.accept_organization_invitation(text) to authenticated;

-- Cadastro comum sempre cria a organização pessoal do usuário. Metadados
-- invited_org_id / invited_job_role antigos são deliberadamente ignorados.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  selected_professions text[];
  active_profession text;
begin
  if jsonb_typeof(new.raw_user_meta_data -> 'profession_types') = 'array' then
    select array_agg(value) into selected_professions
    from jsonb_array_elements_text(new.raw_user_meta_data -> 'profession_types') as value;
  end if;

  active_profession := coalesce(
    new.raw_user_meta_data ->> 'profession_type',
    selected_professions[1],
    'autonomous_seller'
  );
  selected_professions := coalesce(selected_professions, array[active_profession]);
  if not active_profession = any(selected_professions) then
    selected_professions := array_prepend(active_profession, selected_professions);
  end if;

  insert into public.profiles (
    id, name, email, profession_type, profession_types, cpf,
    terms_accepted_at, plan, plan_status, trial_ends_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    active_profession,
    selected_professions,
    new.raw_user_meta_data ->> 'cpf',
    case when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now() else null end,
    'pro',
    'trialing',
    now() + interval '30 days'
  );

  insert into public.organizations (name, plan, plan_status, trial_ends_at)
  values (
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Minha empresa'),
    'pro',
    'trialing',
    now() + interval '30 days'
  )
  returning id into new_org_id;

  insert into public.organization_members (org_id, user_id, role, job_role)
  values (new_org_id, new.id, 'admin', 'owner');

  update public.profiles
  set active_org_id = new_org_id
  where id = new.id;

  return new;
end;
$$;
