-- Token de assinatura do feed .ics (Google Agenda, Apple Calendário etc.).
-- É lido por um endpoint público (app/api/ics/[token]) sem sessão de usuário
-- — por isso não recebe RLS própria além da já existente em profiles
-- (select próprio + shares_org_with); a busca por token roda com a service
-- role (createAdminClient), igual aos demais crons/rotas públicas.
alter table public.profiles add column calendar_ics_token uuid not null unique default gen_random_uuid();
