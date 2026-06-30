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
    redirectWithError("/login", "Nao foi possivel entrar. Confira os dados.");
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

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) {
    redirectWithError("/signup", "Nao foi possivel criar a conta.");
  }

  revalidatePath("/", "layout");
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
