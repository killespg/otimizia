-- Vertical imobiliário, parte 1: cargos dentro da organização. Reaproveita o
-- mesmo mecanismo já genérico de job_role (coluna + funções can_view_*/
-- can_manage_*) introduzido para advocacia em 0035, em vez de criar uma
-- tabela nova de papéis por workspace — só estende o vocabulário.

alter table public.organization_members
  drop constraint if exists organization_members_job_role_check;
alter table public.organization_members
  add constraint organization_members_job_role_check
  check (job_role in (
    'owner', 'managing_partner', 'lawyer', 'paralegal',
    'finance', 'receptionist', 'intern', 'staff',
    'broker', 'agent', 'assistant'
  ));

create or replace function public.can_view_realestate(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_org_admin(target) or public.org_job_role(target) in
    ('owner', 'broker', 'agent', 'assistant');
$$;

create or replace function public.can_manage_realestate(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_org_admin(target) or public.org_job_role(target) in
    ('owner', 'broker', 'agent');
$$;

grant execute on function public.can_view_realestate(uuid) to authenticated;
grant execute on function public.can_manage_realestate(uuid) to authenticated;

-- handle_new_user() (0035) valida invited_job_role contra sua própria lista
-- hardcoded, independente do check acima — sem repetir aqui, um convite com
-- job_role=broker cairia silenciosamente para 'staff'.
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
    'finance', 'receptionist', 'intern', 'staff',
    'broker', 'agent', 'assistant'
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
