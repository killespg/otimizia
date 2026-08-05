"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { getUserPlanAccess } from "@/lib/billing/plan-access";
import { getProfessionPreset, normalizeProfession } from "@/lib/people/professions";
import { createClient } from "@/lib/supabase/server";
import { type DealStage } from "@/lib/supabase/types";
import { getWorkspaceKey, isWorkspaceEnabled } from "@/lib/workspace/workspaces";
import {
  LIMIT,
  advanceRecurrence,
  collectDetails,
  dateTimeOrNull,
  dealPhotoPaths,
  dealPhotos,
  emailOrNull,
  emptyToNull,
  ensureOk,
  imageExtension,
  isDealStage,
  moneyToCents,
  normalizeInstagram,
  normalizeLabels,
  percentOrNull,
  recurrenceOrNone,
  requiredText,
  safeReturnPath,
  selectedProfessionTypes,
  stageFromPipelineList,
  text,
  urlOrNull,
} from "@/lib/crm/form-values";

const DEAL_PHOTOS_BUCKET = "deal-photos";
const DEAL_PHOTO_MAX_BYTES = 6 * 1024 * 1024;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  return { supabase, user, orgId };
}

async function requireActiveUser() {
  const { supabase, user, orgId } = await requireUser();
  const access = await getUserPlanAccess(supabase, user.id);
  if (!access.hasAccess) redirect("/upgrade");
  return { supabase, user, orgId };
}

async function requireUserWithPreset() {
  const { supabase, user, orgId } = await requireActiveUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("profession_type, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const preset = getProfessionPreset(workspaceKey);
  return { supabase, user, orgId, preset, workspaceKey };
}

export async function updateProfession(formData: FormData) {
  const { supabase, user, orgId } = await requireUser();
  const professionType = normalizeProfession(formData.get("profession_type"));
  const { data: profile } = await supabase
    .from("profiles")
    .select("profession_type, profession_types")
    .eq("id", user.id)
    .maybeSingle();

  // Quem só tem acesso pela assinatura de outra pessoa (member de uma
  // organização com admin/dona própria) fica travado numa única
  // profissão/workspace. Trocar de profissão exige plano próprio (ser admin
  // da sua organização, mesmo que seja uma org pessoal de 1 pessoa) — e,
  // mesmo sendo admin, só pode alternar entre as áreas já habilitadas em
  // profession_types (para adicionar novas, use updateProfessionTypes).
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") {
    if (profile?.profession_type && profile.profession_type !== professionType) {
      throw new Error(
        "Sua conta usa o plano da empresa e fica limitada a uma profissão. Para acessar outras, é preciso um plano próprio."
      );
    }
  } else if (!isWorkspaceEnabled(professionType, profile?.profession_types)) {
    throw new Error("Essa área não está habilitada na sua conta.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ profession_type: professionType })
    .eq("id", user.id);
  ensureOk(error, "Não deu para trocar o perfil.");

  revalidatePath("/", "layout");
  revalidatePath("/painel");
  revalidatePath("/painel/contatos");
  revalidatePath("/painel/funil");
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario");
  redirect(safeReturnPath(formData.get("return_to"), "/painel"));
}

export async function updateProfessionTypes(formData: FormData) {
  const { supabase, user, orgId } = await requireUser();

  // Ter mais de uma área de atuação é um recurso de quem paga o próprio
  // plano (admin da organização) — member fica com a área única do convite.
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") {
    throw new Error(
      "Sua conta usa o plano da empresa e fica limitada a uma profissão. Para gerenciar várias áreas, é preciso um plano próprio."
    );
  }

  const professionTypes = selectedProfessionTypes(formData);
  const requestedActive = normalizeProfession(formData.get("active_profession_type"));
  const professionType = professionTypes.includes(requestedActive)
    ? requestedActive
    : professionTypes[0];

  const { error } = await supabase
    .from("profiles")
    .update({
      profession_type: professionType,
      profession_types: professionTypes,
    })
    .eq("id", user.id);
  ensureOk(error, "Não deu para atualizar suas áreas.");

  revalidatePath("/", "layout");
  revalidatePath("/painel");
  revalidatePath("/painel/contatos");
  revalidatePath("/painel/funil");
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario");
  revalidatePath("/painel/configuracoes");
  redirect("/painel/configuracoes");
}

// ---------- Contacts ----------
export async function createContact(formData: FormData) {
  const { supabase, user, orgId, workspaceKey, preset } = await requireUserWithPreset();
  const { error } = await supabase.from("contacts").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: workspaceKey,
    name: requiredText(formData.get("name"), "Nome", LIMIT.name),
    phone: emptyToNull(formData.get("phone"), LIMIT.phone),
    email: emailOrNull(formData.get("email")),
    instagram: normalizeInstagram(formData.get("instagram")),
    company: emptyToNull(formData.get("company"), LIMIT.company),
    source: emptyToNull(formData.get("source"), LIMIT.source),
    notes: emptyToNull(formData.get("notes"), LIMIT.notes),
    details: collectDetails(formData, preset.contactFields),
  });
  ensureOk(error, "Não deu para salvar o contato.");
  revalidatePath("/painel/contatos");
  revalidatePath("/painel");
  revalidatePath("/painel/funil");
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/contatos"));
}

const IMPORT_BATCH_LIMIT = 500;

export type ImportContactRow = {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  source?: string;
  notes?: string;
};

export async function importContacts(
  rows: ImportContactRow[]
): Promise<{ imported: number; skipped: number }> {
  const { supabase, user, orgId, workspaceKey } = await requireUserWithPreset();
  const limited = rows.slice(0, IMPORT_BATCH_LIMIT);

  const toInsert = limited
    .map((row) => ({
      owner_id: user.id,
      org_id: orgId,
      workspace_key: workspaceKey,
      name: (row.name ?? "").trim().slice(0, LIMIT.name),
      phone: row.phone?.trim().slice(0, LIMIT.phone) || null,
      email: row.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim()) ? row.email.trim().toLowerCase().slice(0, LIMIT.email) : null,
      company: row.company?.trim().slice(0, LIMIT.company) || null,
      source: row.source?.trim().slice(0, LIMIT.source) || "Importação CSV",
      notes: row.notes?.trim().slice(0, LIMIT.notes) || null,
      details: {},
    }))
    .filter((row) => row.name.length > 0);

  const skipped = limited.length - toInsert.length;
  if (toInsert.length === 0) return { imported: 0, skipped };

  const { error } = await supabase.from("contacts").insert(toInsert);
  ensureOk(error, "Não deu para importar os contatos.");

  revalidatePath("/painel/contatos");
  revalidatePath("/painel");
  return { imported: toInsert.length, skipped };
}

export async function updateContact(formData: FormData) {
  const { supabase, orgId, workspaceKey, preset } = await requireUserWithPreset();
  const id = requiredText(formData.get("id"), "Contato", 80);
  const { data: existing } = await supabase
    .from("contacts")
    .select("details, whatsapp_opt_out")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  const details = {
    ...(existing?.details ?? {}),
    ...collectDetails(formData, preset.contactFields),
  };
  // whatsapp_opt_out_at só muda quando o estado realmente vira (marcando ou
  // desmarcando) — resalvar o form sem tocar no checkbox não deve reescrever
  // a data em que o contato pediu pra sair.
  const whatsappOptOut = formData.get("whatsapp_opt_out") === "on";
  const optOutTimestamp =
    whatsappOptOut === (existing?.whatsapp_opt_out ?? false)
      ? undefined
      : whatsappOptOut
        ? new Date().toISOString()
        : null;
  const { error } = await supabase
    .from("contacts")
    .update({
      name: requiredText(formData.get("name"), "Nome", LIMIT.name),
      phone: emptyToNull(formData.get("phone"), LIMIT.phone),
      email: emailOrNull(formData.get("email")),
      instagram: normalizeInstagram(formData.get("instagram")),
      company: emptyToNull(formData.get("company"), LIMIT.company),
      source: emptyToNull(formData.get("source"), LIMIT.source),
      notes: emptyToNull(formData.get("notes"), LIMIT.notes),
      details,
      whatsapp_opt_out: whatsappOptOut,
      ...(optOutTimestamp !== undefined ? { whatsapp_opt_out_at: optOutTimestamp } : {}),
    })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para atualizar o contato.");
  revalidatePath("/painel/contatos");
  revalidatePath(`/painel/contatos/${id}`);
  revalidatePath("/painel");
  revalidatePath("/painel/funil");
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario");
}

export async function deleteContact(formData: FormData) {
  const { supabase, orgId, workspaceKey } = await requireUserWithPreset();
  const id = requiredText(formData.get("id"), "Contato", 80);
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para excluir o contato.");
  revalidatePath("/painel/contatos");
  redirect("/painel/contatos");
}

// ---------- Interactions ----------
export async function createInteraction(formData: FormData) {
  const { supabase, user, orgId, workspaceKey } = await requireUserWithPreset();
  const contactId = await requireVisibleContactId(
    supabase,
    orgId,
    workspaceKey,
    formData.get("contact_id")
  );
  const { error } = await supabase.from("interactions").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: workspaceKey,
    contact_id: contactId,
    body: requiredText(formData.get("body"), "Conversa", LIMIT.interaction),
  });
  ensureOk(error, "Não deu para salvar a conversa.");
  revalidatePath(`/painel/contatos/${contactId}`);
}

// ---------- Deals ----------
export async function createDeal(formData: FormData) {
  const { supabase, user, orgId, workspaceKey, preset } = await requireUserWithPreset();
  const contactId = await resolveOrCreateContactId(supabase, user.id, orgId, workspaceKey, formData);
  const details = collectDetails(formData, preset.dealFields);
  const pipelineList = emptyToNull(formData.get("pipeline_list"), LIMIT.title);
  if (pipelineList) details.pipeline_list = pipelineList;
  const labels = normalizeLabels(formData.get("labels"));
  if (labels) details.labels = labels;
  const externalUrl = urlOrNull(formData.get("external_url"));
  if (externalUrl) details.external_url = externalUrl;
  const commissionPercent = percentOrNull(formData.get("commission_percent"));
  if (commissionPercent !== null) details.commission_percent = String(commissionPercent);
  const valueCents = moneyToCents(formData.get("value"));
  if (valueCents === null) details.value_unset = "true";
  const assigneeId = await resolveAssigneeId(supabase, orgId, user.id, formData);
  const { error } = await supabase.from("deals").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: workspaceKey,
    contact_id: contactId,
    assignee_id: assigneeId,
    title: requiredText(formData.get("title"), "Venda", LIMIT.title),
    value_cents: valueCents ?? 0,
    stage: "novo",
    details,
  });
  ensureOk(error, "Não deu para salvar a venda.");
  revalidatePath("/painel/funil");
  revalidatePath("/painel");
  revalidatePath("/painel/contatos");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/funil"));
}

export async function createPipelineList(formData: FormData) {
  const { supabase, user, orgId, workspaceKey } = await requireUserWithPreset();
  const name = requiredText(formData.get("name"), "Lista", LIMIT.title);
  const { error } = await supabase.from("deals").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: workspaceKey,
    title: `[Lista] ${name}`,
    value_cents: 0,
    stage: "novo",
    details: {
      pipeline_list: name,
      pipeline_list_placeholder: "true",
      value_unset: "true",
    },
  });
  ensureOk(error, "Não deu para criar a lista.");
  revalidatePath("/painel/funil");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/funil"));
}

export async function moveDealToList(id: string, listName: string) {
  const { supabase, orgId, workspaceKey } = await requireActiveUserWithWorkspace();
  const name = listName.trim().slice(0, LIMIT.title);
  if (!name) throw new Error("Lista inválida.");

  const { data: existing, error: readError } = await supabase
    .from("deals")
    .select("details")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  ensureOk(readError, "Não deu para mover a venda.");
  if (!existing) throw new Error("Venda não encontrada.");
  const stage = stageFromPipelineList(name);
  const closed = stage === "ganho" || stage === "perdido";

  const { error } = await supabase
    .from("deals")
    .update({
      stage,
      closed_at: closed ? new Date().toISOString() : null,
      details: {
        ...(existing.details ?? {}),
        pipeline_list: name,
      },
    })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para mover a venda.");
  revalidatePath("/painel/funil");
  revalidatePath("/painel");
}

export async function moveDeal(id: string, stage: DealStage) {
  const { supabase, orgId, workspaceKey } = await requireActiveUserWithWorkspace();
  if (!isDealStage(stage)) throw new Error("Etapa de venda inválida.");

  const closed = stage === "ganho" || stage === "perdido";
  const { error } = await supabase
    .from("deals")
    .update({ stage, closed_at: closed ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para mover a venda.");
  revalidatePath("/painel/funil");
  revalidatePath("/painel");
}

export async function deleteDeal(formData: FormData) {
  const { supabase, orgId, workspaceKey } = await requireActiveUserWithWorkspace();
  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", requiredText(formData.get("id"), "Venda", 80))
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para excluir a venda.");
  revalidatePath("/painel/funil");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/funil"));
}

export async function updateDealOptions(formData: FormData) {
  const { supabase, orgId, workspaceKey } = await requireActiveUserWithWorkspace();
  const id = requiredText(formData.get("id"), "Venda", 80);
  const labels = normalizeLabels(formData.get("labels"));
  const externalUrl = urlOrNull(formData.get("external_url"));
  const commissionPercent = percentOrNull(formData.get("commission_percent"));
  const hasLossReason = formData.has("loss_reason");
  const lossReason = hasLossReason ? emptyToNull(formData.get("loss_reason"), LIMIT.source) : null;

  const { data: existing, error: readError } = await supabase
    .from("deals")
    .select("details")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  ensureOk(readError, "Não deu para atualizar as opções.");
  if (!existing) throw new Error("Venda não encontrada.");

  const { error } = await supabase
    .from("deals")
    .update({
      details: {
        ...(existing.details ?? {}),
        labels,
        external_url: externalUrl ?? "",
        commission_percent: commissionPercent === null ? "" : String(commissionPercent),
        ...(hasLossReason ? { loss_reason: lossReason ?? "" } : {}),
      },
    })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para atualizar as opções.");
  revalidatePath("/painel/funil");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/funil"));
}

export async function uploadDealPhoto(formData: FormData) {
  const { supabase, orgId, workspaceKey } = await requireActiveUserWithWorkspace();
  const id = requiredText(formData.get("id"), "Venda", 80);
  const file = formData.get("photo");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Escolha uma foto.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("O anexo precisa ser uma imagem.");
  }
  if (file.size > DEAL_PHOTO_MAX_BYTES) {
    throw new Error("A foto pode ter no máximo 6 MB.");
  }

  const { data: existing, error: readError } = await supabase
    .from("deals")
    .select("details")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  ensureOk(readError, "Não deu para anexar a foto.");
  if (!existing) throw new Error("Venda não encontrada.");

  const extension = imageExtension(file.type, file.name);
  const path = `${orgId}/${workspaceKey}/${id}/${randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const storage = await createStorageAdminClient();
  const { error: uploadError } = await storage.storage
    .from(DEAL_PHOTOS_BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });
  ensureOk(uploadError, "Não deu para enviar a foto.");

  const { data: publicUrl } = storage.storage.from(DEAL_PHOTOS_BUCKET).getPublicUrl(path);
  const photos = [...dealPhotos(existing.details), publicUrl.publicUrl].slice(-8);
  const photoPaths = [...dealPhotoPaths(existing.details), path].slice(-8);
  const { error } = await supabase
    .from("deals")
    .update({
      details: {
        ...(existing.details ?? {}),
        photo_urls: JSON.stringify(photos),
        photo_paths: JSON.stringify(photoPaths),
      },
    })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para salvar a foto no card.");
  revalidatePath("/painel/funil");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/funil"));
}

// ---------- Tasks ----------
export async function createTask(formData: FormData) {
  const { supabase, user, orgId, workspaceKey } = await requireUserWithPreset();
  const contactId = await resolveOrCreateContactId(supabase, user.id, orgId, workspaceKey, formData);
  const assigneeId = await resolveAssigneeId(supabase, orgId, user.id, formData);
  const { error } = await supabase.from("tasks").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: workspaceKey,
    assignee_id: assigneeId,
    reviewer_id: assigneeId && assigneeId !== user.id ? user.id : null,
    review_status: assigneeId && assigneeId !== user.id ? "in_progress" : "not_required",
    contact_id: contactId,
    title: requiredText(formData.get("title"), "Lembrete", LIMIT.title),
    due_at: dateTimeOrNull(formData.get("due_at")),
    recurrence: recurrenceOrNone(formData.get("recurrence")),
  });
  ensureOk(error, "Não deu para salvar o lembrete.");
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
  revalidatePath("/painel/contatos");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/tarefas"));
}

export async function toggleTask(id: string, done: boolean) {
  const { supabase, user, orgId, workspaceKey } = await requireActiveUserWithWorkspace();
  const { data: task } = await supabase
    .from("tasks")
    .select("reviewer_id,review_status,assignee_id,owner_id,contact_id,deal_id,title,due_at,recurrence,recurrence_spawned")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (done && task?.reviewer_id && task.assignee_id === user.id) {
    throw new Error("Entregue a tarefa para aprovação em vez de concluí-la diretamente.");
  }
  const { error } = await supabase
    .from("tasks")
    .update({ done })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para atualizar o lembrete.");

  // Concluir uma tarefa recorrente cria a próxima ocorrência. recurrence_spawned
  // evita duplicar a próxima tarefa se o usuário desmarcar e marcar de novo.
  if (done && task && task.recurrence !== "none" && !task.recurrence_spawned) {
    const nextDueAt = advanceRecurrence(task.due_at, task.recurrence as "daily" | "weekly" | "monthly");
    await supabase.from("tasks").insert({
      owner_id: task.owner_id,
      org_id: orgId,
      workspace_key: workspaceKey,
      assignee_id: task.assignee_id,
      contact_id: task.contact_id,
      deal_id: task.deal_id,
      title: task.title,
      due_at: nextDueAt,
      recurrence: task.recurrence,
    });
    await supabase.from("tasks").update({ recurrence_spawned: true }).eq("id", id);
  }

  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
}

export async function deleteTask(formData: FormData) {
  const { supabase, orgId, workspaceKey } = await requireActiveUserWithWorkspace();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", requiredText(formData.get("id"), "Lembrete", 80))
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error, "Não deu para excluir o lembrete.");
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/tarefas"));
}

export async function submitTaskForReview(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const taskId = requiredText(formData.get("task_id"), "Tarefa", 80);
  const { error } = await supabase.rpc("submit_task_for_review", { p_task_id: taskId });
  ensureOk(error, "Não deu para enviar a tarefa para aprovação.");
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario"); revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/tarefas"));
}

export async function reviewTaskCompletion(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const taskId = requiredText(formData.get("task_id"), "Tarefa", 80);
  const decision = requiredText(formData.get("decision"), "Decisão", 20);
  const { error } = await supabase.rpc("review_task_completion", {
    p_task_id: taskId, p_approved: decision === "approve", p_note: text(formData.get("review_note"), 800) || null,
  });
  ensureOk(error, decision === "approve" ? "Não deu para aprovar a tarefa." : "Não deu para devolver a tarefa.");
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario"); revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/tarefas"));
}

// ---------- Distribuição de tarefas ----------
// assignee_id/pending_assignee_id só mudam pelas funções RPC abaixo (security
// definer no banco) — nunca por UPDATE direto na tabela (ver 0020_org_rls.sql).
export async function requestTaskHandoff(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const taskId = requiredText(formData.get("task_id"), "Lembrete", 80);
  const targetUserId = requiredText(formData.get("target_user_id"), "Colega", 80);
  const { error } = await supabase.rpc("request_task_handoff", {
    p_task_id: taskId,
    p_target_user: targetUserId,
  });
  ensureOk(error, "Não deu para solicitar a transferência.");
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/tarefas"));
}

export async function acceptTaskHandoff(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const taskId = requiredText(formData.get("task_id"), "Lembrete", 80);
  const { error } = await supabase.rpc("accept_task_handoff", { p_task_id: taskId });
  ensureOk(error, "Não deu para aceitar a transferência.");
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/tarefas"));
}

export async function declineTaskHandoff(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const taskId = requiredText(formData.get("task_id"), "Lembrete", 80);
  const { error } = await supabase.rpc("decline_task_handoff", { p_task_id: taskId });
  ensureOk(error, "Não deu para recusar a transferência.");
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/tarefas"));
}

export async function adminReassignTask(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const taskId = requiredText(formData.get("task_id"), "Lembrete", 80);
  const rawAssignee = formData.get("assignee_id");
  const assigneeId = typeof rawAssignee === "string" && rawAssignee ? rawAssignee : null;
  const { error } = await supabase.rpc("admin_reassign_task", {
    p_task_id: taskId,
    p_assignee_id: assigneeId,
  });
  ensureOk(error, "Não deu para reatribuir o lembrete.");
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/tarefas"));
}

// ---------- Distribuição de negócios/casos ----------
// Mesmo esquema das tarefas acima: assignee_id/pending_assignee_id só mudam
// pelas funções RPC (security definer no banco, ver 0031_deal_handoff.sql).
export async function requestDealHandoff(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const dealId = requiredText(formData.get("deal_id"), "Negócio", 80);
  const targetUserId = requiredText(formData.get("target_user_id"), "Colega", 80);
  const { error } = await supabase.rpc("request_deal_handoff", {
    p_deal_id: dealId,
    p_target_user: targetUserId,
  });
  ensureOk(error, "Não deu para solicitar a transferência.");
  revalidatePath("/painel/funil");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/funil"));
}

export async function acceptDealHandoff(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const dealId = requiredText(formData.get("deal_id"), "Negócio", 80);
  const { error } = await supabase.rpc("accept_deal_handoff", { p_deal_id: dealId });
  ensureOk(error, "Não deu para aceitar a transferência.");
  revalidatePath("/painel/funil");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/funil"));
}

export async function declineDealHandoff(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const dealId = requiredText(formData.get("deal_id"), "Negócio", 80);
  const { error } = await supabase.rpc("decline_deal_handoff", { p_deal_id: dealId });
  ensureOk(error, "Não deu para recusar a transferência.");
  revalidatePath("/painel/funil");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/funil"));
}

export async function adminReassignDeal(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const dealId = requiredText(formData.get("deal_id"), "Negócio", 80);
  const rawAssignee = formData.get("assignee_id");
  const assigneeId = typeof rawAssignee === "string" && rawAssignee ? rawAssignee : null;
  const { error } = await supabase.rpc("admin_reassign_deal", {
    p_deal_id: dealId,
    p_assignee_id: assigneeId,
  });
  ensureOk(error, "Não deu para reatribuir o negócio.");
  revalidatePath("/painel/funil");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/funil"));
}

// "Pegar" uma tarefa/negócio deixado em aberto — claim_task/claim_deal são
// atômicos (update ... where assignee_id is null), então só quem clicar
// primeiro consegue mesmo com dois cliques ao mesmo tempo.
export async function claimTask(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const taskId = requiredText(formData.get("task_id"), "Lembrete", 80);
  const { error } = await supabase.rpc("claim_task", { p_task_id: taskId });
  ensureOk(error, "Essa tarefa já foi pega por alguém.");
  revalidatePath("/painel/tarefas");
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/tarefas"));
}

export async function claimDeal(formData: FormData) {
  const { supabase } = await requireActiveUser();
  const dealId = requiredText(formData.get("deal_id"), "Negócio", 80);
  const { error } = await supabase.rpc("claim_deal", { p_deal_id: dealId });
  ensureOk(error, "Esse negócio já foi pego por alguém.");
  revalidatePath("/painel/funil");
  revalidatePath("/painel");
  redirect(safeReturnPath(formData.get("return_to"), "/painel/funil"));
}

// Igual a requireUserWithPreset, mas sem precisar do preset completo — usado
// pelas ações que só mexem em deals/tasks já existentes (mover, excluir).
async function requireActiveUserWithWorkspace() {
  const { supabase, user, orgId, workspaceKey } = await requireUserWithPreset();
  return { supabase, user, orgId, workspaceKey };
}

async function createStorageAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Storage não configurado.");
  }
  const admin = createSupabaseAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.storage.createBucket(DEAL_PHOTOS_BUCKET, {
    public: true,
    fileSizeLimit: DEAL_PHOTO_MAX_BYTES,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });
  if (error && !/already exists|already_exist|Duplicate/i.test(error.message)) {
    ensureOk(error, "Não deu para preparar o armazenamento de fotos.");
  }
  return admin;
}

async function visibleContactIdOrNull(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  orgId: string,
  workspaceKey: string,
  v: FormDataEntryValue | null
): Promise<string | null> {
  const id = emptyToNull(v, 80);
  if (!id) return null;
  const { data, error } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  ensureOk(error, "Contato inválido.");
  if (!data) throw new Error("Contato inválido.");
  return id;
}

async function requireVisibleContactId(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  orgId: string,
  workspaceKey: string,
  v: FormDataEntryValue | null
): Promise<string> {
  const id = await visibleContactIdOrNull(supabase, orgId, workspaceKey, v);
  if (!id) throw new Error("Contato obrigatório.");
  return id;
}

async function visibleMemberIdOrNull(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  orgId: string,
  v: FormDataEntryValue | null
): Promise<string | null> {
  const id = emptyToNull(v, 80);
  if (!id) return null;
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", id)
    .maybeSingle();
  ensureOk(error, "Responsável inválido.");
  if (!data) throw new Error("Responsável inválido.");
  return id;
}

// "Deixar em aberto" só funciona pra quem é admin da org de verdade — o
// checkbox no formulário é só conveniência de UI, a checagem de papel aqui é
// o que garante que ninguém força open_assignment via form adulterado.
async function resolveAssigneeId(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  orgId: string,
  userId: string,
  formData: FormData
): Promise<string | null> {
  const openAssignment = formData.get("open_assignment") === "on";
  if (openAssignment) {
    const role = await getOrgRole(supabase, orgId, userId);
    if (role === "admin") return null;
  }
  const assigneeId = await visibleMemberIdOrNull(supabase, orgId, formData.get("assignee_id"));
  return assigneeId ?? userId;
}

// Permite criar o lembrete/negócio e o contato juntos, num só envio — evita
// ter que ir em /contacts, preencher o formulário completo e só depois
// voltar para o que estava fazendo.
async function resolveOrCreateContactId(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  orgId: string,
  workspaceKey: string,
  formData: FormData
): Promise<string | null> {
  const existingId = await visibleContactIdOrNull(
    supabase,
    orgId,
    workspaceKey,
    formData.get("contact_id")
  );
  if (existingId) return existingId;

  const newName = text(formData.get("new_contact_name"), LIMIT.name);
  if (!newName) return null;

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      owner_id: userId,
      org_id: orgId,
      workspace_key: workspaceKey,
      name: newName,
      phone: emptyToNull(formData.get("new_contact_phone"), LIMIT.phone),
      instagram: normalizeInstagram(formData.get("new_contact_instagram")),
    })
    .select("id")
    .single();
  ensureOk(error, "Não deu para criar o contato.");
  return data?.id ?? null;
}

export async function dismissChecklist() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ checklist_dismissed_at: new Date().toISOString() })
    .eq("id", user.id);
  ensureOk(error, "Não deu para fechar o painel.");
  revalidatePath("/painel");
}

export async function dismissRealEstateV2Intro() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ real_estate_v2_intro_dismissed_at: new Date().toISOString() })
    .eq("id", user.id);
  ensureOk(error, "Não deu para fechar o painel.");
  revalidatePath("/painel");
}
