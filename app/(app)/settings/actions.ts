"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function updateName(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = requiredText(formData.get("name"), "Nome", 120);

  const { error: authError } = await supabase.auth.updateUser({ data: { name } });
  ensureOk(authError, "Não deu para atualizar o nome.");

  const { error } = await supabase.from("profiles").update({ name }).eq("id", user.id);
  ensureOk(error, "Não deu para atualizar o nome.");

  revalidatePath("/", "layout");
  revalidatePath("/settings");
}

export async function updateEmail(formData: FormData) {
  const { supabase, user } = await requireUser();
  await verifyCurrentPassword(supabase, user, formData);
  const email = text(formData.get("email"), 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("E-mail inválido.");
  }

  const { error } = await supabase.auth.updateUser({ email });
  ensureOk(error, "Não deu para atualizar o e-mail.");
  revalidatePath("/settings");
}

export async function updatePassword(formData: FormData) {
  const { supabase, user } = await requireUser();
  await verifyCurrentPassword(supabase, user, formData);
  const password = text(formData.get("password"), 200);
  if (password.length < 6) {
    throw new Error("Use uma senha com pelo menos 6 caracteres.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  ensureOk(error, "Não deu para atualizar a senha.");
  revalidatePath("/settings");
}

export async function deleteAccount(formData: FormData) {
  const { supabase, user } = await requireUser();
  await verifyCurrentPassword(supabase, user, formData);
  const confirmation = text(formData.get("confirmation"), 20).toUpperCase();
  if (confirmation !== "EXCLUIR") {
    throw new Error('Digite "EXCLUIR" para confirmar.');
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(profile.stripe_subscription_id);
    } catch (err) {
      console.error("[deleteAccount] falha ao cancelar assinatura", err);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  ensureOk(error, "Não deu para excluir a conta.");
  redirect("/");
}

function text(v: FormDataEntryValue | null, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > max ? s.slice(0, max) : s;
}

function requiredText(v: FormDataEntryValue | null, label: string, max: number): string {
  const s = text(v, max);
  if (!s) throw new Error(`${label} obrigatório.`);
  return s;
}

async function verifyCurrentPassword(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  user: Awaited<ReturnType<typeof requireUser>>["user"],
  formData: FormData
) {
  const currentPassword = text(formData.get("current_password"), 200);
  if (!user.email || currentPassword.length < 6) {
    throw new Error("Confirme sua senha atual.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  ensureOk(error, "Senha atual incorreta.");
}

function ensureOk(error: unknown, fallback: string) {
  if (!error) return;
  console.error(error);
  throw new Error(fallback);
}
