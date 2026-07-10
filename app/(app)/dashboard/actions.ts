"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ALL_DASHBOARD_METRICS,
  DASHBOARD_WIDGETS,
  cleanDashboardText,
  isDashboardAccent,
  isDashboardStyle,
  isMetricKey,
  isDashboardWidgetKey,
} from "@/lib/dashboard-preferences";
import { createClient } from "@/lib/supabase/server";

export async function updateDashboardPreferences(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const styleValue = formData.get("dashboard_style");
  const style = isDashboardStyle(styleValue) ? styleValue : "glow";
  const accentValue = formData.get("dashboard_accent");
  const accent = isDashboardAccent(accentValue) ? accentValue : "purple";

  const metrics = formData.getAll("dashboard_metrics").filter(isMetricKey).slice(0, 8);
  const widgets = formData.getAll("dashboard_widgets").filter(isDashboardWidgetKey);
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("dashboard_preferences")
    .eq("id", user.id)
    .maybeSingle();
  const existingPreferences = existingProfile?.dashboard_preferences as
    | { widgets?: unknown }
    | null
    | undefined;
  const existingWidgets = Array.isArray(existingPreferences?.widgets)
    ? existingPreferences.widgets.filter(isDashboardWidgetKey)
    : [];
  const metricLabels = Object.fromEntries(
    ALL_DASHBOARD_METRICS.map(({ key }) => [
      key,
      cleanDashboardText(formData.get(`metric_label_${key}`), 42),
    ]).filter(([, label]) => Boolean(label))
  );

  const dashboardPreferences = {
    style,
    accent,
    metrics: metrics.length > 0 ? metrics : ["open_value", "open_deals", "won_value_month", "overdue_tasks"],
    metricLabels,
    widgets: widgets.length > 0 ? widgets : existingWidgets.length > 0 ? existingWidgets : DASHBOARD_WIDGETS,
  };

  const { data: savedPreferences, error } = await supabase
    .from("profiles")
    .update({ dashboard_preferences: dashboardPreferences })
    .eq("id", user.id)
    .select("dashboard_preferences")
    .maybeSingle();

  if (error || !savedPreferences) {
    throw new Error("Não deu para salvar o painel agora.");
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
}
