-- Feature flag simples pro rollout progressivo do plano de evolução do CRM
-- imobiliário (RE-004): uma coluna booleana por organização, sem infra de
-- flag dedicada — liberar uma org é um UPDATE via service role/admin, não
-- precisa de deploy. Nenhuma policy de UPDATE é concedida pra authenticated
-- (só SELECT, que já é coberto pela policy de linha existente em
-- organizations_select_member, 0020) — o próprio dono da organização não
-- pode se auto-liberar; quem controla o rollout é a operação do produto.
--
-- Reversível: rollback = `alter table public.organizations drop column if
-- exists real_estate_v2_enabled;` numa migration nova.
alter table public.organizations
  add column if not exists real_estate_v2_enabled boolean not null default false;
