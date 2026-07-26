"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { getWorkspaceKey } from "@/lib/workspaces";
import { createClient } from "@/lib/supabase/server";

const TRIGGER_KINDS = ["deal_created", "deal_stage_changed", "deal_inactive"] as const;
const ACTION_TYPES = ["create_task", "send_email", "change_stage"] as const;
const DEAL_STAGE_KEYS = ["novo", "em_contato", "negociacao", "ganho", "perdido"];

async function requireOrgAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") throw new Error("Só administradores da organização gerenciam automações.");
  const { data: profile } = await supabase.from("profiles").select("profession_type, is_admin").eq("id", user.id).maybeSingle();
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type, profile?.is_admin ?? false);
  return { supabase, orgId, userId: user.id, workspaceKey };
}

// 3.2 (Fase 3): construtor de automações — cria uma linha em automation_rules
// a partir do formulário guiado. Não versiona nem faz aprovação (documentado
// como gap em docs/roadmap-imobiliario/3.2-construtor-automacoes.md).
export async function createAutomationRule(formData: FormData) {
  const { supabase, orgId, userId, workspaceKey } = await requireOrgAdmin();

  const name = String(formData.get("name") ?? "").trim().slice(0, 120) || "Regra sem nome";
  const triggerKind = String(formData.get("trigger_kind") ?? "");
  if (!TRIGGER_KINDS.includes(triggerKind as (typeof TRIGGER_KINDS)[number])) {
    throw new Error("Tipo de gatilho inválido.");
  }
  const actionType = String(formData.get("action_type") ?? "");
  if (!ACTION_TYPES.includes(actionType as (typeof ACTION_TYPES)[number])) {
    throw new Error("Tipo de ação inválido.");
  }
  const pipelineId = String(formData.get("pipeline_id") ?? "") || null;
  const stageKeyRaw = String(formData.get("stage_key") ?? "");
  const stageKey = DEAL_STAGE_KEYS.includes(stageKeyRaw) ? stageKeyRaw : null;

  const triggerParams: Record<string, unknown> = {};
  if (triggerKind === "deal_inactive") {
    const days = Math.max(1, Math.round(Number(formData.get("inactivity_days")) || 5));
    triggerParams.inactivity_days = days;
  }

  const actionParams: Record<string, unknown> = {};
  if (actionType === "create_task") {
    actionParams.title_template = String(formData.get("title_template") ?? "").trim().slice(0, 200) || "Retomar contato — {{deal.title}}";
  } else if (actionType === "send_email") {
    actionParams.subject_template = String(formData.get("subject_template") ?? "").trim().slice(0, 160) || "Sobre {{deal.title}}";
    actionParams.body_template = String(formData.get("body_template") ?? "").trim().slice(0, 2000) || "Passando para falar sobre {{deal.title}}.";
  } else if (actionType === "change_stage") {
    const toStage = String(formData.get("to_stage") ?? "");
    if (!DEAL_STAGE_KEYS.includes(toStage)) throw new Error("Escolha uma etapa de destino válida.");
    actionParams.to_stage = toStage;
  }

  const { error } = await supabase.from("automation_rules").insert({
    org_id: orgId,
    workspace_key: workspaceKey,
    name,
    trigger_kind: triggerKind,
    trigger_params: triggerParams,
    pipeline_id: pipelineId,
    stage_key: stageKey,
    action_type: actionType,
    action_params: actionParams,
    created_by: userId,
  });
  if (error) throw new Error("Não deu para criar a regra.");

  revalidatePath("/settings/automacoes");
}

export async function toggleAutomationRule(formData: FormData) {
  const { supabase, orgId } = await requireOrgAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "on";
  await supabase.from("automation_rules").update({ active }).eq("id", id).eq("org_id", orgId);
  revalidatePath("/settings/automacoes");
}

export async function deleteAutomationRule(formData: FormData) {
  const { supabase, orgId } = await requireOrgAdmin();
  const id = String(formData.get("id") ?? "");
  await supabase.from("automation_rules").delete().eq("id", id).eq("org_id", orgId);
  revalidatePath("/settings/automacoes");
}
