import { logError } from "@/lib/utils/logger";
import { sendPushToUser } from "@/lib/integrations/push";
import { getUsersWithDueTasks, markSent, summaryMessage } from "@/lib/crm/reminders";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Disparado pelo Vercel Cron (vercel.json), mesmo esquema de autenticação do
// /api/cron/datajud-sync: a Vercel injeta "Authorization: Bearer
// <CRON_SECRET>" automaticamente.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const summaries = await getUsersWithDueTasks(admin);
  if (summaries.length === 0) {
    return Response.json({ usersChecked: 0, pushed: 0 });
  }

  const userIds = summaries.map((s) => s.userId);
  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("user_id, daily_push")
    .in("user_id", userIds);
  const pushEnabled = new Set(
    (prefs ?? []).filter((p) => p.daily_push !== false).map((p) => p.user_id as string)
  );

  let pushed = 0;
  for (const summary of summaries) {
    if (!pushEnabled.has(summary.userId)) continue;
    const isNewSend = await markSent(admin, summary.userId, "daily_push");
    if (!isNewSend) continue;

    try {
      const { sent } = await sendPushToUser(admin, summary.userId, {
        title: "Retornos de hoje",
        body: `Você tem ${summaryMessage(summary)} esperando resposta.`,
        url: "/tarefas",
      });
      if (sent > 0) pushed++;
    } catch (err) {
      logError("cron/push-reminders.send-failed", err, { userId: summary.userId });
    }
  }

  return Response.json({ usersChecked: summaries.length, pushed });
}
