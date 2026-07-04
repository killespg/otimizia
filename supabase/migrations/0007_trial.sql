-- Teste grátis de 30 dias do Pro pra toda conta nova, sem cartão.
alter table public.profiles add column if not exists trial_ends_at timestamptz;

-- Contas criadas antes do trial existir tambem recebem 30 dias a partir da
-- aplicacao desta migration, desde que ainda nao tenham assinatura Stripe.
update public.profiles
set
  plan = 'pro',
  plan_status = 'trialing',
  trial_ends_at = now() + interval '30 days'
where trial_ends_at is null
  and stripe_subscription_id is null
  and coalesce(plan_status, '') not in ('active', 'trialing', 'past_due');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, profession_type, cpf, terms_accepted_at, plan, plan_status, trial_ends_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'profession_type', 'autonomous_seller'),
    new.raw_user_meta_data ->> 'cpf',
    case when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now() else null end,
    'pro',
    'trialing',
    now() + interval '30 days'
  );
  return new;
end;
$$;
