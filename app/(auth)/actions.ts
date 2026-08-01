"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MIN_PASSWORD_LENGTH } from "@/lib/account/auth-constants";
import { isValidCPF, onlyDigits } from "@/lib/utils/cpf";
import { resolveDemoCredentials } from "@/lib/account/demo-account";
import { safeInternalPath } from "@/lib/crm/invitations";
import { normalizeProfession, type ProfessionType } from "@/lib/people/professions";
import { resolveOrigin } from "@/lib/utils/request-origin";
import { createClient } from "@/lib/supabase/server";
import { TURNSTILE_TOKEN_FIELD, clientIpFromHeaders, verifyTurnstile } from "@/lib/integrations/turnstile";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const nextPath = safeInternalPath(formData.get("next"));
  const loginPath =
    nextPath === "/painel" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`;
  const rawEmail = textField(formData.get("email"), 160).toLowerCase();
  const rawPassword = passwordField(formData.get("password"));
  const demoCredentials = resolveDemoCredentials(rawEmail, rawPassword);
  const email = demoCredentials?.email ?? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : "");
  const password = demoCredentials?.password ?? rawPassword;

  if (!email || !password) {
    redirectWithError(loginPath, "Preencha e-mail e senha.");
  }

  await requireTurnstile(formData, "/login");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirectWithError(loginPath, "Não foi possível entrar. Confira os dados.");
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const nextPath = safeInternalPath(formData.get("next"));
  const signupPath =
    nextPath === "/painel" ? "/signup" : `/signup?next=${encodeURIComponent(nextPath)}`;
  const email = emailField(formData.get("email"));
  const password = passwordField(formData.get("password"));
  const name = textField(formData.get("name"), 120);
  const professionTypes = professionTypeFields(formData);
  const professionType = professionTypes[0];
  const cpf = onlyDigits(textField(formData.get("cpf"), 14));
  const termsAccepted = formData.get("terms_accepted") === "on";
  const trialNoticeAccepted = formData.get("trial_notice_accepted") === "on";

  if (!email || !password) {
    redirectWithError(signupPath, "Preencha e-mail e senha.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    redirectWithError(
      signupPath,
      `Use uma senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
    );
  }

  if (!isValidCPF(cpf)) {
    redirectWithError(signupPath, "CPF inválido.");
  }

  if (!termsAccepted) {
    redirectWithError(signupPath, "É necessário aceitar os termos para criar a conta.");
  }

  if (!trialNoticeAccepted) {
    redirectWithError(
      signupPath,
      "É necessário confirmar que o teste grátis dura 30 dias e que depois será preciso pagar."
    );
  }

  await requireTurnstile(formData, "/signup");

  const origin = resolveOrigin(await headers());

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
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });
  if (error) {
    redirectWithError(signupPath, signupErrorMessage(error));
  }

  revalidatePath("/", "layout");
  if (!data.session) {
    redirectWithMessage(
      nextPath === "/painel" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`,
      "Conta criada. Confirme seu e-mail antes de entrar."
    );
  }

  redirect(nextPath);
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const email = emailField(formData.get("email"));
  if (!email) {
    redirectWithError("/forgot-password", "Informe um e-mail válido.");
  }

  await requireTurnstile(formData, "/forgot-password");

  const origin = resolveOrigin(await headers());

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  // Sempre mostra a mesma mensagem, exista ou não conta com esse e-mail —
  // evita revelar quais e-mails têm cadastro.
  redirectWithMessage(
    "/login",
    "Se esse e-mail tiver uma conta, enviamos um link para redefinir a senha."
  );
}

export async function logout() {
  const supabase = await createClient();
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

// Gate de CAPTCHA: valida o token do Turnstile no backend (siteverify) antes
// de deixar a action seguir. Se a verificação falhar, redireciona com erro e
// nunca chega no Supabase. Sem TURNSTILE_SECRET no ambiente, verifyTurnstile
// libera (ver lib/turnstile.ts) — então isso é inócuo até a proteção ser ligada.
async function requireTurnstile(formData: FormData, path: string): Promise<void> {
  const token = String(formData.get(TURNSTILE_TOKEN_FIELD) ?? "").slice(0, 4000);
  const outcome = await verifyTurnstile(token, clientIpFromHeaders(await headers()));
  if (!outcome.ok) {
    const message =
      outcome.reason === "siteverify_unreachable"
        ? "Não deu para verificar a segurança agora. Tente de novo em instantes."
        : "Falha na verificação de segurança. Recarregue a página e tente de novo.";
    redirectWithError(path, message);
  }
}

function professionTypeFields(formData: FormData): ProfessionType[] {
  const selected = formData
    .getAll("profession_types")
    .map((value) => normalizeProfession(value))
    .filter((value, index, arr) => arr.indexOf(value) === index);

  return selected.length > 0 ? selected : ["autonomous_seller"];
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}
function redirectWithMessage(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}message=${encodeURIComponent(message)}`);
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

