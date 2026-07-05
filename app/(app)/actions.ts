"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserPlanAccess } from "@/lib/plan-access";
import { getProfessionPreset, normalizeProfession, type FieldSpec } from "@/lib/professions";
import { createClient } from "@/lib/supabase/server";
import { DEAL_STAGES, type DealStage } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";

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
  return { supabase, user };
}

async function requireActiveUser() {
  const { supabase, user } = await requireUser();
  const access = await getUserPlanAccess(supabase, user.id);
  if (!access.hasAccess) redirect("/upgrade");
  return { supabase, user };
}

async function requireUserWithPreset() {
  const { supabase, user } = await requireActiveUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("profession_type")
    .eq("id", user.id)
    .maybeSingle();
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type);
  const preset = getProfessionPreset(workspaceKey);
  return { supabase, user, preset, workspaceKey };
}

export async function updateProfession(formData: FormData) {
  const { supabase, user } = await requireUser();
  const professionType = normalizeProfession(formData.get("profession_type"));
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
  const { supabase, user, preset, workspaceKey } = await requireUserWithPreset();
  const { error } = await supabase.from("contacts").insert({
    owner_id: user.id,
    workspace_key: workspaceKey,
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
  const { supabase, user, preset, workspaceKey } = await requireUserWithPreset();
  const id = requiredText(formData.get("id"), "Contato", 80);
  const { data: existing } = await supabase
    .from("contacts")
    .select("details")
    .eq("id", id)
    .eq("owner_id", user.id)
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
      company: emptyToNull(formData.get("company"), LIMIT.company),
      source: emptyToNull(formData.get("source"), LIMIT.source),
      notes: emptyToNull(formData.get("notes"), LIMIT.notes),
      details,
    })
    .eq("id", id)
    .eq("owner_id", user.id)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para atualizar o contato.");
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
}

export async function deleteContact(formData: FormData) {
  const { supabase, user, workspaceKey } = await requireUserWithPreset();
  const id = requiredText(formData.get("id"), "Contato", 80);
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para excluir o contato.");
  revalidatePath("/contacts");
  redirect("/contacts");
}

// ---------- Interactions ----------
export async function createInteraction(formData: FormData) {
  const { supabase, user, workspaceKey } = await requireUserWithPreset();
  const contactId = await requireOwnedContactId(
    supabase,
    user.id,
    workspaceKey,
    formData.get("contact_id")
  );
  const { error } = await supabase.from("interactions").insert({
    owner_id: user.id,
    workspace_key: workspaceKey,
    contact_id: contactId,
    body: requiredText(formData.get("body"), "Conversa", LIMIT.interaction),
  });
  ensureOk(error, "Não deu para salvar a conversa.");
  revalidatePath(`/contacts/${contactId}`);
}

// ---------- Deals ----------
export async function createDeal(formData: FormData) {
  const { supabase, user, preset, workspaceKey } = await requireUserWithPreset();
  const contactId = await ownedContactIdOrNull(
    supabase,
    user.id,
    workspaceKey,
    formData.get("contact_id")
  );
  const { error } = await supabase.from("deals").insert({
    owner_id: user.id,
    workspace_key: workspaceKey,
    contact_id: contactId,
    title: requiredText(formData.get("title"), "Venda", LIMIT.title),
    value_cents: moneyToCents(formData.get("value")),
    stage: "novo",
    details: collectDetails(formData, preset.dealFields),
  });
  ensureOk(error, "Não deu para salvar a venda.");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  redirect(safeReturnPath(formData.get("return_to"), "/pipeline"));
}

export async function moveDeal(id: string, stage: DealStage) {
  const { supabase, user, workspaceKey } = await requireUserWithPreset();
  if (!isDealStage(stage)) throw new Error("Etapa de venda inválida.");

  const closed = stage === "ganho" || stage === "perdido";
  const { error } = await supabase
    .from("deals")
    .update({ stage, closed_at: closed ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("owner_id", user.id)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para mover a venda.");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function deleteDeal(formData: FormData) {
  const { supabase, user, workspaceKey } = await requireUserWithPreset();
  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", requiredText(formData.get("id"), "Venda", 80))
    .eq("owner_id", user.id)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para excluir a venda.");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

// ---------- Tasks ----------
export async function createTask(formData: FormData) {
  const { supabase, user, workspaceKey } = await requireUserWithPreset();
  const contactId = await ownedContactIdOrNull(
    supabase,
    user.id,
    workspaceKey,
    formData.get("contact_id")
  );
  const { error } = await supabase.from("tasks").insert({
    owner_id: user.id,
    workspace_key: workspaceKey,
    contact_id: contactId,
    title: requiredText(formData.get("title"), "Lembrete", LIMIT.title),
    due_at: dateTimeOrNull(formData.get("due_at")),
  });
  ensureOk(error, "Não deu para salvar o lembrete.");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  redirect(safeReturnPath(formData.get("return_to"), "/tasks"));
}

export async function toggleTask(id: string, done: boolean) {
  const { supabase, user, workspaceKey } = await requireUserWithPreset();
  const { error } = await supabase
    .from("tasks")
    .update({ done })
    .eq("id", id)
    .eq("owner_id", user.id)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para atualizar o lembrete.");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTask(formData: FormData) {
  const { supabase, user, workspaceKey } = await requireUserWithPreset();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", requiredText(formData.get("id"), "Lembrete", 80))
    .eq("owner_id", user.id)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para excluir o lembrete.");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
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

function moneyToCents(v: FormDataEntryValue | null): number {
  const raw = text(v, 32).replace(/[R$\s]/g, "");
  if (!raw) return 0;

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

async function ownedContactIdOrNull(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  workspaceKey: string,
  v: FormDataEntryValue | null
): Promise<string | null> {
  const id = emptyToNull(v, 80);
  if (!id) return null;
  const { data, error } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", id)
    .eq("owner_id", userId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  ensureOk(error, "Contato invÃ¡lido.");
  if (!data) throw new Error("Contato invÃ¡lido.");
  return id;
}

async function requireOwnedContactId(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  workspaceKey: string,
  v: FormDataEntryValue | null
): Promise<string> {
  const id = await ownedContactIdOrNull(supabase, userId, workspaceKey, v);
  if (!id) throw new Error("Contato obrigatÃ³rio.");
  return id;
}

function isDealStage(stage: string): stage is DealStage {
  return DEAL_STAGES.some((item) => item.key === stage);
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
