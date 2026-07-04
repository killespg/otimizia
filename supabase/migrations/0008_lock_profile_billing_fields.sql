-- Impede que usuarios autenticados alterem direto campos de cobranca/trial
-- em profiles usando a anon key + JWT. Edicoes normais continuam limitadas
-- a nome e perfil profissional; billing fica restrito a rotas server/admin.

revoke update on public.profiles from anon, authenticated;
grant update (name, profession_type) on public.profiles to authenticated;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own_editable" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
