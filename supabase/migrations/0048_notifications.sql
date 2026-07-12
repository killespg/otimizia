-- Base para lembretes proativos (push diário e e-mail diário): assinaturas
-- de Web Push por usuário, preferências de canal por usuário e um log de
-- disparo para dedupe (não mandar o mesmo aviso duas vezes no mesmo dia).

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
-- Só o próprio dono gerencia a assinatura do próprio dispositivo — não é
-- dado de organização, é credencial do navegador/aparelho da pessoa.
create policy "push_subscriptions_owner" on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_push boolean not null default true,
  daily_summary_email boolean not null default true,
  stalled_deal_email boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
create policy "notification_preferences_owner" on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Cria a linha de preferências (todas ligadas por padrão) junto com o
-- profile, no mesmo momento em que handle_new_user já roda — assim nunca
-- existe profile sem preferências e nenhum código precisa fazer upsert
-- defensivo no primeiro acesso às configurações.
create or replace function public.handle_new_profile_notification_prefs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_notification_prefs
  after insert on public.profiles
  for each row execute function public.handle_new_profile_notification_prefs();

-- Backfill para contas já existentes.
insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- Dedupe de envio diário (push e e-mail): só a service role toca aqui (cron),
-- mesmo padrão de whatsapp_webhook_events/stripe_webhook_events — nenhuma
-- policy para anon/authenticated.
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('daily_push', 'daily_summary_email', 'stalled_deal_email')),
  sent_for_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, sent_for_date)
);

alter table public.notification_log enable row level security;
