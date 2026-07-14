-- Card dispensável de "novidades" quando real_estate_v2_enabled liga pro
-- workspace do corretor (item 5 da leva pós-Fases 0-7). Mesmo padrão de
-- checklist_dismissed_at (0029): timestamptz nullable no profile do
-- próprio usuário, não um jsonb de preferências — é um "já vi isso" único,
-- não configuração.
--
-- Reversível: rollback = `alter table public.profiles drop column if
-- exists real_estate_v2_intro_dismissed_at;` numa migration nova (o grant
-- cai sozinho quando a coluna é removida).
alter table public.profiles
  add column if not exists real_estate_v2_intro_dismissed_at timestamptz;

grant update (
  real_estate_v2_intro_dismissed_at
) on public.profiles to authenticated;
