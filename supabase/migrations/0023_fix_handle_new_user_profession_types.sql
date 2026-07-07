-- 0019 redefiniu handle_new_user() para criar organização/convite, mas foi
-- escrita sem saber que 0012 já tinha ensinado essa função a ler
-- profession_types (várias áreas escolhidas no cadastro) — o insert em
-- profiles voltou a gravar só o default (['autonomous_seller']), ignorando
-- o que o usuário selecionou. Esta migration reaplica a lógica de
-- profession_types de 0012 junto com a criação de organização de 0019.
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
    id, name, profession_type, profession_types, cpf, terms_accepted_at,
    plan, plan_status, trial_ends_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
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
