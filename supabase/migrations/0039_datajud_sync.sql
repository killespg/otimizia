-- Monitoramento de processos via DataJud (API pública do CNJ): vincula um
-- caso a um tribunal + numero de processo (reaproveita legal_cases.case_number
-- como o numero CNJ) e guarda quando foi sincronizado pela ultima vez.
-- Movimentacoes novas viram legal_case_events (external_ref evita duplicar
-- em re-sincronizacoes).

alter table public.legal_cases
  add column datajud_tribunal_alias text,
  add column datajud_last_synced_at timestamptz;

alter table public.legal_case_events
  add column external_ref text;

create unique index legal_case_events_external_ref_idx
  on public.legal_case_events (case_id, external_ref)
  where external_ref is not null;
