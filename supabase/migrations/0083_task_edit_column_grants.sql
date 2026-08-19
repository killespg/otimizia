-- Reparo: a 0072 revogou UPDATE de tasks do authenticated e reconcedeu via
-- allowlist de colunas calculada naquela época. `case_id` e `notes`, criadas
-- na 0082, não entraram nessa allowlist; por isso salvar um lembrete com
-- processo vinculado ou observações falhava com 42501 permission denied.
grant update (case_id, notes) on public.tasks to authenticated;
