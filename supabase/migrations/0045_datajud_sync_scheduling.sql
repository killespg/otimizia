-- Cron do DataJud deixa de varrer tudo a cada execucao: agora pula linhas
-- sincronizadas recentemente e prioriza quem tem prazo mais proximo. Nao e
-- webhook (a API publica do CNJ nao oferece push) — so um agendamento
-- incremental com backoff simples em cima do polling que ja existia.

alter table public.legal_cases add column if not exists datajud_sync_failed_count integer not null default 0;
alter table public.legal_cases add column if not exists datajud_next_sync_after timestamptz;
create index if not exists legal_cases_datajud_schedule_idx on public.legal_cases(datajud_next_sync_after, next_deadline_at);

alter table public.legal_watched_processes add column if not exists datajud_sync_failed_count integer not null default 0;
alter table public.legal_watched_processes add column if not exists datajud_next_sync_after timestamptz;
create index if not exists legal_watched_processes_datajud_schedule_idx on public.legal_watched_processes(datajud_next_sync_after);
