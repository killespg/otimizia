"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isValidCPF, onlyDigits } from "@/lib/cpf";
import { normalizeProfession } from "@/lib/professions";
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
  const professionType = normalizeProfession(formData.get("profession_type"));
  const cpf = onlyDigits(textField(formData.get("cpf"), 14));
  const termsAccepted = formData.get("terms_accepted") === "on";

  if (!email || !password) {
    redirectWithError("/signup", "Preencha e-mail e senha.");
  }

  if (password.length < 6) {
    redirectWithError("/signup", "Use uma senha com pelo menos 6 caracteres.");
  }

  if (!isValidCPF(cpf)) {
    redirectWithError("/signup", "CPF inválido.");
  }

  if (!termsAccepted) {
    redirectWithError("/signup", "É necessário aceitar os termos para criar a conta.");
  }

  const headersList = headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        profession_type: professionType,
        cpf,
        terms_accepted: "true",
      },
      emailRedirectTo: `${protocol}://${host}/login`,
    },
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
  if (message.includes("cpf") || message.includes("profiles_cpf_unique")) {
    return "Esse CPF já está cadastrado.";
  }

  return "Não foi possível criar a conta. Tente novamente em instantes.";
}
