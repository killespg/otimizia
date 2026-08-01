"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logError } from "@/lib/utils/logger";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function ensureOk(error: unknown, fallback: string) {
  if (!error) return;
  logError("settings.notifications", error);
  throw new Error(fallback);
}

export async function savePushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const { supabase, user } = await requireUser();
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error("Assinatura de push inválida.");
  }
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  ensureOk(error, "Não deu para ativar as notificações.");
}

export async function deletePushSubscription(endpoint: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  ensureOk(error, "Não deu para desativar as notificações.");
}

export async function updateNotificationPreferences(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    daily_push: formData.get("daily_push") === "on",
    daily_summary_email: formData.get("daily_summary_email") === "on",
    stalled_deal_email: formData.get("stalled_deal_email") === "on",
    updated_at: new Date().toISOString(),
  });
  ensureOk(error, "Não deu para salvar suas preferências de aviso.");
  revalidatePath("/painel/configuracoes");
}

export async function regenerateCalendarFeed(): Promise<string> {
  const { supabase, user } = await requireUser();
  const token = randomUUID();
  const { error } = await supabase
    .from("profiles")
    .update({ calendar_ics_token: token })
    .eq("id", user.id);
  ensureOk(error, "Não deu para gerar um novo link.");
  revalidatePath("/painel/configuracoes");
  return token;
}

