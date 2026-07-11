import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncCaseWithDatajud } from "@/lib/law-datajud-sync";
import { syncWatchedProcesses } from "@/lib/law-watched-processes";

export const runtime = "nodejs";
export const maxDuration = 300;

// Disparado pelo Vercel Cron (vercel.json) — a Vercel injeta
// "Authorization: Bearer <CRON_SECRET>" automaticamente quando essa env var
// está configurada no projeto; qualquer outra origem é rejeitada.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: cases, error } = await admin
    .from("legal_cases")
    .select("id, org_id, title, case_number, datajud_tribunal_alias, responsible_id, created_by")
    .not("datajud_tribunal_alias", "is", null)
    .not("case_number", "is", null)
    .not("status", "in", "(closed,archived)");

  if (error) {
    logError("cron/datajud-sync.list-failed", error);
    return Response.json({ error: "Falha ao listar casos." }, { status: 500 });
  }

  let synced = 0;
  let newEvents = 0;
  let newDeadlines = 0;
  const errors: { caseId: string; error: string }[] = [];

  // Sequencial de propósito — é a API pública e gratuita do CNJ, não faz
  // sentido bombardear em paralelo por educação com o serviço.
  for (const legalCase of cases ?? []) {
    const result = await syncCaseWithDatajud(admin, legalCase);
    synced++;
    newEvents += result.newEvents;
    newDeadlines += result.newDeadlines;
    if (result.error) errors.push({ caseId: legalCase.id, error: result.error });
  }

  const watchedResult = await syncWatchedProcesses(admin);

  return Response.json({
    casesChecked: synced,
    newEvents,
    newDeadlines,
    errors,
    watchedProcessesChecked: watchedResult.checked,
    watchedProcessesUpdated: watchedResult.updated,
  });
}
