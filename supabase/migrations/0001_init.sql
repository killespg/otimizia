-- CRM para Empreendedores Individuais — schema inicial

-- =========================================================
-- Enum de estágios do funil
-- =========================================================
create type deal_stage as enum ('novo', 'em_contato', 'negociacao', 'ganho', 'perdido');

-- =========================================================
-- profiles (1:1 com auth.users)
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- contacts
-- =========================================================
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  company text,
  source text,
  notes text,
  created_at timestamptz not null default now()
);
create index contacts_owner_idx on public.contacts (owner_id);

-- =========================================================
-- deals
-- =========================================================
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  title text not null,
  value_cents integer not null default 0,
  stage deal_stage not null default 'novo',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index deals_owner_idx on public.deals (owner_id);

-- =========================================================
-- tasks
-- =========================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  title text not null,
  due_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index tasks_owner_idx on public.tasks (owner_id);

-- =========================================================
-- interactions
-- =========================================================
create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index interactions_contact_idx on public.interactions (contact_id);

-- =========================================================
-- Trigger: cria profile automaticamente ao registrar usuário
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.tasks enable row level security;
alter table public.interactions enable row level security;

-- profiles: dono acessa só o próprio
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Macro-padrão para tabelas com owner_id
create policy "contacts_all_own" on public.contacts
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "deals_all_own" on public.deals
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "tasks_all_own" on public.tasks
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "interactions_all_own" on public.interactions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
