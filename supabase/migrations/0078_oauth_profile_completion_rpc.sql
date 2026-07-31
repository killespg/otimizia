-- OAuth (Google) nao passa por raw_user_meta_data como o cadastro por senha,
-- entao cpf/profession_types/terms_accepted_at (colunas travadas pro cliente
-- desde 0072_explicit_api_table_grants) ficam vazios ate a pessoa passar pela
-- tela /onboarding/cpf. Esta funcao roda como security definer (mesmo padrao
-- do handle_new_user) so pra escrever na propria linha (auth.uid()), entao
-- nao precisa reabrir grant de coluna nenhum pro client normal.
create or replace function public.complete_oauth_profile(
  p_cpf text default null,
  p_profession_types text[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_active_profession text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_active_profession := p_profession_types[1];

  update public.profiles
  set
    cpf = coalesce(p_cpf, cpf),
    profession_type = coalesce(v_active_profession, profession_type),
    profession_types = coalesce(p_profession_types, profession_types),
    terms_accepted_at = coalesce(terms_accepted_at, now())
  where id = v_uid;
end;
$$;

revoke all on function public.complete_oauth_profile(text, text[]) from public;
grant execute on function public.complete_oauth_profile(text, text[]) to authenticated;
