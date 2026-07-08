alter table public.organizations
  add column if not exists business_context text,
  add column if not exists business_priorities text,
  add column if not exists ai_tone text,
  add column if not exists ai_instructions text;

grant update (
  name,
  business_context,
  business_priorities,
  ai_tone,
  ai_instructions
) on public.organizations to authenticated;
