-- Lista leve de "processos acompanhados": todo processo que alguém pesquisa
-- (aba Consultar ou o widget do painel) entra aqui, mesmo sem virar caso
-- formal. O cron diário (0039) sincroniza também esta tabela e atualiza
-- last_movement_at/last_movement_nome quando aparece movimentação nova —
-- isso alimenta o cartão "Mudanças recentes" no painel.
create table public.legal_watched_processes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  tribunal_alias text not null,
  case_number text not null,
  case_id uuid references public.legal_cases(id) on delete set null,
  label text,
  last_movement_nome text,
  last_movement_at timestamptz,
  last_synced_at timestamptz,
  seen_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (org_id, tribunal_alias, case_number)
);
create index legal_watched_processes_org_idx on public.legal_watched_processes (org_id, last_movement_at desc);

alter table public.legal_watched_processes enable row level security;
create policy "legal_watched_processes_all_org" on public.legal_watched_processes
  for all using (public.can_view_legal(org_id)) with check (public.can_view_legal(org_id));
