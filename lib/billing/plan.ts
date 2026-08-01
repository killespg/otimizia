export type PlanStatus = "trialing" | "active" | "past_due" | "expired" | "free";

export type PlanAccess = {
  hasAccess: boolean;
  status: PlanStatus;
  trialDaysLeft: number | null;
};

type PlanProfile = {
  plan: string;
  plan_status: string | null;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
} | null;

const DAY_MS = 24 * 60 * 60 * 1000;

export function getPlanAccess(profile: PlanProfile, now: Date = new Date()): PlanAccess {
  if (!profile) {
    return { hasAccess: false, status: "free", trialDaysLeft: null };
  }

  // Assinatura Stripe real — o webhook já mantém plan_status sincronizado.
  if (profile.stripe_subscription_id) {
    const activeStatuses = new Set(["active", "trialing", "past_due"]);
    const status = (profile.plan_status ?? "free") as PlanStatus;
    return {
      hasAccess: profile.plan === "pro" && activeStatuses.has(status),
      status,
      trialDaysLeft: null,
    };
  }

  // Teste grátis sem cartão, controlado só pela nossa data.
  if (profile.plan_status === "trialing" && profile.trial_ends_at) {
    const msLeft = new Date(profile.trial_ends_at).getTime() - now.getTime();
    const trialDaysLeft = Math.max(0, Math.ceil(msLeft / DAY_MS));
    return {
      hasAccess: msLeft > 0,
      status: msLeft > 0 ? "trialing" : "expired",
      trialDaysLeft,
    };
  }

  return {
    hasAccess: profile.plan === "pro",
    status: profile.plan === "pro" ? "active" : "free",
    trialDaysLeft: null,
  };
}
