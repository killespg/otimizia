-- Guarda o e-mail em profiles (espelhado de auth.users) pra poder localizar
-- gente já cadastrada ao convidar pra uma organização — antes disso só dava
-- pra convidar e-mail novo, porque inviteUserByEmail falha se a conta já existe
-- e não tínhamos como buscar o user_id a partir de um e-mail.
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is distinct from u.email;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_org_id uuid := nullif(new.raw_user_meta_data ->> 'invited_org_id', '')::uuid;
  new_org_id uuid;
  selected_professions text[];
  active_profession text;
begin
  if jsonb_typeof(new.raw_user_meta_data -> 'profession_types') = 'array' then
    select array_agg(value)
    into selected_professions
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
    id, name, email, profession_type, profession_types, cpf, terms_accepted_at,
    plan, plan_status, trial_ends_at
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

  if invited_org_id is not null and exists (select 1 from public.organizations where id = invited_org_id) then
    insert into public.organization_members (org_id, user_id, role)
    values (invited_org_id, new.id, 'member')
    on conflict (org_id, user_id) do nothing;
    update public.profiles set active_org_id = invited_org_id where id = new.id;
  else
    insert into public.organizations (name, plan, plan_status, trial_ends_at)
    values (coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Minha empresa'), 'pro', 'trialing', now() + interval '30 days')
    returning id into new_org_id;

    insert into public.organization_members (org_id, user_id, role)
    values (new_org_id, new.id, 'admin');

    update public.profiles set active_org_id = new_org_id where id = new.id;
  end if;

  return new;
end;
$$;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();
