import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DatajudApiError,
  latestMovimento,
  normalizeProcessNumber,
  searchDatajudProcess,
  type DatajudProcess,
} from "@/lib/datajud";
import { logError } from "@/lib/logger";

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

// Roda no cron: verifica cada processo acompanhado por qualquer organização
// e atualiza a última movimentação conhecida quando há algo mais novo do
// que o que já tínhamos — isso é o que acende "Mudanças recentes" no
// painel (seen_at não é tocado aqui, só quando o usuário vê/dispensa).
export async function syncWatchedProcesses(supabase: SupabaseClient): Promise<WatchedProcessSyncResult> {
  const { data: watched, error } = await supabase
    .from("legal_watched_processes")
    .select("id, org_id, tribunal_alias, case_number, last_movement_at");
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
      continue;
    }
    if (!process) continue;

    const latest = latestMovimento(process.movimentos);
    if (!latest) continue;
    const isNewer = !entry.last_movement_at || new Date(latest.dataHora).getTime() > new Date(entry.last_movement_at).getTime();

    await supabase
      .from("legal_watched_processes")
      .update({
        last_synced_at: new Date().toISOString(),
        ...(isNewer ? { last_movement_at: latest.dataHora, last_movement_nome: latest.nome } : {}),
      })
      .eq("id", entry.id);

    if (isNewer) updated++;
  }

  return { checked, updated };
}
