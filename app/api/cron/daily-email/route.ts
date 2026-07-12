import { dailySummaryEmail, sendEmail, stalledDealEmail } from "@/lib/email";
import { logError } from "@/lib/logger";
import { getUsersWithDueTasks, markSent } from "@/lib/reminders";
import { getStalledDealsByUser } from "@/lib/stalled-deals";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const SITE_URL = (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

// Disparado pelo Vercel Cron (vercel.json), mesmo esquema de autenticação do
// /api/cron/datajud-sync.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();

  const [dueSummaries, stalledByUser] = await Promise.all([
    getUsersWithDueTasks(admin),
    getStalledDealsByUser(admin),
  ]);

  const userIds = Array.from(
    new Set(dueSummaries.map((s) => s.userId).concat(Array.from(stalledByUser.keys())))
  );
  if (userIds.length === 0) {
    return Response.json({ usersChecked: 0, summaryEmailsSent: 0, stalledEmailsSent: 0 });
  }

  const [{ data: prefs }, { data: profiles }] = await Promise.all([
    admin.from("notification_preferences").select("user_id, daily_summary_email, stalled_deal_email").in("user_id", userIds),
    admin.from("profiles").select("id, email").in("id", userIds),
  ]);
  const prefsByUser = new Map((prefs ?? []).map((p) => [p.user_id as string, p]));
  const emailByUser = new Map((profiles ?? []).map((p) => [p.id as string, p.email as string | null]));

  let summaryEmailsSent = 0;
  let stalledEmailsSent = 0;

  for (const summary of dueSummaries) {
    const email = emailByUser.get(summary.userId);
    const pref = prefsByUser.get(summary.userId);
    if (!email || pref?.daily_summary_email === false) continue;
    const isNewSend = await markSent(admin, summary.userId, "daily_summary_email");
    if (!isNewSend) continue;

    const { subject, html } = dailySummaryEmail({
      overdueCount: summary.overdueCount,
      todayCount: summary.todayCount,
      siteUrl: SITE_URL,
    });
    try {
      if (await sendEmail(email, subject, html)) summaryEmailsSent++;
    } catch (err) {
      logError("cron/daily-email.summary-failed", err, { userId: summary.userId });
    }
  }

  for (const [userId, deals] of Array.from(stalledByUser)) {
    const email = emailByUser.get(userId);
    const pref = prefsByUser.get(userId);
    if (!email || pref?.stalled_deal_email === false || deals.length === 0) continue;
    const isNewSend = await markSent(admin, userId, "stalled_deal_email");
    if (!isNewSend) continue;

    const { subject, html } = stalledDealEmail({ deals, siteUrl: SITE_URL });
    try {
      if (await sendEmail(email, subject, html)) stalledEmailsSent++;
    } catch (err) {
      logError("cron/daily-email.stalled-failed", err, { userId });
    }
  }

  return Response.json({
    usersChecked: userIds.length,
    summaryEmailsSent,
    stalledEmailsSent,
  });
}
