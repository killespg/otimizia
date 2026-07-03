"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = createClient();
  const email = emailField(formData.get("email"));
  const password = passwordField(formData.get("password"));

  if (!email || !password) {
    redirectWithError("/login", "Preencha e-mail e senha.");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirectWithError("/login", "Não foi possível entrar. Confira os dados.");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = createClient();
  const email = emailField(formData.get("email"));
  const password = passwordField(formData.get("password"));
  const name = textField(formData.get("name"), 120);

  if (!email || !password) {
    redirectWithError("/signup", "Preencha e-mail e senha.");
  }

  if (password.length < 6) {
    redirectWithError("/signup", "Use uma senha com pelo menos 6 caracteres.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) {
    redirectWithError("/signup", signupErrorMessage(error));
  }

  revalidatePath("/", "layout");
  if (!data.session) {
    redirectWithMessage(
      "/login",
      "Conta criada. Confirme seu e-mail antes de entrar."
    );
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

function textField(v: FormDataEntryValue | null, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > max ? s.slice(0, max) : s;
}

function emailField(v: FormDataEntryValue | null): string {
  const email = textField(v, 160).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function passwordField(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.slice(0, 200) : "";
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
function redirectWithMessage(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

function signupErrorMessage(error: { message?: string; status?: number; code?: string }) {
  if (error.status === 429 || error.code === "over_email_send_rate_limit") {
    return "Muitas tentativas de criar conta agora. Aguarde alguns minutos e tente de novo.";
  }

  const message = (error.message ?? "").toLowerCase();
  if (message.includes("already") || message.includes("registered")) {
    return "Esse e-mail já tem conta. Entre pelo login.";
  }

  return "Não foi possível criar a conta. Tente novamente em instantes.";
}
