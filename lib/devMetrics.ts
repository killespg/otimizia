import { getPlanAccess, type PlanStatus } from "@/lib/plan";

type ProfileRow = {
  name: string | null;
  plan: string;
  plan_status: string | null;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
};

type ContactRow = { owner_id: string };
type DealRow = { id: string; owner_id: string; stage: string; value_cents: number };
type TaskRow = { deal_id: string | null; done: boolean };

export type DevMetrics = {
  totalUsers: number;
  planCounts: Record<PlanStatus, number>;
  signupsByDay: { date: string; count: number }[];
  activatedUsers: number;
  totalContacts: number;
  totalDeals: number;
  openDealsValueCents: number;
  recentSignups: { name: string | null; createdAt: string; status: PlanStatus }[];
  // Camada "Hábitos" da 0.1 (seção 2 do roadmap): % de negócios abertos com
  // próxima ação definida. É proxy de "pipeline não fica parado", não
  // substitui o "limite operacional" completo (isso depende de 1.1/1.3b).
  openDealsCount: number;
  openDealsWithNextAction: number;
  openDealsWithNextActionRate: number;
};

const SIGNUP_WINDOW_DAYS = 30;

export function computeDevMetrics(
  profiles: ProfileRow[],
  contacts: ContactRow[],
  deals: DealRow[],
  tasks: TaskRow[] = [],
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

  const openDeals = deals.filter((deal) => deal.stage !== "ganho" && deal.stage !== "perdido");
  const openDealsValueCents = openDeals.reduce((sum, deal) => sum + deal.value_cents, 0);

  const dealIdsWithOpenTask = new Set<string>();
  for (const task of tasks) {
    if (task.deal_id && !task.done) dealIdsWithOpenTask.add(task.deal_id);
  }
  const openDealsWithNextAction = openDeals.filter((deal) => dealIdsWithOpenTask.has(deal.id)).length;

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
    openDealsCount: openDeals.length,
    openDealsWithNextAction,
    openDealsWithNextActionRate:
      openDeals.length > 0 ? Math.round((openDealsWithNextAction / openDeals.length) * 100) : 0,
  };
}
