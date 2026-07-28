-- Consentimento de cookies (LGPD art. 8º, §1º: o consentimento tem que ser
-- comprovável) e guarda do e-mail de boas-vindas.
--
-- O log é gravado pelo servidor com a service role key a partir de
-- /api/consent — nunca pelo navegador. Se o visitante pudesse escrever aqui,
-- o registro não provaria nada.

create table if not exists public.cookie_consent_logs (
  id uuid primary key default gen_random_uuid(),
  -- Identificador aleatório gerado no navegador e guardado junto do cookie de
  -- preferência. Serve para ligar "aceitou" e "revogou depois" do mesmo
  -- dispositivo sem depender de login nem de IP.
  visitor_id text not null check (visitor_id ~ '^[0-9a-f]{32}$'),
  -- Preenchido só quando a escolha aconteceu com sessão ativa.
  user_id uuid references public.profiles(id) on delete set null,
  policy_version text not null check (char_length(policy_version) between 1 and 32),
  action text not null check (action in ('accepted_all', 'rejected_all', 'custom', 'withdrawn')),
  analytics boolean not null,
  marketing boolean not null,
  -- Guardado truncado, para diferenciar dispositivos numa eventual contestação.
  -- IP deliberadamente NÃO é gravado: seria coletar dado pessoal a mais
  -- justamente no registro que existe para proteger o titular.
  user_agent text check (char_length(user_agent) <= 400),
  created_at timestamptz not null default now()
);

create index if not exists cookie_consent_logs_visitor_idx
  on public.cookie_consent_logs (visitor_id, created_at desc);
create index if not exists cookie_consent_logs_user_idx
  on public.cookie_consent_logs (user_id, created_at desc);

alter table public.cookie_consent_logs enable row level security;

-- Sem policy de insert/update/delete: só a service role escreve. O titular
-- logado pode ver o próprio histórico (direito de acesso, LGPD art. 18, I).
create policy "cookie_consent_logs_owner_select"
on public.cookie_consent_logs
for select
using (user_id = auth.uid());

alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz;
