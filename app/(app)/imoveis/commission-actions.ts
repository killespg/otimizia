"use server";

import { revalidatePath } from "next/cache";
import { moneyToCentsOrNull, optionalUuid, requiredText, text } from "@/lib/form-parse";
import { requireRealEstate } from "./actions";

function requiredMoneyToCents(v: FormDataEntryValue | null, label: string): number {
  const cents = moneyToCentsOrNull(v);
  if (cents === null) throw new Error(`Informe ${label}.`);
  return cents;
}

export async function createCommission(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const dealId = requiredText(formData.get("deal_id"), "Atendimento", 80);
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);
  const brokerId = requiredText(formData.get("broker_id"), "Corretor", 80);
  const grossValue = requiredMoneyToCents(formData.get("gross_sale_value"), "o valor da venda");
  const percent = Number(text(formData.get("commission_percent"), 8)) || 0;
  const expected = moneyToCentsOrNull(formData.get("expected_amount")) ?? Math.round((grossValue * percent) / 100);
  const dueAt = text(formData.get("due_at"), 10) || null;

  const { error } = await supabase.from("real_estate_commissions").insert({
    org_id: orgId,
    deal_id: dealId,
    property_id: propertyId,
    broker_id: brokerId,
    gross_sale_value_cents: grossValue,
    commission_percent: percent,
    expected_amount_cents: expected,
    due_at: dueAt,
  });
  if (error) throw new Error("Não foi possível registrar a comissão.");
  revalidatePath("/imoveis/dashboard");
  revalidatePath(`/imoveis/match/${dealId}`);
}

export async function recordCommissionPayment(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const commissionId = requiredText(formData.get("commission_id"), "Comissão", 80);
  const amount = requiredMoneyToCents(formData.get("amount"), "o valor recebido");

  const { data: commission } = await supabase
    .from("real_estate_commissions")
    .select("received_amount_cents, expected_amount_cents")
    .eq("id", commissionId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!commission) throw new Error("Comissão não encontrada.");

  const totalReceived = (commission.received_amount_cents as number) + amount;
  const status = totalReceived >= (commission.expected_amount_cents as number) ? "received" : "partial";

  const { error } = await supabase
    .from("real_estate_commissions")
    .update({ received_amount_cents: totalReceived, status, received_at: new Date().toISOString() })
    .eq("id", commissionId)
    .eq("org_id", orgId);
  if (error) throw new Error("Não foi possível registrar o recebimento.");
  revalidatePath("/imoveis/dashboard");
}

export async function cancelCommission(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const commissionId = requiredText(formData.get("commission_id"), "Comissão", 80);
  const { error } = await supabase.from("real_estate_commissions").update({ status: "cancelled" }).eq("id", commissionId).eq("org_id", orgId);
  if (error) throw new Error("Não foi possível cancelar a comissão.");
  revalidatePath("/imoveis/dashboard");
}

export async function createTarget(formData: FormData) {
  const { supabase, user, orgId } = await requireRealEstate();
  const brokerId = optionalUuid(formData.get("broker_id"));
  const periodStart = requiredText(formData.get("period_start"), "Início do período", 10);
  const periodEnd = requiredText(formData.get("period_end"), "Fim do período", 10);
  const targetAmount = requiredMoneyToCents(formData.get("target_amount"), "a meta");

  const { error } = await supabase.from("real_estate_targets").insert({
    org_id: orgId,
    broker_id: brokerId,
    period_start: periodStart,
    period_end: periodEnd,
    target_amount_cents: targetAmount,
    created_by: user.id,
  });
  if (error) throw new Error("Não foi possível criar a meta.");
  revalidatePath("/imoveis/dashboard");
}
