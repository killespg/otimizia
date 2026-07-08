-- Organizações: unidade de tenancy. Toda conta passa a pertencer a uma
-- organização (pessoal, com 1 membro, ou de empresa, com vários). Billing
-- migra de profiles para cá — uma assinatura por organização, não por pessoa.
-- Papel 'admin' não é de pessoa única: uma org pode ter vários admins.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',
  plan_status text,
  current_period_end timestamptz,
  trial_ends_at timestamptz
);

create unique index organizations_stripe_customer_unique
  on public.organizations (stripe_customer_id) where stripe_customer_id is not null;

create type org_role as enum ('admin', 'member');

create table public.organization_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_idx on public.organization_members (user_id);
