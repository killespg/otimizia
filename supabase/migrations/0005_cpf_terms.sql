-- CPF e aceite de termos no cadastro. Colunas ficam nullable porque contas
-- criadas antes desta migration não têm como preencher retroativamente
-- (não tem como inventar um CPF nem um aceite que nunca aconteceu).
alter table public.profiles add column if not exists cpf text;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

create unique index if not exists profiles_cpf_unique
  on public.profiles (cpf) where cpf is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, profession_type, cpf, terms_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'profession_type', 'autonomous_seller'),
    new.raw_user_meta_data ->> 'cpf',
    case when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now() else null end
  );
  return new;
end;
$$;
