"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { getUserPlanAccess } from "@/lib/plan-access";
import { getProfessionPreset, normalizeProfession, type FieldSpec } from "@/lib/professions";
import { createClient } from "@/lib/supabase/server";
import { DEAL_STAGES, type DealStage } from "@/lib/supabase/types";

const LIMIT = {
  name: 120,
  phone: 40,
  email: 160,
  company: 120,
  source: 120,
  notes: 1200,
  title: 160,
  interaction: 1200,
};

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  return { supabase, user, orgId };
}

async function requireActiveUser() {
  const { supabase, user, orgId } = await requireUser();
  const access = await getUserPlanAccess(supabase, user.id);
  if (!access.hasAccess) redirect("/upgrade");
  return { supabase, user, orgId };
}

async function requireUserWithPreset() {
  const { supabase, user, orgId } = await requireActiveUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("profession_type")
    .eq("id", user.id)
    .maybeSingle();
  const preset = getProfessionPreset(profile?.profession_type ?? user.user_metadata?.profession_type);
  return { supabase, user, orgId, preset };
}

export async function updateProfession(formData: FormData) {
  const { supabase, user, orgId } = await requireUser();
  const professionType = normalizeProfession(formData.get("profession_type"));

  // Quem só tem acesso pela assinatura de outra pessoa (member de uma
  // organização com mais de um admin/dono) fica travado numa única
  // profissão/workspace. Trocar de profissão exige plano próprio (admin da
  // sua organização, mesmo que seja uma org pessoal de 1 pessoa).
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") {
    const { data: current } = await supabase
      .from("profiles")
      .select("profession_type")
      .eq("id", user.id)
      .maybeSingle();
    if (current?.profession_type && current.profession_type !== professionType) {
      throw new Error(
        "Sua conta usa o plano da empresa e fica limitada a uma profissão. Para acessar outras, é preciso um plano próprio."
      );
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ profession_type: professionType })
    .eq("id", user.id);
  ensureOk(error, "Não deu para trocar o perfil.");

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/contacts");
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
  redirect(safeReturnPath(formData.get("return_to"), "/dashboard"));
}

// ---------- Contacts ----------
export async function createContact(formData: FormData) {
  const { supabase, user, orgId, preset } = await requireUserWithPreset();
  const { error } = await supabase.from("contacts").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: preset.key,
    name: requiredText(formData.get("name"), "Nome", LIMIT.name),
    phone: emptyToNull(formData.get("phone"), LIMIT.phone),
    email: emailOrNull(formData.get("email")),
    company: emptyToNull(formData.get("company"), LIMIT.company),
    source: emptyToNull(formData.get("source"), LIMIT.source),
    notes: emptyToNull(formData.get("notes"), LIMIT.notes),
    details: collectDetails(formData, preset.contactFields),
  });
  ensureOk(error, "Não deu para salvar o contato.");
  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
  redirect(safeReturnPath(formData.get("return_to"), "/contacts"));
}

export async function updateContact(formData: FormData) {
  const { supabase, preset } = await requireUserWithPreset();
  const id = requiredText(formData.get("id"), "Contato", 80);
  const { data: existing } = await supabase
    .from("contacts")
    .select("details")
    .eq("id", id)
    .maybeSingle();
  const details = {
    ...(existing?.details ?? {}),
    ...collectDetails(formData, preset.contactFields),
  };
  const { error } = await supabase
    .from("contacts")
    .update({
      name: requiredText(formData.get("name"), "Nome", LIMIT.name),
      phone: emptyToNull(formData.get("phone"), LIMIT.phone),
      email: emailOrNull(formData.get("email")),
      company: emptyToNull(formData.get("company"), LIMIT.company),
      source: emptyToNull(formData.get("source"), LIMIT.source),
      notes: emptyToNull(formData.get("notes"), LIMIT.notes),
      details,
    })
    .eq("id", id);
  ensureOk(error, "Não deu para atualizar o contato.");
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
}

export async function deleteContact(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const id = requiredText(formData.get("id"), "Contato", 80);
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  ensureOk(error, "Não deu para excluir o contato.");
  revalidatePath("/contacts");
  redirect("/contacts");
}

// ---------- Interactions ----------
export async function createInteraction(formData: FormData) {
  const { supabase, user, orgId, preset } = await requireUserWithPreset();
  const contactId = await requireVisibleContactId(supabase, formData.get("contact_id"));
  const { error } = await supabase.from("interactions").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: preset.key,
    contact_id: contactId,
    body: requiredText(formData.get("body"), "Conversa", LIMIT.interaction),
  });
  ensureOk(error, "Não deu para salvar a conversa.");
  revalidatePath(`/contacts/${contactId}`);
}

// ---------- Deals ----------
export async function createDeal(formData: FormData) {
  const { supabase, user, orgId, preset } = await requireUserWithPreset();
  const contactId = await visibleContactIdOrNull(supabase, formData.get("contact_id"));
  const details = collectDetails(formData, preset.dealFields);
  const pipelineList = emptyToNull(formData.get("pipeline_list"), LIMIT.title);
  if (pipelineList) details.pipeline_list = pipelineList;
  const valueCents = moneyToCents(formData.get("value"));
  if (valueCents === null) details.value_unset = "true";
  const { error } = await supabase.from("deals").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: preset.key,
    contact_id: contactId,
    title: requiredText(formData.get("title"), "Venda", LIMIT.title),
    value_cents: valueCents ?? 0,
    stage: "novo",
    details,
  });
  ensureOk(error, "Não deu para salvar a venda.");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  redirect(safeReturnPath(formData.get("return_to"), "/pipeline"));
}

export async function createPipelineList(formData: FormData) {
  const { supabase, user, orgId, preset } = await requireUserWithPreset();
  const name = requiredText(formData.get("name"), "Lista", LIMIT.title);
  const { error } = await supabase.from("deals").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: preset.key,
    title: `[Lista] ${name}`,
    value_cents: 0,
    stage: "novo",
    details: {
      pipeline_list: name,
      pipeline_list_placeholder: "true",
      value_unset: "true",
    },
  });
  ensureOk(error, "NÃ£o deu para criar a lista.");
  revalidatePath("/pipeline");
}

export async function moveDealToList(id: string, listName: string) {
  const { supabase } = await requireActiveUser();
  const name = listName.trim().slice(0, LIMIT.title);
  if (!name) throw new Error("Lista invÃ¡lida.");

  const { data: existing, error: readError } = await supabase
    .from("deals")
    .select("details")
    .eq("id", id)
    .maybeSingle();
  ensureOk(readError, "NÃ£o deu para mover a venda.");
  if (!existing) throw new Error("Venda nÃ£o encontrada.");
  const stage = stageFromPipelineList(name);
  const closed = stage === "ganho" || stage === "perdido";

  const { error } = await supabase
    .from("deals")
    .update({
      stage,
      closed_at: closed ? new Date().toISOString() : null,
      details: {
        ...(existing.details ?? {}),
        pipeline_list: name,
      },
    })
    .eq("id", id);
  ensureOk(error, "NÃ£o deu para mover a venda.");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function moveDeal(id: string, stage: DealStage) {
  const { supabase } = await requireActiveUser();
  if (!isDealStage(stage)) throw new Error("Etapa de venda inválida.");

  const closed = stage === "ganho" || stage === "perdido";
  const { error } = await supabase
    .from("deals")
    .update({ stage, closed_at: closed ? new Date().toISOString() : null })
    .eq("id", id);
  ensureOk(error, "Não deu para mover a venda.");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function deleteDeal(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", requiredText(formData.get("id"), "Venda", 80));
  ensureOk(error, "Não deu para excluir a venda.");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

// ---------- Tasks ----------
export async function createTask(formData: FormData) {
  const { supabase, user, orgId, preset } = await requireUserWithPreset();
  const contactId = await visibleContactIdOrNull(supabase, formData.get("contact_id"));
  const assigneeId = await visibleMemberIdOrNull(supabase, orgId, formData.get("assignee_id"));
  const { error } = await supabase.from("tasks").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: preset.key,
    contact_id: contactId,
    assignee_id: assigneeId ?? user.id,
    title: requiredText(formData.get("title"), "Lembrete", LIMIT.title),
    due_at: dateTimeOrNull(formData.get("due_at")),
  });
  ensureOk(error, "Não deu para salvar o lembrete.");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  redirect(safeReturnPath(formData.get("return_to"), "/tasks"));
}

export async function toggleTask(id: string, done: boolean) {
  const { supabase } = await requireActiveUser();
  const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
  ensureOk(error, "Não deu para atualizar o lembrete.");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTask(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", requiredText(formData.get("id"), "Lembrete", 80));
  ensureOk(error, "Não deu para excluir o lembrete.");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

// ---------- Distribuição de tarefas ----------
// assignee_id/pending_assignee_id só mudam pelas funções RPC abaixo (security
// definer no banco) — nunca por UPDATE direto na tabela (ver 0014_org_rls.sql).
export async function requestTaskHandoff(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const taskId = requiredText(formData.get("task_id"), "Lembrete", 80);
  const targetUserId = requiredText(formData.get("target_user_id"), "Colega", 80);
  const { error } = await supabase.rpc("request_task_handoff", {
    p_task_id: taskId,
    p_target_user: targetUserId,
  });
  ensureOk(error, "Não deu para solicitar a transferência.");
  revalidatePath("/tasks");
}

export async function acceptTaskHandoff(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const taskId = requiredText(formData.get("task_id"), "Lembrete", 80);
  const { error } = await supabase.rpc("accept_task_handoff", { p_task_id: taskId });
  ensureOk(error, "Não deu para aceitar a transferência.");
  revalidatePath("/tasks");
}

export async function declineTaskHandoff(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const taskId = requiredText(formData.get("task_id"), "Lembrete", 80);
  const { error } = await supabase.rpc("decline_task_handoff", { p_task_id: taskId });
  ensureOk(error, "Não deu para recusar a transferência.");
  revalidatePath("/tasks");
}

export async function adminReassignTask(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const taskId = requiredText(formData.get("task_id"), "Lembrete", 80);
  const rawAssignee = formData.get("assignee_id");
  const assigneeId = typeof rawAssignee === "string" && rawAssignee ? rawAssignee : null;
  const { error } = await supabase.rpc("admin_reassign_task", {
    p_task_id: taskId,
    p_assignee_id: assigneeId,
  });
  ensureOk(error, "Não deu para reatribuir o lembrete.");
  revalidatePath("/tasks");
}

function text(v: FormDataEntryValue | null, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > max ? s.slice(0, max) : s;
}

function requiredText(
  v: FormDataEntryValue | null,
  label: string,
  max: number
): string {
  const s = text(v, max);
  if (!s) throw new Error(`${label} obrigatório.`);
  return s;
}

function emptyToNull(v: FormDataEntryValue | null, max: number): string | null {
  const s = text(v, max);
  return s === "" ? null : s;
}

function emailOrNull(v: FormDataEntryValue | null): string | null {
  const email = emptyToNull(v, LIMIT.email)?.toLowerCase() ?? null;
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("E-mail inválido.");
  }
  return email;
}

function moneyToCents(v: FormDataEntryValue | null): number | null {
  const raw = text(v, 32).replace(/[R$\s]/g, "");
  if (!raw) return null;

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.round(value * 100), 999_999_999_99);
}

function dateTimeOrNull(v: FormDataEntryValue | null): string | null {
  const raw = text(v, 64);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function visibleContactIdOrNull(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  v: FormDataEntryValue | null
): Promise<string | null> {
  const id = emptyToNull(v, 80);
  if (!id) return null;
  const { data, error } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  ensureOk(error, "Contato inválido.");
  if (!data) throw new Error("Contato inválido.");
  return id;
}

async function requireVisibleContactId(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  v: FormDataEntryValue | null
): Promise<string> {
  const id = await visibleContactIdOrNull(supabase, v);
  if (!id) throw new Error("Contato obrigatório.");
  return id;
}

async function visibleMemberIdOrNull(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  orgId: string,
  v: FormDataEntryValue | null
): Promise<string | null> {
  const id = emptyToNull(v, 80);
  if (!id) return null;
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", id)
    .maybeSingle();
  ensureOk(error, "Responsável inválido.");
  if (!data) throw new Error("Responsável inválido.");
  return id;
}

function isDealStage(stage: string): stage is DealStage {
  return DEAL_STAGES.some((item) => item.key === stage);
}

function stageFromPipelineList(listName: string): DealStage {
  const normalized = listName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized.includes("perdido") || normalized.includes("perda") || normalized.includes("lost")) {
    return "perdido";
  }
  if (
    normalized.includes("fechado") ||
    normalized.includes("vendido") ||
    normalized.includes("vendas") ||
    normalized.includes("ganho") ||
    normalized.includes("won")
  ) {
    return "ganho";
  }
  if (
    normalized.includes("proposta") ||
    normalized.includes("negociacao") ||
    normalized.includes("visita")
  ) {
    return "negociacao";
  }
  if (normalized.includes("analise") || normalized.includes("contato") || normalized.includes("follow")) {
    return "em_contato";
  }
  return "novo";
}

function collectDetails(formData: FormData, fields: FieldSpec[]): Record<string, string> {
  const details: Record<string, string> = {};
  for (const field of fields) {
    const raw = text(formData.get(`details.${field.key}`), 200);
    if (!raw) continue;
    if (field.type === "select" && field.options && !field.options.includes(raw)) continue;
    details[field.key] = raw;
  }
  return details;
}

function ensureOk(error: unknown, fallback: string) {
  if (!error) return;
  console.error(error);
  throw new Error(fallback);
}

function safeReturnPath(v: FormDataEntryValue | null, fallback: string): string {
  const path = typeof v === "string" ? v.trim() : "";
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes("://")) return fallback;
  return path.slice(0, 160);
}
