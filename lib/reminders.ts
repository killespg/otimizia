import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrDayBoundsUtc } from "@/lib/br-time";

export type DueTasksSummary = {
  userId: string;
  overdueCount: number;
  todayCount: number;
};

// Mesmo cálculo de "hoje"/"atrasado" usado em app/(app)/tasks/page.tsx,
// reimplementado em query (o cron roda fora do React, sem acesso ao
// filtro em memória da tela). Responsável (assignee_id) é quem recebe o
// aviso; sem responsável definido, cai para quem criou o lembrete.
export async function getUsersWithDueTasks(admin: SupabaseClient): Promise<DueTasksSummary[]> {
  const { endUtc } = getBrDayBoundsUtc();
  const nowIso = new Date().toISOString();

  const { data: tasks } = await admin
    .from("tasks")
    .select("due_at, assignee_id, owner_id")
    .eq("done", false)
    .neq("review_status", "submitted")
    .not("due_at", "is", null)
    .lte("due_at", endUtc.toISOString());

  const byUser = new Map<string, { overdue: number; today: number }>();
  for (const task of tasks ?? []) {
    const userId = (task.assignee_id as string | null) ?? (task.owner_id as string);
    const entry = byUser.get(userId) ?? { overdue: 0, today: 0 };
    if ((task.due_at as string) < nowIso) entry.overdue++;
    else entry.today++;
    byUser.set(userId, entry);
  }

  return Array.from(byUser.entries()).map(([userId, counts]) => ({
    userId,
    overdueCount: counts.overdue,
    todayCount: counts.today,
  }));
}

export function summaryMessage(summary: DueTasksSummary): string {
  const parts: string[] = [];
  if (summary.overdueCount > 0) {
    parts.push(`${summary.overdueCount} ${summary.overdueCount === 1 ? "atrasado" : "atrasados"}`);
  }
  if (summary.todayCount > 0) {
    parts.push(`${summary.todayCount} para hoje`);
  }
  return parts.join(" e ");
}

// Registra o disparo do dia (dedupe): retorna false se já foi enviado hoje
// para esse usuário/canal — o INSERT com unique(user_id, kind, sent_for_date)
// falha com 23505 nesse caso, mesmo padrão de dedupe usado nos webhooks.
export async function markSent(
  admin: SupabaseClient,
  userId: string,
  kind: "daily_push" | "daily_summary_email" | "stalled_deal_email"
): Promise<boolean> {
  const { dateKey } = getBrDayBoundsUtc();
  const { error } = await admin
    .from("notification_log")
    .insert({ user_id: userId, kind, sent_for_date: dateKey });
  return !error;
}

// Dedupe por EVENTO (não por dia) — usado pelos lembretes automáticos de
// visita (RE-3xx): uma mesma visita só recebe cada tipo de lembrete uma
// vez, não importa quantas vezes o cron rode dentro da janela. Índice
// único parcial em (entity_id, kind) — ver 0060_real_estate_visits_and_events.sql.
export async function markEventSent(
  admin: SupabaseClient,
  userId: string,
  entityId: string,
  kind: "visit_reminder_24h_whatsapp" | "visit_reminder_2h_push"
): Promise<boolean> {
  const { error } = await admin
    .from("notification_log")
    .insert({ user_id: userId, kind, entity_id: entityId });
  return !error;
}
