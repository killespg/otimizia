"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ALL_DASHBOARD_METRICS,
  DASHBOARD_WIDGETS,
  cleanDashboardText,
  getDashboardPreferences,
  isDashboardAccent,
  isDashboardStyle,
  isMetricKey,
  isDashboardWidgetKey,
  mergeScopedPreferences,
  type DashboardPreferences,
} from "@/lib/workspace/dashboard-preferences";
import { getProfessionPreset, type MetricKey } from "@/lib/people/professions";
import { moneyToCentsOrNull } from "@/lib/utils/form-parse";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";

export async function updateDashboardPreferences(formData: FormData) {
  const supabase = await createClient();
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
    .select("dashboard_preferences, profession_type, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const workspaceKey = getWorkspaceKey(
    existingProfile?.profession_type,
    user.user_metadata?.profession_type,
    existingProfile?.is_admin ?? false
  );
  const preset = getProfessionPreset(workspaceKey);
  // Só as preferências desta área — não as de outra profissão que a pessoa tenha.
  const existingPreferences = getDashboardPreferences(
    existingProfile?.dashboard_preferences,
    preset,
    workspaceKey
  );
  const metricLabels = Object.fromEntries(
    ALL_DASHBOARD_METRICS.map(({ key }) => [
      key,
      cleanDashboardText(formData.get(`metric_label_${key}`), 42),
    ]).filter(([, label]) => Boolean(label))
  );

  const dashboardPreferences: DashboardPreferences = {
    style,
    accent,
    metrics: metrics.length > 0 ? metrics : (preset.metrics.map((metric) => metric.key) as MetricKey[]),
    metricLabels,
    widgets: widgets.length > 0 ? widgets : existingPreferences.widgets.length > 0 ? existingPreferences.widgets : [...DASHBOARD_WIDGETS],
    showAnimatedBackground: formData.has("dashboard_animated_background")
      ? formData.get("dashboard_animated_background") !== "0"
      : existingPreferences.showAnimatedBackground,
    salesMarketingCostCents: formData.has("sales_marketing_cost")
      ? moneyToCentsOrNull(formData.get("sales_marketing_cost")) ?? 0
      : existingPreferences.salesMarketingCostCents,
  };

  const { data: savedPreferences, error } = await supabase
    .from("profiles")
    .update({
      dashboard_preferences: mergeScopedPreferences(
        existingProfile?.dashboard_preferences,
        workspaceKey,
        dashboardPreferences
      ),
    })
    .eq("id", user.id)
    .select("dashboard_preferences")
    .maybeSingle();

  if (error || !savedPreferences) {
    throw new Error("Não deu para salvar o painel agora.");
  }

  revalidatePath("/", "layout");
  revalidatePath("/painel");
  revalidatePath("/imoveis/dashboard");
  revalidatePath("/configuracoes");
}

export async function updateDashboardBackgroundVisibility(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("dashboard_preferences, profession_type, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const workspaceKey = getWorkspaceKey(
    existingProfile?.profession_type,
    user.user_metadata?.profession_type,
    existingProfile?.is_admin ?? false,
  );
  const preset = getProfessionPreset(workspaceKey);
  const existingPreferences = getDashboardPreferences(
    existingProfile?.dashboard_preferences,
    preset,
    workspaceKey,
  );
  const nextPreferences: DashboardPreferences = {
    ...existingPreferences,
    showAnimatedBackground: formData.get("dashboard_animated_background") !== "0",
  };

  const { data: savedPreferences, error } = await supabase
    .from("profiles")
    .update({
      dashboard_preferences: mergeScopedPreferences(
        existingProfile?.dashboard_preferences,
        workspaceKey,
        nextPreferences,
      ),
    })
    .eq("id", user.id)
    .select("dashboard_preferences")
    .maybeSingle();

  if (error || !savedPreferences) {
    throw new Error("Não deu para alterar o fundo agora.");
  }

  revalidatePath("/", "layout");
  revalidatePath("/painel");
  revalidatePath("/imoveis/dashboard");
  revalidatePath("/configuracoes");
}
