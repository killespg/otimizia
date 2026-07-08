alter table public.organizations
  add column if not exists industry text,
  add column if not exists region text,
  add column if not exists team_size text,
  add column if not exists website text,
  add column if not exists extra_notes text;

grant update (
  industry,
  region,
  team_size,
  website,
  extra_notes
) on public.organizations to authenticated;
