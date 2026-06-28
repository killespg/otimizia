"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DealStage } from "@/lib/supabase/types";

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
  await supabase.from("contacts").insert({
    owner_id: user.id,
    name: String(formData.get("name")),
    phone: emptyToNull(formData.get("phone")),
    email: emptyToNull(formData.get("email")),
    company: emptyToNull(formData.get("company")),
    source: emptyToNull(formData.get("source")),
    notes: emptyToNull(formData.get("notes")),
  });
  revalidatePath("/contacts");
}

export async function updateContact(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id"));
  await supabase
    .from("contacts")
    .update({
      name: String(formData.get("name")),
      phone: emptyToNull(formData.get("phone")),
      email: emptyToNull(formData.get("email")),
      company: emptyToNull(formData.get("company")),
      source: emptyToNull(formData.get("source")),
      notes: emptyToNull(formData.get("notes")),
    })
    .eq("id", id)
    .eq("owner_id", user.id);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
}

export async function deleteContact(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id"));
  await supabase.from("contacts").delete().eq("id", id).eq("owner_id", user.id);
  revalidatePath("/contacts");
  redirect("/contacts");
}

// ---------- Interactions ----------
export async function createInteraction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const contactId = String(formData.get("contact_id"));
  await supabase.from("interactions").insert({
    owner_id: user.id,
    contact_id: contactId,
    body: String(formData.get("body")),
  });
  revalidatePath(`/contacts/${contactId}`);
}

// ---------- Deals ----------
export async function createDeal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const value = Number(formData.get("value") ?? 0);
  await supabase.from("deals").insert({
    owner_id: user.id,
    contact_id: emptyToNull(formData.get("contact_id")),
    title: String(formData.get("title")),
    value_cents: Math.round((isNaN(value) ? 0 : value) * 100),
    stage: "novo",
  });
  revalidatePath("/pipeline");
}

export async function moveDeal(id: string, stage: DealStage) {
  const { supabase, user } = await requireUser();
  const closed = stage === "ganho" || stage === "perdido";
  await supabase
    .from("deals")
    .update({ stage, closed_at: closed ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("owner_id", user.id);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function deleteDeal(formData: FormData) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("deals")
    .delete()
    .eq("id", String(formData.get("id")))
    .eq("owner_id", user.id);
  revalidatePath("/pipeline");
}

// ---------- Tasks ----------
export async function createTask(formData: FormData) {
  const { supabase, user } = await requireUser();
  const due = formData.get("due_at");
  await supabase.from("tasks").insert({
    owner_id: user.id,
    contact_id: emptyToNull(formData.get("contact_id")),
    title: String(formData.get("title")),
    due_at: due ? new Date(String(due)).toISOString() : null,
  });
  revalidatePath("/tasks");
}

export async function toggleTask(id: string, done: boolean) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("tasks")
    .update({ done })
    .eq("id", id)
    .eq("owner_id", user.id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTask(formData: FormData) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("tasks")
    .delete()
    .eq("id", String(formData.get("id")))
    .eq("owner_id", user.id);
  revalidatePath("/tasks");
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}
