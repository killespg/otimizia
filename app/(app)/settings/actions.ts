"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-constants";
import { logError } from "@/lib/logger";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cleanWorkspaceLabel, parseWorkspacePreferences } from "@/lib/workspace-preferences";
import { getWorkspaceKey, type WorkspaceKey } from "@/lib/workspaces";

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
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Use uma senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  const { error } = await supabase.auth.updateUser({ password });
  ensureOk(error, "Não deu para atualizar a senha.");
  revalidatePath("/settings");
}

export async function updateWorkspaceLabels(formData: FormData) {
  const { supabase, user } = await requireUser();
  const orgId = await getActiveOrgId(supabase, user.id);
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") {
    throw new Error("Apenas admins podem personalizar o workspace.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("profession_type, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user.user_metadata?.profession_type,
    profile?.is_admin
  );
  const requestedWorkspace = text(formData.get("workspace_key"), 80) as WorkspaceKey;
  if (requestedWorkspace !== workspaceKey) {
    throw new Error("Workspace invÃ¡lido.");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("workspace_preferences")
    .eq("id", orgId)
    .maybeSingle();

  const labels = {
    contacts: cleanWorkspaceLabel(formData.get("contacts_label")),
    pipeline: cleanWorkspaceLabel(formData.get("pipeline_label")),
    value: cleanWorkspaceLabel(formData.get("value_label")),
    followups: cleanWorkspaceLabel(formData.get("followups_label")),
    dealSingular: cleanWorkspaceLabel(formData.get("deal_singular_label")),
  };

  const nextPreferences = {
    ...parseWorkspacePreferences(org?.workspace_preferences),
    [workspaceKey]: {
      labels: Object.fromEntries(
        Object.entries(labels).filter(([, value]) => Boolean(value))
      ),
    },
  };

  const { error } = await supabase
    .from("organizations")
    .update({ workspace_preferences: nextPreferences })
    .eq("id", orgId);
  ensureOk(error, "NÃ£o deu para salvar a personalizaÃ§Ã£o.");

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/contacts");
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
}

export async function deleteAccount(formData: FormData) {
  const { supabase, user } = await requireUser();
  await verifyCurrentPassword(supabase, user, formData);
  const confirmation = text(formData.get("confirmation"), 20).toUpperCase();
  if (confirmation !== "EXCLUIR") {
    throw new Error('Digite "EXCLUIR" para confirmar.');
  }

  const admin = createAdminClient();
  const orgId = await getActiveOrgId(admin, user.id);
  const { count: memberCount } = await admin
    .from("organization_members")
    .select("user_id", { count: "exact", head: true })
    .eq("org_id", orgId);

  // Billing é da organização, não da pessoa. Se ainda houver outros membros
  // depois que essa conta sair (org de empresa), a assinatura continua
  // sendo deles — só mexe nela quando essa conta é a última na organização.
  if ((memberCount ?? 0) <= 1) {
    const { data: org } = await admin
      .from("organizations")
      .select("stripe_subscription_id")
      .eq("id", orgId)
      .maybeSingle();

    if (org?.stripe_subscription_id) {
      try {
        // Confere o status antes de cancelar: se a assinatura já está
        // cancelada ou não existe mais no Stripe, não há cobrança recorrente
        // para órfão — não bloqueia a exclusão da conta por isso.
        const subscription = await getStripe().subscriptions.retrieve(
          org.stripe_subscription_id
        );
        if (subscription.status !== "canceled") {
          await getStripe().subscriptions.cancel(org.stripe_subscription_id);
        }
      } catch (err) {
        const alreadyGone = err instanceof Stripe.errors.StripeError && err.code === "resource_missing";
        logError(
          alreadyGone
            ? "settings.delete-account.subscription-already-gone"
            : "settings.delete-account.cancel-subscription",
          err,
          { userId: user.id, orgId }
        );
        if (!alreadyGone) {
          // Não apaga a conta se não conseguirmos cancelar a assinatura:
          // apagar o usuário deixa a organização órfã (sem membros) e a
          // cobrança recorrente ficaria sem ninguém para cancelá-la depois.
          throw new Error(
            "Não foi possível cancelar sua assinatura agora. Tente novamente em instantes ou contate o suporte."
          );
        }
      }
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
  if (!user.email || !currentPassword) {
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
  logError("settings.action", error);
  throw new Error(fallback);
}
