"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { getUserPlanAccess } from "@/lib/plan-access";
import {
  getProfessionPreset,
  normalizeProfession,
  type FieldSpec,
  type ProfessionType,
} from "@/lib/professions";
import { createClient } from "@/lib/supabase/server";
import { DEAL_STAGES, type DealStage } from "@/lib/supabase/types";
import { getWorkspaceKey, isWorkspaceEnabled, normalizeWorkspaceKeys } from "@/lib/workspaces";

const LIMIT = {
  name: 120,
  phone: 40,
  email: 160,
  instagram: 60,
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
    .select("profession_type, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const preset = getProfessionPreset(workspaceKey);
  return { supabase, user, orgId, preset, workspaceKey };
}

export async function updateProfession(formData: FormData) {
  const { supabase, user, orgId } = await requireUser();
  const professionType = normalizeProfession(formData.get("profession_type"));
  const { data: profile } = await supabase
    .from("profiles")
    .select("profession_type, profession_types")
    .eq("id", user.id)
    .maybeSingle();

  // Quem só tem acesso pela assinatura de outra pessoa (member de uma
  // organização com admin/dona própria) fica travado numa única
  // profissão/workspace. Trocar de profissão exige plano próprio (ser admin
  // da sua organização, mesmo que seja uma org pessoal de 1 pessoa) — e,
  // mesmo sendo admin, só pode alternar entre as áreas já habilitadas em
  // profession_types (para adicionar novas, use updateProfessionTypes).
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") {
    if (profile?.profession_type && profile.profession_type !== professionType) {
      throw new Error(
        "Sua conta usa o plano da empresa e fica limitada a uma profissão. Para acessar outras, é preciso um plano próprio."
      );
    }
  } else if (!isWorkspaceEnabled(professionType, profile?.profession_types)) {
    throw new Error("Essa área não está habilitada na sua conta.");
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

export async function updateProfessionTypes(formData: FormData) {
  const { supabase, user, orgId } = await requireUser();

  // Ter mais de uma área de atuação é um recurso de quem paga o próprio
  // plano (admin da organização) — member fica com a área única do convite.
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") {
    throw new Error(
      "Sua conta usa o plano da empresa e fica limitada a uma profissão. Para gerenciar várias áreas, é preciso um plano próprio."
    );
  }

  const professionTypes = selectedProfessionTypes(formData);
  const requestedActive = normalizeProfession(formData.get("active_profession_type"));
  const professionType = professionTypes.includes(requestedActive)
    ? requestedActive
    : professionTypes[0];

  const { error } = await supabase
    .from("profiles")
    .update({
      profession_type: professionType,
      profession_types: professionTypes,
    })
    .eq("id", user.id);
  ensureOk(error, "Não deu para atualizar suas áreas.");

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/contacts");
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
  revalidatePath("/settings");
  redirect("/settings");
}

// ---------- Contacts ----------
export async function createContact(formData: FormData) {
  const { supabase, user, orgId, workspaceKey, preset } = await requireUserWithPreset();
  const { error } = await supabase.from("contacts").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: workspaceKey,
    name: requiredText(formData.get("name"), "Nome", LIMIT.name),
    phone: emptyToNull(formData.get("phone"), LIMIT.phone),
    email: emailOrNull(formData.get("email")),
    instagram: normalizeInstagram(formData.get("instagram")),
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
  const { supabase, orgId, workspaceKey, preset } = await requireUserWithPreset();
  const id = requiredText(formData.get("id"), "Contato", 80);
  const { data: existing } = await supabase
    .from("contacts")
    .select("details")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
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
      instagram: normalizeInstagram(formData.get("instagram")),
      company: emptyToNull(formData.get("company"), LIMIT.company),
      source: emptyToNull(formData.get("source"), LIMIT.source),
      notes: emptyToNull(formData.get("notes"), LIMIT.notes),
      details,
    })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para atualizar o contato.");
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
}

export async function deleteContact(formData: FormData) {
  const { supabase, orgId, workspaceKey } = await requireUserWithPreset();
  const id = requiredText(formData.get("id"), "Contato", 80);
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para excluir o contato.");
  revalidatePath("/contacts");
  redirect("/contacts");
}

// ---------- Interactions ----------
export async function createInteraction(formData: FormData) {
  const { supabase, user, orgId, workspaceKey } = await requireUserWithPreset();
  const contactId = await requireVisibleContactId(
    supabase,
    orgId,
    workspaceKey,
    formData.get("contact_id")
  );
  const { error } = await supabase.from("interactions").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: workspaceKey,
    contact_id: contactId,
    body: requiredText(formData.get("body"), "Conversa", LIMIT.interaction),
  });
  ensureOk(error, "Não deu para salvar a conversa.");
  revalidatePath(`/contacts/${contactId}`);
}

// ---------- Deals ----------
export async function createDeal(formData: FormData) {
  const { supabase, user, orgId, workspaceKey, preset } = await requireUserWithPreset();
  const contactId = await resolveOrCreateContactId(supabase, user.id, orgId, workspaceKey, formData);
  const details = collectDetails(formData, preset.dealFields);
  const pipelineList = emptyToNull(formData.get("pipeline_list"), LIMIT.title);
  if (pipelineList) details.pipeline_list = pipelineList;
  const valueCents = moneyToCents(formData.get("value"));
  if (valueCents === null) details.value_unset = "true";
  const { error } = await supabase.from("deals").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: workspaceKey,
    contact_id: contactId,
    title: requiredText(formData.get("title"), "Venda", LIMIT.title),
    value_cents: valueCents ?? 0,
    stage: "novo",
    details,
  });
  ensureOk(error, "Não deu para salvar a venda.");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/contacts");
  redirect(safeReturnPath(formData.get("return_to"), "/pipeline"));
}

export async function createPipelineList(formData: FormData) {
  const { supabase, user, orgId, workspaceKey } = await requireUserWithPreset();
  const name = requiredText(formData.get("name"), "Lista", LIMIT.title);
  const { error } = await supabase.from("deals").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: workspaceKey,
    title: `[Lista] ${name}`,
    value_cents: 0,
    stage: "novo",
    details: {
      pipeline_list: name,
      pipeline_list_placeholder: "true",
      value_unset: "true",
    },
  });
  ensureOk(error, "Não deu para criar a lista.");
  revalidatePath("/pipeline");
}

export async function moveDealToList(id: string, listName: string) {
  const { supabase, orgId, workspaceKey } = await requireActiveUserWithWorkspace();
  const name = listName.trim().slice(0, LIMIT.title);
  if (!name) throw new Error("Lista inválida.");

  const { data: existing, error: readError } = await supabase
    .from("deals")
    .select("details")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  ensureOk(readError, "Não deu para mover a venda.");
  if (!existing) throw new Error("Venda não encontrada.");
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
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para mover a venda.");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function moveDeal(id: string, stage: DealStage) {
  const { supabase, orgId, workspaceKey } = await requireActiveUserWithWorkspace();
  if (!isDealStage(stage)) throw new Error("Etapa de venda inválida.");

  const closed = stage === "ganho" || stage === "perdido";
  const { error } = await supabase
    .from("deals")
    .update({ stage, closed_at: closed ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para mover a venda.");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function deleteDeal(formData: FormData) {
  const { supabase, orgId, workspaceKey } = await requireActiveUserWithWorkspace();
  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", requiredText(formData.get("id"), "Venda", 80))
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para excluir a venda.");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

// ---------- Tasks ----------
export async function createTask(formData: FormData) {
  const { supabase, user, orgId, workspaceKey } = await requireUserWithPreset();
  const contactId = await resolveOrCreateContactId(supabase, user.id, orgId, workspaceKey, formData);
  const assigneeId = await visibleMemberIdOrNull(supabase, orgId, formData.get("assignee_id"));
  const { error } = await supabase.from("tasks").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: workspaceKey,
    assignee_id: assigneeId ?? user.id,
    contact_id: contactId,
    title: requiredText(formData.get("title"), "Lembrete", LIMIT.title),
    due_at: dateTimeOrNull(formData.get("due_at")),
  });
  ensureOk(error, "Não deu para salvar o lembrete.");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/contacts");
  redirect(safeReturnPath(formData.get("return_to"), "/tasks"));
}

export async function toggleTask(id: string, done: boolean) {
  const { supabase, orgId, workspaceKey } = await requireActiveUserWithWorkspace();
  const { error } = await supabase
    .from("tasks")
    .update({ done })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para atualizar o lembrete.");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTask(formData: FormData) {
  const { supabase, orgId, workspaceKey } = await requireActiveUserWithWorkspace();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", requiredText(formData.get("id"), "Lembrete", 80))
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para excluir o lembrete.");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

// ---------- Distribuição de tarefas ----------
// assignee_id/pending_assignee_id só mudam pelas funções RPC abaixo (security
// definer no banco) — nunca por UPDATE direto na tabela (ver 0020_org_rls.sql).
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

// Igual a requireUserWithPreset, mas sem precisar do preset completo — usado
// pelas ações que só mexem em deals/tasks já existentes (mover, excluir).
async function requireActiveUserWithWorkspace() {
  const { supabase, user, orgId, workspaceKey } = await requireUserWithPreset();
  return { supabase, user, orgId, workspaceKey };
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

function normalizeInstagram(v: FormDataEntryValue | null): string | null {
  let handle = text(v, 200);
  if (!handle) return null;
  handle = handle.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  handle = handle.replace(/^@/, "");
  handle = handle.split(/[/?]/)[0].trim();
  return handle ? handle.slice(0, LIMIT.instagram) : null;
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
  orgId: string,
  workspaceKey: string,
  v: FormDataEntryValue | null
): Promise<string | null> {
  const id = emptyToNull(v, 80);
  if (!id) return null;
  const { data, error } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  ensureOk(error, "Contato inválido.");
  if (!data) throw new Error("Contato inválido.");
  return id;
}

async function requireVisibleContactId(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  orgId: string,
  workspaceKey: string,
  v: FormDataEntryValue | null
): Promise<string> {
  const id = await visibleContactIdOrNull(supabase, orgId, workspaceKey, v);
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

// Permite criar o lembrete/negócio e o contato juntos, num só envio — evita
// ter que ir em /contacts, preencher o formulário completo e só depois
// voltar para o que estava fazendo.
async function resolveOrCreateContactId(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  orgId: string,
  workspaceKey: string,
  formData: FormData
): Promise<string | null> {
  const existingId = await visibleContactIdOrNull(
    supabase,
    orgId,
    workspaceKey,
    formData.get("contact_id")
  );
  if (existingId) return existingId;

  const newName = text(formData.get("new_contact_name"), LIMIT.name);
  if (!newName) return null;

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      owner_id: userId,
      org_id: orgId,
      workspace_key: workspaceKey,
      name: newName,
      phone: emptyToNull(formData.get("new_contact_phone"), LIMIT.phone),
      instagram: normalizeInstagram(formData.get("new_contact_instagram")),
    })
    .select("id")
    .single();
  ensureOk(error, "Não deu para criar o contato.");
  return data?.id ?? null;
}

function isDealStage(stage: string): stage is DealStage {
  return DEAL_STAGES.some((item) => item.key === stage);
}

function stageFromPipelineList(listName: string): DealStage {
  const normalized = listName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

function selectedProfessionTypes(formData: FormData): ProfessionType[] {
  return normalizeWorkspaceKeys(formData.getAll("profession_types"));
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
