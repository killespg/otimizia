"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-constants";
import { isValidCPF, onlyDigits } from "@/lib/cpf";
import { normalizeProfession, type ProfessionType } from "@/lib/professions";
import { resolveOrigin } from "@/lib/request-origin";
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
  const professionTypes = professionTypeFields(formData);
  const professionType = professionTypes[0];
  const cpf = onlyDigits(textField(formData.get("cpf"), 14));
  const termsAccepted = formData.get("terms_accepted") === "on";
  const trialNoticeAccepted = formData.get("trial_notice_accepted") === "on";

  if (!email || !password) {
    redirectWithError("/signup", "Preencha e-mail e senha.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    redirectWithError(
      "/signup",
      `Use uma senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
    );
  }

  if (!isValidCPF(cpf)) {
    redirectWithError("/signup", "CPF inválido.");
  }

  if (!termsAccepted) {
    redirectWithError("/signup", "É necessário aceitar os termos para criar a conta.");
  }

  if (!trialNoticeAccepted) {
    redirectWithError(
      "/signup",
      "E necessario confirmar que o teste gratis dura 30 dias e que depois sera preciso pagar."
    );
  }

  const origin = resolveOrigin(headers());

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        profession_type: professionType,
        profession_types: professionTypes,
        cpf,
        terms_accepted: "true",
        trial_notice_accepted: "true",
      },
      emailRedirectTo: `${origin}/login`,
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

export async function requestPasswordReset(formData: FormData) {
  const supabase = createClient();
  const email = emailField(formData.get("email"));
  if (!email) {
    redirectWithError("/forgot-password", "Informe um e-mail válido.");
  }

  const origin = resolveOrigin(headers());

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  // Sempre mostra a mesma mensagem, exista ou não conta com esse e-mail —
  // evita revelar quais e-mails têm cadastro.
  redirectWithMessage(
    "/login",
    "Se esse e-mail tiver uma conta, enviamos um link para redefinir a senha."
  );
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

function professionTypeFields(formData: FormData): ProfessionType[] {
  const selected = formData
    .getAll("profession_types")
    .map((value) => normalizeProfession(value))
    .filter((value, index, arr) => arr.indexOf(value) === index);

  return selected.length > 0 ? selected : ["autonomous_seller"];
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
