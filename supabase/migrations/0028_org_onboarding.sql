alter table public.organizations
  add column if not exists onboarded_at timestamptz;

grant update (
  onboarded_at
) on public.organizations to authenticated;
