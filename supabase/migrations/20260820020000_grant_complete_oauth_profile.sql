-- 20260731041544 cria complete_oauth_profile e concede EXECUTE a
-- authenticated. No banco hospedado a função existia, mas o grant tinha
-- sumido (42501) — o mesmo padrão da 0077, que revoga SECURITY DEFINER em
-- bloco e só devolve a allowlist, onde esta RPC não entra. Sem o execute,
-- /onboarding/cpf não consegue gravar CPF depois do login com Google.
grant execute on function public.complete_oauth_profile(text, text[]) to authenticated;
grant execute on function public.complete_oauth_profile(text, text[]) to service_role;
revoke all on function public.complete_oauth_profile(text, text[]) from public, anon;
