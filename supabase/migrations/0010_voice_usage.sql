-- Limite de minutos de chamada de voz por mês: cada ligação reporta sua
-- duração (segundos) e soma numa linha por usuário+mês. increment_voice_usage
-- roda como security definer e usa auth.uid() internamente (nunca um
-- owner_id vindo do cliente) para que ninguém consiga somar uso em nome de
-- outro usuário.
create table public.voice_usage (
  owner_id uuid not null references auth.users (id) on delete cascade,
  year_month text not null,
  seconds_used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (owner_id, year_month)
);

alter table public.voice_usage enable row level security;

create policy "voice_usage_select_own" on public.voice_usage
  for select using (auth.uid() = owner_id);

create or replace function public.increment_voice_usage(p_seconds integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_month text := to_char(now(), 'YYYY-MM');
  v_total integer;
begin
  if v_owner is null then
    raise exception 'not authenticated';
  end if;

  insert into public.voice_usage (owner_id, year_month, seconds_used)
  values (v_owner, v_month, greatest(p_seconds, 0))
  on conflict (owner_id, year_month)
  do update set
    seconds_used = voice_usage.seconds_used + greatest(p_seconds, 0),
    updated_at = now()
  returning seconds_used into v_total;

  return v_total;
end;
$$;

grant execute on function public.increment_voice_usage(integer) to authenticated;
