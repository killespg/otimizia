"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import {
  buildAccountDeletionPlan,
  type OrganizationMembership,
} from "@/lib/account/account-deletion";
import { MIN_PASSWORD_LENGTH } from "@/lib/account/auth-constants";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  PROFILE_PHOTOS_BUCKET,
} from "@/lib/account/avatar";
import { imageExtension } from "@/lib/crm/form-values";
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

/**
 * Troca a foto de perfil.
 *
 * O arquivo antigo é apagado depois que o novo já está gravado e o perfil já
 * aponta para ele: se a remoção falhar, o pior caso é um arquivo órfão de 4 MB,
 * e não um avatar quebrado em todas as telas. A ordem inversa deixaria a
 * pessoa sem foto se o upload falhasse no meio.
 */
export async function updateAvatar(formData: FormData) {
  const { supabase, user } = await requireUser();
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Escolha uma imagem.");
  }
  if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("A foto precisa ser JPG, PNG ou WebP.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("A foto pode ter no máximo 4 MB.");
  }

  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  const previousPath = typeof current?.avatar_path === "string" ? current.avatar_path : null;

  // Nome novo a cada troca: o caminho antigo pode estar em cache de navegador
  // e de CDN, e reaproveitá-lo faria a foto velha continuar aparecendo.
  const path = `${user.id}/${randomUUID()}.${imageExtension(file.type, file.name)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  ensureOk(uploadError, "Não deu para enviar a foto.");

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", user.id);
  if (error) {
    await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([path]);
    ensureOk(error, "Não deu para salvar a foto no seu perfil.");
  }

  if (previousPath && previousPath !== path) {
    await removeStoredAvatar(supabase, previousPath, user.id);
  }

  revalidatePath("/", "layout");
  revalidatePath("/painel/configuracoes");
}

export async function removeAvatar() {
  const { supabase, user } = await requireUser();

  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  const path = typeof current?.avatar_path === "string" ? current.avatar_path : null;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: null })
    .eq("id", user.id);
  ensureOk(error, "Não deu para remover a foto.");

  if (path) {
    await removeStoredAvatar(supabase, path, user.id);
  }

  revalidatePath("/", "layout");
  revalidatePath("/painel/configuracoes");
}

/**
 * Apaga o arquivo e registra se não conseguir.
 *
 * A falha não interrompe a ação — a pessoa já viu a foto trocar ou sumir, e
 * derrubar isso por causa da faxina seria pior. Mas engolir o erro em silêncio
 * escondeu um bug real: sem policy de SELECT no bucket, o Storage não achava a
 * linha e devolvia sucesso sem apagar nada, deixando arquivo órfão a cada
 * troca. Agora aparece no log.
 */
async function removeStoredAvatar(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  path: string,
  userId: string,
) {
  const { error } = await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([path]);
  if (error) logError("settings.avatar.remove-file", error, { userId });
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

  // Apagar o usuário derruba o perfil em cascata, mas não toca no Storage: a
  // foto de perfil sobreviveria à exclusão da conta, num bucket público. Some
  // a pasta inteira, e não só o `avatar_path` atual, para levar junto qualquer
  // arquivo que tenha ficado órfão em trocas anteriores. É best-effort de
  // propósito: falha aqui não pode impedir a exclusão que a pessoa pediu.
  try {
    const { data: files } = await admin.storage.from(PROFILE_PHOTOS_BUCKET).list(user.id);
    if (files && files.length > 0) {
      await admin.storage
        .from(PROFILE_PHOTOS_BUCKET)
        .remove(files.map((file) => `${user.id}/${file.name}`));
    }
  } catch (err) {
    logError("settings.delete-account.avatar-cleanup", err, { userId: user.id });
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
