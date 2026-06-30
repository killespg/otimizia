"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  return { supabase, user };
}

// ---------- Contacts ----------
export async function createContact(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("contacts").insert({
    owner_id: user.id,
    name: requiredText(formData.get("name"), "Nome", LIMIT.name),
    phone: emptyToNull(formData.get("phone"), LIMIT.phone),
    email: emailOrNull(formData.get("email")),
    company: emptyToNull(formData.get("company"), LIMIT.company),
    source: emptyToNull(formData.get("source"), LIMIT.source),
    notes: emptyToNull(formData.get("notes"), LIMIT.notes),
  });
  ensureOk(error, "Nao deu para salvar o contato.");
  revalidatePath("/contacts");
}

export async function updateContact(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = requiredText(formData.get("id"), "Contato", 80);
  const { error } = await supabase
    .from("contacts")
    .update({
      name: requiredText(formData.get("name"), "Nome", LIMIT.name),
      phone: emptyToNull(formData.get("phone"), LIMIT.phone),
      email: emailOrNull(formData.get("email")),
      company: emptyToNull(formData.get("company"), LIMIT.company),
      source: emptyToNull(formData.get("source"), LIMIT.source),
      notes: emptyToNull(formData.get("notes"), LIMIT.notes),
    })
    .eq("id", id)
    .eq("owner_id", user.id);
  ensureOk(error, "Nao deu para atualizar o contato.");
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
}

export async function deleteContact(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = requiredText(formData.get("id"), "Contato", 80);
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);
  ensureOk(error, "Nao deu para excluir o contato.");
  revalidatePath("/contacts");
  redirect("/contacts");
}

// ---------- Interactions ----------
export async function createInteraction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const contactId = requiredText(formData.get("contact_id"), "Contato", 80);
  const { error } = await supabase.from("interactions").insert({
    owner_id: user.id,
    contact_id: contactId,
    body: requiredText(formData.get("body"), "Conversa", LIMIT.interaction),
  });
  ensureOk(error, "Nao deu para salvar a conversa.");
  revalidatePath(`/contacts/${contactId}`);
}

// ---------- Deals ----------
export async function createDeal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("deals").insert({
    owner_id: user.id,
    contact_id: emptyToNull(formData.get("contact_id"), 80),
    title: requiredText(formData.get("title"), "Venda", LIMIT.title),
    value_cents: moneyToCents(formData.get("value")),
    stage: "novo",
  });
  ensureOk(error, "Nao deu para salvar a venda.");
  revalidatePath("/pipeline");
}

export async function moveDeal(id: string, stage: DealStage) {
  const { supabase, user } = await requireUser();
  if (!isDealStage(stage)) throw new Error("Etapa de venda invalida.");

  const closed = stage === "ganho" || stage === "perdido";
  const { error } = await supabase
    .from("deals")
    .update({ stage, closed_at: closed ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("owner_id", user.id);
  ensureOk(error, "Nao deu para mover a venda.");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function deleteDeal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", requiredText(formData.get("id"), "Venda", 80))
    .eq("owner_id", user.id);
  ensureOk(error, "Nao deu para excluir a venda.");
  revalidatePath("/pipeline");
}

// ---------- Tasks ----------
export async function createTask(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("tasks").insert({
    owner_id: user.id,
    contact_id: emptyToNull(formData.get("contact_id"), 80),
    title: requiredText(formData.get("title"), "Lembrete", LIMIT.title),
    due_at: dateTimeOrNull(formData.get("due_at")),
  });
  ensureOk(error, "Nao deu para salvar o lembrete.");
  revalidatePath("/tasks");
}

export async function toggleTask(id: string, done: boolean) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({ done })
    .eq("id", id)
    .eq("owner_id", user.id);
  ensureOk(error, "Nao deu para atualizar o lembrete.");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTask(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", requiredText(formData.get("id"), "Lembrete", 80))
    .eq("owner_id", user.id);
  ensureOk(error, "Nao deu para excluir o lembrete.");
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
  if (!s) throw new Error(`${label} obrigatorio.`);
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
    throw new Error("E-mail invalido.");
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

function isDealStage(stage: string): stage is DealStage {
  return DEAL_STAGES.some((item) => item.key === stage);
}

function ensureOk(error: unknown, fallback: string) {
  if (!error) return;
  console.error(error);
  throw new Error(fallback);
}
