-- Assinatura Stripe: plano Pro pago, sincronizado via webhook.
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan text not null default 'free',
  add column if not exists plan_status text,
  add column if not exists current_period_end timestamptz;

create unique index if not exists profiles_stripe_customer_unique
  on public.profiles (stripe_customer_id) where stripe_customer_id is not null;
