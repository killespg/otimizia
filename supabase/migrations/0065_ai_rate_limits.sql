-- Rate limiting simples pras rotas que chamam a API da Anthropic direto
-- (custo real por requisição). Sem Redis/Upstash: uma tabela de contagem
-- por janela fixa em Postgres já resolve na escala atual do produto.
--
-- subject_id é texto livre (não FK) de propósito: pode ser um user_id, um
-- org_id, ou "org_id:algo" dependendo da rota (ver lib/ai/rate-limit.ts) —
-- cada rota decide a granularidade certa pra ela (ex: o webhook de
-- WhatsApp não tem "usuário autenticado", só org).
--
-- Reversível: rollback = `drop table if exists public.ai_rate_limits;`
-- e `drop function if exists public.increment_ai_rate_limit(text, text, timestamptz);`
create table public.ai_rate_limits (
  route text not null,
  subject_id text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (route, subject_id, window_start)
);

create index ai_rate_limits_cleanup_idx on public.ai_rate_limits(window_start);

-- Service-role only (mesmo padrão de crm_domain_events/notification_log):
-- é infraestrutura interna de controle de custo, não dado que o app deva
-- expor ao usuário autenticado.
alter table public.ai_rate_limits enable row level security;

-- Incremento atômico: evita a corrida "leu count=N, escreveu count=N+1"
-- que existiria se isso fosse feito como select + insert/update em JS.
create or replace function public.increment_ai_rate_limit(
  p_route text,
  p_subject_id text,
  p_window_start timestamptz
) returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.ai_rate_limits (route, subject_id, window_start, count)
  values (p_route, p_subject_id, p_window_start, 1)
  on conflict (route, subject_id, window_start)
  do update set count = public.ai_rate_limits.count + 1
  returning count;
$$;
