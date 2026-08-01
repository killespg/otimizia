import { getPlanAccess, type PlanStatus } from "@/lib/billing/plan";

type ProfileRow = {
  name: string | null;
  plan: string;
  plan_status: string | null;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
};

type ContactRow = { owner_id: string };
type DealRow = { owner_id: string; stage: string; value_cents: number };

export type DevMetrics = {
  totalUsers: number;
  planCounts: Record<PlanStatus, number>;
  signupsByDay: { date: string; count: number }[];
  activatedUsers: number;
  totalContacts: number;
  totalDeals: number;
  openDealsValueCents: number;
  recentSignups: { name: string | null; createdAt: string; status: PlanStatus }[];
};

const SIGNUP_WINDOW_DAYS = 30;

export function computeDevMetrics(
  profiles: ProfileRow[],
  contacts: ContactRow[],
  deals: DealRow[],
  now: Date = new Date()
): DevMetrics {
  const planCounts: Record<PlanStatus, number> = {
    trialing: 0,
    active: 0,
    past_due: 0,
    expired: 0,
    free: 0,
  };
  for (const profile of profiles) {
    planCounts[getPlanAccess(profile, now).status] += 1;
  }

  const dayBuckets = new Map<string, number>();
  for (let i = SIGNUP_WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayBuckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const profile of profiles) {
    const key = profile.created_at.slice(0, 10);
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }
  const signupsByDay = Array.from(dayBuckets, ([date, count]) => ({ date, count }));

  const activatedOwners = new Set<string>();
  for (const contact of contacts) activatedOwners.add(contact.owner_id);
  for (const deal of deals) activatedOwners.add(deal.owner_id);

  const openDealsValueCents = deals
    .filter((deal) => deal.stage !== "ganho" && deal.stage !== "perdido")
    .reduce((sum, deal) => sum + deal.value_cents, 0);

  const recentSignups = [...profiles]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 10)
    .map((profile) => ({
      name: profile.name,
      createdAt: profile.created_at,
      status: getPlanAccess(profile, now).status,
    }));

  return {
    totalUsers: profiles.length,
    planCounts,
    signupsByDay,
    activatedUsers: activatedOwners.size,
    totalContacts: contacts.length,
    totalDeals: deals.length,
    openDealsValueCents,
    recentSignups,
  };
}
