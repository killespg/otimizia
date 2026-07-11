-- Tribunais favoritos por usuário, pra priorizar no seletor de tribunal nas
-- telas de consulta/vínculo de processo (DataJud).
alter table public.profiles
  add column favorite_tribunals text[] not null default '{}';
