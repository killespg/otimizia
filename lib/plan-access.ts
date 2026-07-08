import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/logger";
import { getPlanAccess, type PlanAccess } from "@/lib/plan";

export async function getUserPlanAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanAccess> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, plan_status, trial_ends_at, stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logError("plan-access", error, { userId });
    return { hasAccess: false, status: "free", trialDaysLeft: null };
  }

  return getPlanAccess(profile);
}
