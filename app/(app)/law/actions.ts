"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageLegal, canViewFinance } from "@/lib/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspaces";
import type { JobRole, LegalCaseStatus } from "@/lib/supabase/types";
import { DATAJUD_TRIBUNAL_ALIASES } from "@/lib/datajud-tribunals";
import { normalizeProcessNumber } from "@/lib/datajud";
import { syncCaseWithDatajud } from "@/lib/law-datajud-sync";

const MAX = { title: 180, text: 1600, short: 160, reference: 180 };

async function requireLawOffice() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  const [{ data: profile }, orgRole, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").eq("id", user.id).maybeSingle(),
    getOrgRole(supabase, orgId, user.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type, profile?.is_admin);
  if (workspaceKey !== "law_office") throw new Error("Este recurso está disponível apenas no workspace de advocacia.");
  return { supabase, user, orgId, isAdmin: orgRole === "admin", jobRole: (membership?.job_role as JobRole | undefined) ?? "staff" };
}

function text(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function requiredText(value: FormDataEntryValue | null, label: string, max: number) {
  const result = text(value, max);
  if (!result) throw new Error(`${label} é obrigatório.`);
  return result;
}

function optionalUuid(value: FormDataEntryValue | null) {
  const result = text(value, 80);
  return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(result) ? result : null;
}

function dateOrNull(value: FormDataEntryValue | null) {
  const result = text(value, 32);
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
}

function dateTimeOrNull(value: FormDataEntryValue | null) {
  const result = text(value, 40);
  const date = result ? new Date(result) : null;
  return date && !Number.isNaN(date.valueOf()) ? date.toISOString() : null;
}

function moneyToCents(value: FormDataEntryValue | null) {
  const raw = text(value, 32).replace(/R\$|\s/g, "");
  if (!raw) return 0;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Informe um valor válido.");
  return Math.round(amount * 100);
}

function positiveInteger(value: FormDataEntryValue | null, fallback = 1) {
  const result = Number(text(value, 8));
  return Number.isInteger(result) && result > 0 && result <= 120 ? result : fallback;
}

function validCaseStatus(value: FormDataEntryValue | null): LegalCaseStatus {
  const result = text(value, 24);
  return ["intake", "active", "waiting", "suspended", "closed", "archived"].includes(result)
    ? result as LegalCaseStatus
    : "intake";
}

export async function createLegalCase(formData: FormData) {
  const { supabase, user, orgId, jobRole, isAdmin } = await requireLawOffice();
  if (!canManageLegal(jobRole, isAdmin)) throw new Error("Seu cargo não pode criar casos jurídicos.");
  const contactId = optionalUuid(formData.get("contact_id"));
  const responsibleId = optionalUuid(formData.get("responsible_id")) ?? user.id;
  const { data: legalCase, error } = await supabase.from("legal_cases").insert({
    org_id: orgId, workspace_key: "law_office", created_by: user.id, contact_id: contactId,
    responsible_id: responsibleId, title: requiredText(formData.get("title"), "Nome do caso", MAX.title),
    case_number: text(formData.get("case_number"), MAX.short) || null,
    area: text(formData.get("area"), MAX.short) || null,
    court: text(formData.get("court"), MAX.short) || null,
    jurisdiction: text(formData.get("jurisdiction"), MAX.short) || null,
    opposing_party: text(formData.get("opposing_party"), MAX.short) || null,
    status: validCaseStatus(formData.get("status")),
    risk_level: ["low", "standard", "high", "critical"].includes(text(formData.get("risk_level"), 16)) ? text(formData.get("risk_level"), 16) : "standard",
    confidentiality: text(formData.get("confidentiality"), 16) === "team" ? "team" : "restricted",
    next_deadline_at: dateTimeOrNull(formData.get("next_deadline_at")),
    summary: text(formData.get("summary"), MAX.text) || null,
  }).select("id").single();
  if (error || !legalCase) throw new Error("Não foi possível criar o caso.");
  await supabase.from("legal_case_members").upsert({ case_id: legalCase.id, user_id: responsibleId, role: "lead" });
  revalidateLaw();
  redirect(`/law/${legalCase.id}`);
}

export async function updateLegalCaseStatus(formData: FormData) {
  const { supabase, orgId, jobRole, isAdmin } = await requireLawOffice();
  if (!canManageLegal(jobRole, isAdmin)) throw new Error("Seu cargo não pode alterar casos jurídicos.");
  const id = requiredText(formData.get("id"), "Caso", 80);
  const { error } = await supabase.from("legal_cases").update({ status: validCaseStatus(formData.get("status")) }).eq("id", id).eq("org_id", orgId);
  if (error) throw new Error("Não foi possível atualizar o caso.");
  revalidateLaw();
}

export async function createLegalDeadline(formData: FormData) {
  const { supabase, user, orgId, jobRole, isAdmin } = await requireLawOffice();
  if (!canManageLegal(jobRole, isAdmin)) throw new Error("Seu cargo não pode criar prazos.");
  const caseId = requiredText(formData.get("case_id"), "Caso", 80);
  const dueAt = dateTimeOrNull(formData.get("due_at"));
  if (!dueAt) throw new Error("Informe a data e hora do prazo.");
  const deadlineType = text(formData.get("deadline_type"), 24);
  const priority = text(formData.get("priority"), 16);
  const { error } = await supabase.from("legal_deadlines").insert({
    org_id: orgId, case_id: caseId, created_by: user.id,
    assigned_to: optionalUuid(formData.get("assigned_to")) ?? user.id,
    title: requiredText(formData.get("title"), "Título", MAX.title), due_at: dueAt,
    deadline_type: ["procedural","hearing","internal","client","administrative"].includes(deadlineType) ? deadlineType : "procedural",
    priority: ["low","normal","high","critical"].includes(priority) ? priority : "normal",
    notes: text(formData.get("notes"), MAX.text) || null,
  });
  if (error) throw new Error("Não foi possível criar o prazo.");
  revalidateLaw(); revalidatePath(`/law/${caseId}`);
}

export async function completeLegalDeadline(formData: FormData) {
  const { supabase, orgId, jobRole, isAdmin } = await requireLawOffice();
  if (!canManageLegal(jobRole, isAdmin)) throw new Error("Seu cargo não pode concluir prazos.");
  const id = requiredText(formData.get("id"), "Prazo", 80);
  const caseId = requiredText(formData.get("case_id"), "Caso", 80);
  const { error } = await supabase.from("legal_deadlines").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id).eq("org_id", orgId);
  if (error) throw new Error("Não foi possível concluir o prazo.");
  revalidateLaw(); revalidatePath(`/law/${caseId}`);
}

export async function createLegalEvent(formData: FormData) {
  const { supabase, user, orgId, jobRole, isAdmin } = await requireLawOffice();
  if (!canManageLegal(jobRole, isAdmin)) throw new Error("Seu cargo não pode registrar movimentações.");
  const caseId = requiredText(formData.get("case_id"), "Caso", 80);
  const eventType = text(formData.get("event_type"), 24);
  const { error } = await supabase.from("legal_case_events").insert({
    org_id: orgId, case_id: caseId, created_by: user.id,
    event_type: ["update","filing","decision","hearing","communication","note"].includes(eventType) ? eventType : "update",
    title: requiredText(formData.get("title"), "Título", MAX.title),
    description: text(formData.get("description"), MAX.text) || null,
    occurred_at: dateTimeOrNull(formData.get("occurred_at")) ?? new Date().toISOString(),
  });
  if (error) throw new Error("Não foi possível registrar a movimentação.");
  revalidatePath(`/law/${caseId}`);
}

export async function createLegalDocumentLink(formData: FormData) {
  const { supabase, user, orgId, jobRole, isAdmin } = await requireLawOffice();
  if (!canManageLegal(jobRole, isAdmin)) throw new Error("Seu cargo não pode adicionar documentos.");
  const caseId = requiredText(formData.get("case_id"), "Caso", 80);
  const url = requiredText(formData.get("external_url"), "Link", 1000);
  try { new URL(url); } catch { throw new Error("Informe um link válido."); }
  const documentType = text(formData.get("document_type"), 32);
  const { error } = await supabase.from("legal_documents").insert({
    org_id: orgId, case_id: caseId, uploaded_by: user.id,
    name: requiredText(formData.get("name"), "Nome", MAX.title), external_url: url,
    document_type: ["petition","contract","evidence","decision","power_of_attorney","client_document","other"].includes(documentType) ? documentType : "other",
    status: "draft", notes: text(formData.get("notes"), MAX.text) || null,
  });
  if (error) throw new Error("Não foi possível adicionar o documento.");
  revalidatePath(`/law/${caseId}`);
}

export async function createFeeAgreement(formData: FormData) {
  const { supabase, user, orgId, jobRole, isAdmin } = await requireLawOffice();
  if (!canViewFinance(jobRole, isAdmin)) throw new Error("Seu cargo não pode criar contratos de honorários.");
  const totalCents = moneyToCents(formData.get("total"));
  const installments = positiveInteger(formData.get("installments"));
  const firstDue = dateOrNull(formData.get("first_due_date"));
  if (totalCents > 0 && !firstDue) throw new Error("Informe o primeiro vencimento.");
  const feeType = text(formData.get("fee_type"), 24);
  if (!["fixed", "recurring", "stage", "hourly", "success", "consultation"].includes(feeType)) throw new Error("Tipo de honorário inválido.");
  const contactId = optionalUuid(formData.get("contact_id"));
  if (!contactId) throw new Error("Escolha o cliente do contrato.");
  const { data: agreement, error } = await supabase.from("fee_agreements").insert({
    org_id: orgId, workspace_key: "law_office", created_by: user.id, contact_id: contactId,
    case_id: optionalUuid(formData.get("case_id")), title: requiredText(formData.get("title"), "Título do contrato", MAX.title),
    fee_type: feeType, total_cents: totalCents,
    success_percent: feeType === "success" ? Number(text(formData.get("success_percent"), 8)) || null : null,
    success_basis: text(formData.get("success_basis"), MAX.short) || null,
    signed_at: dateOrNull(formData.get("signed_at")), notes: text(formData.get("notes"), MAX.text) || null,
  }).select("id").single();
  if (error || !agreement) throw new Error("Não foi possível criar o contrato de honorários.");
  if (totalCents > 0) {
    const base = Math.floor(totalCents / installments);
    const remainder = totalCents - base * installments;
    const first = new Date(`${firstDue}T12:00:00`);
    const receivables = Array.from({ length: installments }, (_, index) => {
      const due = new Date(first);
      due.setMonth(first.getMonth() + index);
      return {
        org_id: orgId, workspace_key: "law_office", agreement_id: agreement.id, contact_id: contactId,
        case_id: optionalUuid(formData.get("case_id")), created_by: user.id,
        description: `${text(formData.get("title"), MAX.title)} — parcela ${index + 1}/${installments}`,
        category: feeType === "success" ? "success_fee" : feeType === "consultation" ? "consultation" : "office_fee",
        installment_number: index + 1, installment_total: installments,
        original_cents: base + (index === 0 ? remainder : 0), due_date: due.toISOString().slice(0, 10),
      };
    });
    const { error: receivableError } = await supabase.from("receivables").insert(receivables);
    if (receivableError) {
      await supabase.from("fee_agreements").delete().eq("id", agreement.id).eq("org_id", orgId);
      throw new Error("Não foi possível gerar as parcelas.");
    }
  }
  revalidateLaw();
  redirect("/finance");
}

export async function recordReceivablePayment(formData: FormData) {
  const { supabase, user, orgId, jobRole, isAdmin } = await requireLawOffice();
  if (!canViewFinance(jobRole, isAdmin)) throw new Error("Seu cargo não pode registrar pagamentos.");
  const receivableId = requiredText(formData.get("receivable_id"), "Conta", 80);
  const { data: receivable } = await supabase.from("receivables").select("id, original_cents, paid_cents, status").eq("id", receivableId).eq("org_id", orgId).maybeSingle();
  if (!receivable || receivable.status === "cancelled") throw new Error("Conta a receber não encontrada.");
  const amount = moneyToCents(formData.get("amount"));
  if (amount <= 0 || amount > receivable.original_cents - receivable.paid_cents) throw new Error("O valor deve ser maior que zero e não pode ultrapassar o saldo.");
  const method = text(formData.get("method"), 16);
  if (!["pix", "boleto", "card", "transfer", "cash", "other"].includes(method)) throw new Error("Forma de pagamento inválida.");
  const { error } = await supabase.from("receivable_payments").insert({
    receivable_id: receivableId, org_id: orgId, recorded_by: user.id, amount_cents: amount,
    paid_at: dateTimeOrNull(formData.get("paid_at")) ?? new Date().toISOString(), method,
    reference: text(formData.get("reference"), MAX.reference) || null, notes: text(formData.get("notes"), MAX.text) || null,
  });
  if (error) throw new Error("Não foi possível registrar o pagamento.");
  revalidateLaw();
}

export async function linkDatajudProcess(formData: FormData) {
  const { supabase, orgId, jobRole, isAdmin } = await requireLawOffice();
  if (!canManageLegal(jobRole, isAdmin)) throw new Error("Seu cargo não pode vincular processo.");
  const caseId = requiredText(formData.get("case_id"), "Caso", 80);
  const tribunalAlias = text(formData.get("datajud_tribunal_alias"), 16);
  if (!DATAJUD_TRIBUNAL_ALIASES.has(tribunalAlias)) throw new Error("Tribunal inválido.");
  const numero = normalizeProcessNumber(requiredText(formData.get("case_number"), "Número do processo", 40));
  if (numero.length !== 20) throw new Error("Número de processo inválido — o formato CNJ tem 20 dígitos.");

  const { error } = await supabase
    .from("legal_cases")
    .update({ case_number: numero, datajud_tribunal_alias: tribunalAlias })
    .eq("id", caseId)
    .eq("org_id", orgId);
  if (error) throw new Error("Não foi possível vincular o processo.");
  revalidatePath(`/law/${caseId}`);
}

export async function syncDatajudProcessNow(formData: FormData) {
  const { supabase, orgId, jobRole, isAdmin } = await requireLawOffice();
  if (!canManageLegal(jobRole, isAdmin)) throw new Error("Seu cargo não pode sincronizar processo.");
  const caseId = requiredText(formData.get("case_id"), "Caso", 80);
  const { data: legalCase } = await supabase
    .from("legal_cases")
    .select("id, org_id, title, case_number, datajud_tribunal_alias, responsible_id, created_by")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!legalCase) throw new Error("Caso não encontrado.");
  const result = await syncCaseWithDatajud(supabase, legalCase);
  if (result.error) throw new Error(result.error);
  revalidatePath(`/law/${caseId}`);
}

function revalidateLaw() {
  revalidatePath("/law");
  revalidatePath("/law/deadlines");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/contacts");
}
