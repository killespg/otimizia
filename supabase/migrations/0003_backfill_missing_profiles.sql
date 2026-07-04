-- Backfill: garante uma linha em public.profiles para todo usuário
-- que já existia em auth.users antes da trigger on_auth_user_created
-- (ex.: contas de teste criadas manualmente no painel).
insert into public.profiles (id, name, profession_type)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'name', ''),
  coalesce(u.raw_user_meta_data ->> 'profession_type', 'autonomous_seller')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
