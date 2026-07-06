-- Stripe reentrega o mesmo evento em retries (e um replay manual do painel
-- também é possível). Sem isso, cada reentrega refaz side effects como
-- retrieve de assinatura. Guardamos o event.id já processado e ignoramos
-- reentregas.
create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
