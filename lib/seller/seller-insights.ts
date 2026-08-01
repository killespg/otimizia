import { dealValueOrZero } from "@/lib/crm/deals";
import type { Contact, Deal } from "@/lib/supabase/types";

type SellerContact = Pick<Contact, "id" | "source">;

type SellerInsightInput = {
  allDeals: Deal[];
  wonThisMonth: Deal[];
  lostThisMonth: Deal[];
  contacts: SellerContact[];
  salesMarketingCostCents: number;
};

export type SellerCommercialInsights = {
  acquiredCustomersThisMonth: number;
  cacCents: number | null;
  lifetimeValueCents: number | null;
  salesCycleDays: number | null;
  salesCycleBasis: "month" | "history" | null;
  topLeadSource: string | null;
  topLossReason: string | null;
};

export function buildSellerCommercialInsights({
  allDeals,
  wonThisMonth,
  lostThisMonth,
  contacts,
  salesMarketingCostCents,
}: SellerInsightInput): SellerCommercialInsights {
  const historicalWon = allDeals.filter((deal) => deal.stage === "ganho" && deal.closed_at);
  const historicalLost = allDeals.filter((deal) => deal.stage === "perdido");
  const cycleDeals = wonThisMonth.length > 0 ? wonThisMonth : historicalWon;
  const customerCount = distinctCustomerCount(historicalWon);
  const acquiredCustomersThisMonth = distinctCustomerCount(wonThisMonth);
  const contactById = new Map(contacts.map((contact) => [contact.id, contact]));

  return {
    acquiredCustomersThisMonth,
    cacCents:
      salesMarketingCostCents > 0 && acquiredCustomersThisMonth > 0
        ? Math.round(salesMarketingCostCents / acquiredCustomersThisMonth)
        : null,
    lifetimeValueCents:
      customerCount > 0
        ? Math.round(
            historicalWon.reduce((sum, deal) => sum + dealValueOrZero(deal), 0) /
              customerCount,
          )
        : null,
    salesCycleDays: averageCycleDays(cycleDeals),
    salesCycleBasis:
      cycleDeals.length === 0 ? null : wonThisMonth.length > 0 ? "month" : "history",
    topLeadSource: mostFrequent(
      historicalWon.map((deal) =>
        deal.contact_id ? contactById.get(deal.contact_id)?.source ?? null : null,
      ),
    ),
    topLossReason: mostFrequent(
      (lostThisMonth.length > 0 ? lostThisMonth : historicalLost).map(
        (deal) => deal.details?.loss_reason ?? null,
      ),
    ),
  };
}

function distinctCustomerCount(deals: Deal[]) {
  const contactIds = new Set(
    deals.map((deal) => deal.contact_id).filter((id): id is string => Boolean(id)),
  );
  const dealsWithoutContact = deals.filter((deal) => !deal.contact_id).length;
  return contactIds.size + dealsWithoutContact;
}

function averageCycleDays(deals: Deal[]) {
  const durations = deals
    .filter((deal) => deal.closed_at)
    .map((deal) => {
      const duration = new Date(deal.closed_at as string).getTime() - new Date(deal.created_at).getTime();
      return duration >= 0 ? duration / 86_400_000 : null;
    })
    .filter((duration): duration is number => duration !== null);

  if (durations.length === 0) return null;
  return Math.round((durations.reduce((sum, duration) => sum + duration, 0) / durations.length) * 10) / 10;
}

function mostFrequent(values: Array<string | null>) {
  const counts = new Map<string, number>();
  for (const rawValue of values) {
    const value = rawValue?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let winner: string | null = null;
  let winnerCount = 0;
  for (const [value, count] of counts) {
    if (count > winnerCount) {
      winner = value;
      winnerCount = count;
    }
  }
  return winner;
}
