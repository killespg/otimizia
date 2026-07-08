import type { Deal } from "@/lib/supabase/types";
import { formatBRL } from "@/lib/format";

export function getDealValueCents(deal: Pick<Deal, "value_cents" | "details">): number | null {
  if (deal.details?.value_unset === "true") return null;
  return typeof deal.value_cents === "number" && Number.isFinite(deal.value_cents)
    ? deal.value_cents
    : null;
}

export function dealValueOrZero(deal: Pick<Deal, "value_cents" | "details">): number {
  return getDealValueCents(deal) ?? 0;
}

export function formatDealValue(deal: Pick<Deal, "value_cents" | "details">): string {
  const cents = getDealValueCents(deal);
  return cents === null ? "Sem preço" : formatBRL(cents);
}
