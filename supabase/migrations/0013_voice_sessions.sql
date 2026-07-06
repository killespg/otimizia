-- O contador de uso de voz (voice_usage) até aqui era incrementado com o
-- número de segundos que o PRÓPRIO CLIENTE reportava — dava para burlar o
-- limite de 20 min/mês simplesmente não chamando /api/realtime/usage (ou
-- chamando com um valor baixo). Esta migração move a contagem de tempo para
-- o relógio do servidor: cada chamada abre uma linha em voice_sessions e o
-- tempo cobrado é sempre "agora (do Postgres) - última pulsação", nunca um
-- número vindo do cliente.
create table public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table public.voice_sessions enable row level security;

create policy "voice_sessions_select_own" on public.voice_sessions
  for select using (auth.uid() = owner_id);

create index voice_sessions_open_idx on public.voice_sessions (owner_id)
  where closed_at is null;

-- Fecha (cobra) qualquer sessão que o usuário tenha abandonado sem encerrar
-- direito (aba fechada, app derrubado etc). Cobra só até a última pulsação
-- conhecida + uma folga pequena, nunca até "agora" — assim uma conexão que
-- caiu não vira uma cobrança gigante quando o usuário volta dias depois.
create or replace function public.close_stale_voice_sessions(p_grace_seconds integer default 30)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_session record;
  v_elapsed integer;
begin
  if v_owner is null then
    raise exception 'not authenticated';
  end if;

  for v_session in
    select * from public.voice_sessions
    where owner_id = v_owner and closed_at is null
    for update
  loop
    v_elapsed := least(
      greatest(0, extract(epoch from (now() - v_session.last_heartbeat_at))::integer),
      p_grace_seconds
    );
    if v_elapsed > 0 then
      perform public.increment_voice_usage(v_elapsed);
    end if;
    update public.voice_sessions set closed_at = now() where id = v_session.id;
  end loop;
end;
$$;

grant execute on function public.close_stale_voice_sessions(integer) to authenticated;

-- Chamada pelo endpoint de token antes de emitir um novo client secret.
-- Primeiro liquida qualquer sessão anterior abandonada, depois abre uma nova.
create or replace function public.start_voice_session()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_id uuid;
begin
  if v_owner is null then
    raise exception 'not authenticated';
  end if;

  perform public.close_stale_voice_sessions();

  insert into public.voice_sessions (owner_id)
  values (v_owner)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.start_voice_session() to authenticated;

-- Pulsação periódica (a cada ~20s durante a chamada) e encerramento (ao
-- desligar). O tempo cobrado é sempre "agora do Postgres - last_heartbeat_at",
-- nunca um valor enviado pelo cliente.
create or replace function public.checkpoint_voice_session(p_session_id uuid, p_close boolean default false)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_session record;
  v_elapsed integer;
  v_total integer;
begin
  if v_owner is null then
    raise exception 'not authenticated';
  end if;

  select * into v_session
  from public.voice_sessions
  where id = p_session_id and owner_id = v_owner and closed_at is null
  for update;

  if not found then
    raise exception 'session not found or already closed';
  end if;

  v_elapsed := greatest(0, extract(epoch from (now() - v_session.last_heartbeat_at))::integer);

  update public.voice_sessions
  set last_heartbeat_at = now(),
      closed_at = case when p_close then now() else null end
  where id = p_session_id;

  v_total := public.increment_voice_usage(v_elapsed);
  return v_total;
end;
$$;

grant execute on function public.checkpoint_voice_session(uuid, boolean) to authenticated;

-- O cliente não deve mais somar segundos diretamente: só o servidor (via
-- checkpoint_voice_session / close_stale_voice_sessions) chama esta função.
revoke execute on function public.increment_voice_usage(integer) from authenticated;
