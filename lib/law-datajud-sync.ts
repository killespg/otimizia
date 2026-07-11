import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyDatajudMovement } from "@/lib/ai/datajud-movement";
import { DatajudApiError, isValidDate, normalizeProcessNumber, searchDatajudProcess } from "@/lib/datajud";
import { logError } from "@/lib/logger";

export type DatajudSyncResult = {
  newEvents: number;
  newDeadlines: number;
  error?: string;
};

type SyncableCase = {
  id: string;
  org_id: string;
  title: string;
  case_number: string | null;
  datajud_tribunal_alias: string | null;
  responsible_id: string | null;
  created_by: string;
};

// Busca o processo no DataJud, registra movimentações novas como
// legal_case_events (dedupe por external_ref) e cria um lembrete de revisão
// em legal_deadlines quando a movimentação parece exigir atenção — nunca
// calcula a data real do prazo, só avisa "vá olhar isso".
export async function syncCaseWithDatajud(
  supabase: SupabaseClient,
  legalCase: SyncableCase
): Promise<DatajudSyncResult> {
  if (!legalCase.datajud_tribunal_alias || !legalCase.case_number) {
    return { newEvents: 0, newDeadlines: 0, error: "Caso sem tribunal/número de processo vinculado." };
  }

  let process;
  try {
    process = await searchDatajudProcess(legalCase.datajud_tribunal_alias, legalCase.case_number);
  } catch (error) {
    const message = error instanceof DatajudApiError ? error.message : "Falha ao consultar o DataJud.";
    logError("law-datajud-sync.search-failed", error, { caseId: legalCase.id });
    return { newEvents: 0, newDeadlines: 0, error: message };
  }

  await supabase
    .from("legal_cases")
    .update({ datajud_last_synced_at: new Date().toISOString() })
    .eq("id", legalCase.id);

  if (!process || process.movimentos.length === 0) {
    return { newEvents: 0, newDeadlines: 0, error: process ? undefined : "Processo não encontrado no DataJud." };
  }

  const numeroNormalizado = normalizeProcessNumber(legalCase.case_number);
  let newEvents = 0;
  let newDeadlines = 0;

  // Mais antigo primeiro, pra timeline ficar em ordem cronológica de criação.
  const movimentos = [...process.movimentos].sort(
    (a, b) =>
      (isValidDate(a.dataHora) ? new Date(a.dataHora).getTime() : 0) -
      (isValidDate(b.dataHora) ? new Date(b.dataHora).getTime() : 0)
  );

  for (const movimento of movimentos) {
    // Já vimos movimentação do DataJud sem dataHora válida — occurred_at é
    // not null na tabela, então cai pro momento da sincronização em vez de
    // falhar o insert (e perder a movimentação) ou gravar lixo.
    const occurredAt = isValidDate(movimento.dataHora) ? movimento.dataHora : new Date().toISOString();
    const externalRef = `datajud:${numeroNormalizado}:${movimento.codigo}:${movimento.dataHora ?? occurredAt}`;
    const { error: insertError } = await supabase
      .from("legal_case_events")
      .insert({
        org_id: legalCase.org_id,
        case_id: legalCase.id,
        created_by: legalCase.responsible_id ?? legalCase.created_by,
        event_type: "update",
        title: movimento.nome,
        description: "Sincronizado automaticamente do DataJud (CNJ).",
        occurred_at: occurredAt,
        external_ref: externalRef,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") continue; // já sincronizado antes
      logError("law-datajud-sync.event-insert-failed", insertError, { caseId: legalCase.id });
      continue;
    }
    newEvents++;

    try {
      const review = await classifyDatajudMovement(movimento.nome, legalCase.title);
      if (review?.needsReview) {
        await supabase.from("legal_deadlines").insert({
          org_id: legalCase.org_id,
          case_id: legalCase.id,
          assigned_to: legalCase.responsible_id,
          created_by: legalCase.responsible_id ?? legalCase.created_by,
          title: `Revisar movimentação: ${movimento.nome}`.slice(0, 180),
          deadline_type: "procedural",
          due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          priority: review.urgent ? "high" : "normal",
          notes: `Gerado automaticamente a partir da sincronização com o DataJud (CNJ). ${review.reason} Este é um lembrete de revisão, não o cálculo do prazo processual real — confirme o prazo no processo antes de agir.`,
        });
        newDeadlines++;
      }
    } catch (error) {
      logError("law-datajud-sync.classify-failed", error, { caseId: legalCase.id });
    }
  }

  return { newEvents, newDeadlines };
}
