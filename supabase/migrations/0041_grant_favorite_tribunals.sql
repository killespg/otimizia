-- 0040 criou profiles.favorite_tribunals mas esqueceu de liberar a coluna
-- pro grant de update — profiles usa allowlist de coluna desde 0008
-- (revoke update geral + grant só nas colunas editáveis pelo próprio
-- usuário), então sem isso o update de /api/law/favorite-tribunal falha
-- com "permission denied for column favorite_tribunals".
grant update (name, profession_type, dashboard_preferences, favorite_tribunals) on public.profiles to authenticated;
