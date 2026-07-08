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

export function getCommissionPercent(deal: Pick<Deal, "details">): number | null {
  const raw = deal.details?.commission_percent;
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function getCommissionCents(deal: Pick<Deal, "value_cents" | "details">): number | null {
  const value = getDealValueCents(deal);
  const percent = getCommissionPercent(deal);
  if (value === null || percent === null) return null;
  return Math.round((value * percent) / 100);
}

export function formatCommission(deal: Pick<Deal, "value_cents" | "details">): string | null {
  const cents = getCommissionCents(deal);
  return cents === null ? null : formatBRL(cents);
}
