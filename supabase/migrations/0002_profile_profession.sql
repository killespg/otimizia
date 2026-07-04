alter table public.profiles
  add column if not exists profession_type text not null default 'autonomous_seller';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, profession_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'profession_type', 'autonomous_seller')
  );
  return new;
end;
$$;
