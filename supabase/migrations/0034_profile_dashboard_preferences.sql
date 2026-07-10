alter table public.profiles
  add column if not exists dashboard_preferences jsonb not null default '{}'::jsonb;

grant update (name, profession_type, dashboard_preferences) on public.profiles to authenticated;
