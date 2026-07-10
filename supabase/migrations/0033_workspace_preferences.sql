alter table public.organizations
  add column if not exists workspace_preferences jsonb not null default '{}'::jsonb;

grant update (name, workspace_preferences) on public.organizations to authenticated;
