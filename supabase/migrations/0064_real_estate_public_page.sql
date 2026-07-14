-- Vertical imobiliário, Fase 7 do plano de evolução (RE-7xx): recursos
-- avançados. Latitude/longitude já existem desde o schema original
-- (0052) — esta migration só adiciona o necessário pra página pública do
-- corretor (RE-7xx: "módulo premium"). Geocodificação automática (CEP/
-- endereço -> lat/lng) e integração com portais (Zap/VivaReal/OLX) NÃO
-- foram implementadas nesta fase — ver decisão registrada no commit
-- (exigem credencial externa que este ambiente não tem). Locação completa
-- também não foi implementada, por instrução explícita do plano.
--
-- Reversível: rollback = rodar numa migration nova:
--   alter table public.organizations
--     drop column if exists real_estate_public_page_enabled,
--     drop column if exists real_estate_public_page_token;

alter table public.organizations
  add column if not exists real_estate_public_page_enabled boolean not null default false,
  add column if not exists real_estate_public_page_token uuid not null default gen_random_uuid();

create unique index if not exists organizations_real_estate_public_page_token_idx
  on public.organizations(real_estate_public_page_token);
