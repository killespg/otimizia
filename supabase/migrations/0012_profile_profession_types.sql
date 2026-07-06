-- Areas de atuacao habilitadas pelo usuario. profession_type continua sendo
-- a area ativa; profession_types controla o que aparece no seletor rapido.

alter table public.profiles
  add column if not exists profession_types text[];

update public.profiles
set profession_types = array[profession_type]
where profession_types is null or array_length(profession_types, 1) is null;

alter table public.profiles
  alter column profession_types set default array['autonomous_seller']::text[],
  alter column profession_types set not null;

revoke update on public.profiles from anon, authenticated;
grant update (name, profession_type, profession_types) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
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
    id,
    name,
    profession_type,
    profession_types,
    cpf,
    terms_accepted_at,
    plan,
    plan_status,
    trial_ends_at
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
  return new;
end;
$$;
