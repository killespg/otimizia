-- Campos extras por perfil profissional: cada profissão define seus próprios
-- campos (lib/professions.ts) e eles ficam guardados aqui sem precisar de
-- coluna nova a cada profissão.
alter table public.contacts add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.deals add column if not exists details jsonb not null default '{}'::jsonb;
