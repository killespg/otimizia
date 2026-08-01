import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DatajudApiError,
  latestMovimento,
  normalizeProcessNumber,
  searchDatajudProcess,
  type DatajudProcess,
} from "@/lib/law/datajud";
import { logError } from "@/lib/utils/logger";
import { backoffHours, hoursFromNow, SUCCESS_SYNC_INTERVAL_HOURS } from "@/lib/law/law-datajud-sync-schedule";

// Registra um processo na lista de acompanhamento na primeira vez que é
// pesquisado — não faz nada se já existir (não queremos resetar
// last_movement_at/seen_at de algo que o usuário já vem acompanhando só
// porque pesquisou de novo).
export async function trackWatchedProcess(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  tribunalAlias: string,
  numeroProcessoRaw: string,
  process: DatajudProcess
): Promise<void> {
  const caseNumber = normalizeProcessNumber(numeroProcessoRaw);
  const latest = latestMovimento(process.movimentos);
  const { error } = await supabase.from("legal_watched_processes").insert({
    org_id: orgId,
    tribunal_alias: tribunalAlias,
    case_number: caseNumber,
    label: process.classe?.nome ?? null,
    last_movement_nome: latest?.nome ?? null,
    last_movement_at: latest?.dataHora ?? null,
    last_synced_at: new Date().toISOString(),
    created_by: userId,
  });
  if (error && error.code !== "23505") {
    logError("law-watched-processes.track-failed", error, { orgId, tribunalAlias, caseNumber });
  }
}

export type WatchedProcessSyncResult = {
  checked: number;
  updated: number;
};

const SYNC_BATCH_LIMIT = 200;

// Roda no cron: verifica os processos acompanhados que já passaram do
// próximo horário agendado (incremental — não varre tudo toda vez), até um
// lote máximo por execução, e atualiza a última movimentação conhecida
// quando há algo mais novo do que o que já tínhamos — isso é o que acende
// "Mudanças recentes" no painel (seen_at não é tocado aqui, só quando o
// usuário vê/dispensa).
export async function syncWatchedProcesses(supabase: SupabaseClient): Promise<WatchedProcessSyncResult> {
  const nowIso = new Date().toISOString();
  const { data: watched, error } = await supabase
    .from("legal_watched_processes")
    .select("id, org_id, tribunal_alias, case_number, last_movement_at, datajud_sync_failed_count")
    .or(`datajud_next_sync_after.is.null,datajud_next_sync_after.lte.${nowIso}`)
    .order("datajud_next_sync_after", { ascending: true, nullsFirst: true })
    .limit(SYNC_BATCH_LIMIT);
  if (error) {
    logError("law-watched-processes.list-failed", error);
    return { checked: 0, updated: 0 };
  }

  let checked = 0;
  let updated = 0;

  for (const entry of watched ?? []) {
    checked++;
    let process: DatajudProcess | null;
    try {
      process = await searchDatajudProcess(entry.tribunal_alias, entry.case_number);
    } catch (syncError) {
      const message = syncError instanceof DatajudApiError ? syncError.message : undefined;
      logError("law-watched-processes.search-failed", syncError, { entryId: entry.id, message });
      const failedCount = (entry.datajud_sync_failed_count ?? 0) + 1;
      await supabase
        .from("legal_watched_processes")
        .update({ datajud_sync_failed_count: failedCount, datajud_next_sync_after: hoursFromNow(backoffHours(failedCount)) })
        .eq("id", entry.id);
      continue;
    }
    if (!process) continue;

    const latest = latestMovimento(process.movimentos);
    const isNewer = Boolean(latest) && (!entry.last_movement_at || new Date(latest!.dataHora).getTime() > new Date(entry.last_movement_at).getTime());

    await supabase
      .from("legal_watched_processes")
      .update({
        last_synced_at: new Date().toISOString(),
        datajud_sync_failed_count: 0,
        datajud_next_sync_after: hoursFromNow(SUCCESS_SYNC_INTERVAL_HOURS),
        ...(isNewer ? { last_movement_at: latest!.dataHora, last_movement_nome: latest!.nome } : {}),
      })
      .eq("id", entry.id);

    if (isNewer) updated++;
  }

  return { checked, updated };
}
