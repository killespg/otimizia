"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import {
  buildAccountDeletionPlan,
  type OrganizationMembership,
} from "@/lib/account/account-deletion";
import { MIN_PASSWORD_LENGTH } from "@/lib/account/auth-constants";
import { logError } from "@/lib/utils/logger";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { getStripe } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cleanWorkspaceLabel, parseWorkspacePreferences } from "@/lib/workspace/workspace-preferences";
import { getWorkspaceKey, type WorkspaceKey } from "@/lib/workspace/workspaces";

async function requireUser() {
  const supabase = await createClient();
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
  revalidatePath("/painel/configuracoes");
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
  revalidatePath("/painel/configuracoes");
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
  revalidatePath("/painel/configuracoes");
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
    throw new Error("Workspace inválido.");
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
  ensureOk(error, "Não deu para salvar a personalização.");

  revalidatePath("/", "layout");
  revalidatePath("/painel/configuracoes");
  revalidatePath("/painel/contatos");
  revalidatePath("/painel/funil");
  revalidatePath("/painel/tarefas");
}

export async function deleteAccount(formData: FormData) {
  const { supabase, user } = await requireUser();
  await verifyCurrentPassword(supabase, user, formData);
  const confirmation = text(formData.get("confirmation"), 20).toUpperCase();
  if (confirmation !== "EXCLUIR") {
    throw new Error('Digite "EXCLUIR" para confirmar.');
  }

  const admin = createAdminClient();
  const { data: ownMemberships, error: ownMembershipsError } = await admin
    .from("organization_members")
    .select("org_id,user_id,role")
    .eq("user_id", user.id);
  ensureOk(ownMembershipsError, "Não deu para conferir suas empresas.");

  const organizationIds = (ownMemberships ?? []).map((membership) => membership.org_id);
  let allMemberships = (ownMemberships ?? []) as OrganizationMembership[];
  if (organizationIds.length > 0) {
    const { data, error } = await admin
      .from("organization_members")
      .select("org_id,user_id,role")
      .in("org_id", organizationIds);
    ensureOk(error, "Não deu para conferir os administradores das suas empresas.");
    allMemberships = (data ?? []) as OrganizationMembership[];
  }

  const deletionPlan = buildAccountDeletionPlan(user.id, allMemberships);
  if (deletionPlan.organizationsNeedingAdminTransfer.length > 0) {
    throw new Error(
      "Antes de excluir sua conta, torne outra pessoa administradora das empresas que ainda têm equipe.",
    );
  }

  const { data: soleOrganizations, error: organizationsError } =
    deletionPlan.soleMemberOrganizationIds.length > 0
      ? await admin
          .from("organizations")
          .select("id,stripe_subscription_id")
          .in("id", deletionPlan.soleMemberOrganizationIds)
      : { data: [], error: null };
  ensureOk(organizationsError, "Não deu para conferir as assinaturas das suas empresas.");

  // Primeiro valida todas as assinaturas. Nenhuma conta ou empresa é apagada
  // se o Stripe estiver indisponível ou devolver um erro inesperado.
  const subscriptionsToCancel: Array<{ orgId: string; subscriptionId: string }> = [];
  for (const organization of soleOrganizations ?? []) {
    if (!organization.stripe_subscription_id) continue;
    try {
      const subscription = await getStripe().subscriptions.retrieve(
        organization.stripe_subscription_id,
      );
      if (subscription.status !== "canceled") {
        subscriptionsToCancel.push({
          orgId: organization.id,
          subscriptionId: organization.stripe_subscription_id,
        });
      }
    } catch (err) {
      const alreadyGone =
        err instanceof Stripe.errors.StripeError && err.code === "resource_missing";
      logError(
        alreadyGone
          ? "settings.delete-account.subscription-already-gone"
          : "settings.delete-account.inspect-subscription",
        err,
        { userId: user.id, orgId: organization.id },
      );
      if (!alreadyGone) {
        throw new Error(
          "Não foi possível conferir sua assinatura agora. Tente novamente em instantes ou contate o suporte.",
        );
      }
    }
  }

  for (const subscription of subscriptionsToCancel) {
    try {
      await getStripe().subscriptions.cancel(subscription.subscriptionId);
    } catch (err) {
      const alreadyGone =
        err instanceof Stripe.errors.StripeError && err.code === "resource_missing";
      logError(
        alreadyGone
          ? "settings.delete-account.subscription-already-gone"
          : "settings.delete-account.cancel-subscription",
        err,
        { userId: user.id, orgId: subscription.orgId },
      );
      if (!alreadyGone) {
        throw new Error(
          "Não foi possível cancelar sua assinatura agora. Tente novamente em instantes ou contate o suporte.",
        );
      }
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  ensureOk(error, "Não deu para excluir a conta.");

  // A migration 0077 torna todas as dependências da organização cascata. A
  // limpeza deixa de ser best-effort: uma empresa vazia nunca passa
  // silenciosamente como exclusão concluída.
  if (deletionPlan.soleMemberOrganizationIds.length > 0) {
    const { error: orgDeleteError } = await admin
      .from("organizations")
      .delete()
      .in("id", deletionPlan.soleMemberOrganizationIds);
    if (orgDeleteError) {
      logError("settings.delete-account.orphan-org-cleanup", orgDeleteError, {
        userId: user.id,
        orgIds: deletionPlan.soleMemberOrganizationIds,
      });
      throw new Error(
        "Sua conta foi excluída, mas a limpeza final precisa do suporte. Nenhuma assinatura continuará ativa.",
      );
    }
  }

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
