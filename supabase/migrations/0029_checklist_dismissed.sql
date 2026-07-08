alter table public.profiles
  add column if not exists checklist_dismissed_at timestamptz;

grant update (
  checklist_dismissed_at
) on public.profiles to authenticated;
