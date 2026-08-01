import type { SupabaseClient } from "@supabase/supabase-js";
import { createDeletionCode, hashDeletionCode } from "@/lib/ai/deletion-confirmation";
import { cleanDashboardText, getDashboardPreferences, isDashboardAccent, isDashboardStyle, isDashboardWidgetKey, isMetricKey, mergeScopedPreferences } from "@/lib/workspace/dashboard-preferences";
import { getProfessionPreset } from "@/lib/people/professions";
import { cleanWorkspaceLabel, parseWorkspacePreferences } from "@/lib/workspace/workspace-preferences";
import type { ToolInput } from "./types";
import {
  detailsObject,
  emailOrNull,
  ensureOk,
  isStage,
  optionalStr,
  requireVisibleContactId,
  str,
  visibleContactIdOrNull,
} from "./validation";

export async function createContact(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  workspaceKey: string,
  input: ToolInput
) {
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      owner_id: userId,
      org_id: orgId,
      workspace_key: workspaceKey,
      name: str(input.nome, "nome", 120),
      phone: optionalStr(input.telefone, 40),
      email: emailOrNull(input.email),
      company: optionalStr(input.empresa, 120),
      source: optionalStr(input.origem, 120),
      notes: optionalStr(input.anotacoes, 1200),
      details: detailsObject(input.detalhes),
    })
    .select("id, name")
    .single();
  ensureOk(error);
  return JSON.stringify({ ok: true, contato: data });
}

export async function updateContact(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const id = str(input.contato_id, "contato_id");
  const patch: Record<string, string | null | Record<string, string>> = {};
  if (input.nome !== undefined) patch.name = str(input.nome, "nome", 120);
  if (input.telefone !== undefined) patch.phone = optionalStr(input.telefone, 40);
  if (input.email !== undefined) patch.email = emailOrNull(input.email);
  if (input.empresa !== undefined) patch.company = optionalStr(input.empresa, 120);
  if (input.origem !== undefined) patch.source = optionalStr(input.origem, 120);
  if (input.anotacoes !== undefined) patch.notes = optionalStr(input.anotacoes, 1200);
  if (input.detalhes !== undefined) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("details")
      .eq("id", id)
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .maybeSingle();
    patch.details = { ...(existing?.details ?? {}), ...detailsObject(input.detalhes) };
  }
  if (Object.keys(patch).length === 0) throw new Error("Nenhum campo para atualizar.");

  const { data, error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .select("id, name")
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Contato não encontrado.");
  return JSON.stringify({ ok: true, contato: data });
}

export async function logInteraction(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  workspaceKey: string,
  input: ToolInput
) {
  const contactId = await requireVisibleContactId(supabase, orgId, workspaceKey, input.contato_id);
  const { data, error } = await supabase
    .from("interactions")
    .insert({
      owner_id: userId,
      org_id: orgId,
      workspace_key: workspaceKey,
      contact_id: contactId,
      body: str(input.texto, "texto", 1200),
    })
    .select("id")
    .single();
  ensureOk(error);
  return JSON.stringify({ ok: true, interacao_id: data?.id });
}

export async function createDeal(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  workspaceKey: string,
  input: ToolInput
) {
  const valor = input.valor_reais;
  let cents = 0;
  if (valor !== undefined && valor !== null) {
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 0) throw new Error("valor_reais inválido.");
    cents = Math.min(Math.round(n * 100), 999_999_999_99);
  }

  const contactId = await visibleContactIdOrNull(supabase, orgId, workspaceKey, input.contato_id);

  const { data, error } = await supabase
    .from("deals")
    .insert({
      owner_id: userId,
      org_id: orgId,
      workspace_key: workspaceKey,
      contact_id: contactId,
      title: str(input.titulo, "titulo", 160),
      value_cents: cents,
      stage: "novo",
      details: detailsObject(input.detalhes),
    })
    .select("id, title, value_cents, stage")
    .single();
  ensureOk(error);
  return JSON.stringify({ ok: true, venda: data });
}

export async function moveDeal(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const id = str(input.venda_id, "venda_id");
  const etapa = str(input.etapa, "etapa", 40);
  if (!isStage(etapa)) throw new Error(`Etapa inválida: ${etapa}`);

  const closed = etapa === "ganho" || etapa === "perdido";
  const { data, error } = await supabase
    .from("deals")
    .update({ stage: etapa, closed_at: closed ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .select("id, title, stage")
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Venda não encontrada.");
  return JSON.stringify({ ok: true, venda: data });
}

export async function createTask(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  workspaceKey: string,
  input: ToolInput
) {
  let dueAt: string | null = null;
  const vencimento = optionalStr(input.vencimento, 64);
  if (vencimento) {
    const date = new Date(vencimento);
    if (Number.isNaN(date.getTime())) throw new Error("vencimento inválido (use ISO 8601).");
    dueAt = date.toISOString();
  }

  const contactId = await visibleContactIdOrNull(supabase, orgId, workspaceKey, input.contato_id);

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      owner_id: userId,
      org_id: orgId,
      workspace_key: workspaceKey,
      assignee_id: userId,
      contact_id: contactId,
      title: str(input.titulo, "titulo", 160),
      due_at: dueAt,
    })
    .select("id, title, due_at")
    .single();
  ensureOk(error);
  return JSON.stringify({ ok: true, lembrete: data });
}

export async function toggleTask(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const id = str(input.lembrete_id, "lembrete_id");
  if (typeof input.concluido !== "boolean") throw new Error("'concluido' deve ser true ou false.");

  const { data, error } = await supabase
    .from("tasks")
    .update({ done: input.concluido })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .select("id, title, done")
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Lembrete não encontrado.");
  return JSON.stringify({ ok: true, lembrete: data });
}

export async function updateDashboardPreferencesByAi(
  supabase: SupabaseClient,
  userId: string,
  workspaceKey: string,
  input: ToolInput
) {
  const preset = getProfessionPreset(workspaceKey as never);
  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("dashboard_preferences")
    .eq("id", userId)
    .maybeSingle();
  ensureOk(readError);

  const current = getDashboardPreferences(profile?.dashboard_preferences, preset, workspaceKey);
  const widgets = Array.isArray(input.widgets)
    ? input.widgets.filter(isDashboardWidgetKey)
    : current.widgets;
  const metrics = Array.isArray(input.metricas)
    ? input.metricas.filter(isMetricKey).slice(0, 8)
    : current.metrics;
  const rawLabels =
    input.nomes_metricas && typeof input.nomes_metricas === "object"
      ? (input.nomes_metricas as Record<string, unknown>)
      : {};

  const metricLabels = {
    ...current.metricLabels,
    ...Object.fromEntries(
      Object.entries(rawLabels)
        .filter(([key]) => isMetricKey(key))
        .map(([key, value]) => [key, cleanDashboardText(value, 42)])
        .filter(([, value]) => Boolean(value))
    ),
  };

  const dashboardPreferences = {
    ...current,
    style: isDashboardStyle(input.estilo) ? input.estilo : current.style,
    accent: isDashboardAccent(input.cor) ? input.cor : current.accent,
    widgets: widgets.length > 0 ? widgets : current.widgets,
    metrics: metrics.length > 0 ? metrics : current.metrics,
    metricLabels,
  };

  const { error } = await supabase
    .from("profiles")
    .update({
      dashboard_preferences: mergeScopedPreferences(
        profile?.dashboard_preferences,
        workspaceKey,
        dashboardPreferences
      ),
    })
    .eq("id", userId);
  ensureOk(error);
  return JSON.stringify({ ok: true, mensagem: "Painel personalizado.", dashboard: dashboardPreferences });
}

export async function updateWorkspaceLabelsByAi(
  supabase: SupabaseClient,
  orgId: string,
  workspaceKey: string,
  input: ToolInput
) {
  const { data: org, error: readError } = await supabase
    .from("organizations")
    .select("workspace_preferences")
    .eq("id", orgId)
    .maybeSingle();
  ensureOk(readError);

  const labels = {
    contacts: cleanWorkspaceLabel(input.contatos as FormDataEntryValue | null),
    pipeline: cleanWorkspaceLabel(input.quadro as FormDataEntryValue | null),
    dealSingular: cleanWorkspaceLabel(input.item_quadro as FormDataEntryValue | null),
    value: cleanWorkspaceLabel(input.valor as FormDataEntryValue | null),
    followups: cleanWorkspaceLabel(input.retornos as FormDataEntryValue | null),
  };
  const existing = parseWorkspacePreferences(org?.workspace_preferences);
  const existingRecord = existing as Record<string, { labels?: Record<string, string> }>;
  const currentLabels = existingRecord[workspaceKey]?.labels ?? {};
  const nextPreferences = {
    ...existing,
    [workspaceKey]: {
      labels: {
        ...currentLabels,
        ...Object.fromEntries(Object.entries(labels).filter(([, value]) => Boolean(value))),
      },
    },
  };

  const { error } = await supabase
    .from("organizations")
    .update({ workspace_preferences: nextPreferences })
    .eq("id", orgId);
  ensureOk(error);
  return JSON.stringify({
    ok: true,
    mensagem: "Nomes do CRM atualizados.",
    labels: (nextPreferences as Record<string, { labels?: Record<string, string> }>)[workspaceKey]?.labels,
  });
}

export async function updateOrganizationContextByAi(
  supabase: SupabaseClient,
  orgId: string,
  input: ToolInput
) {
  const patch: Record<string, string> = {};
  const map: Record<string, string> = {
    nome: "name",
    contexto: "business_context",
    prioridades: "business_priorities",
    tom: "ai_tone",
    instrucoes_ia: "ai_instructions",
    setor: "industry",
    regiao: "region",
    tamanho_equipe: "team_size",
    site: "website",
    observacoes: "extra_notes",
  };

  for (const [from, to] of Object.entries(map)) {
    const value = optionalStr(input[from], to === "name" ? 120 : 1200);
    if (value !== null) patch[to] = value;
  }
  if (Object.keys(patch).length === 0) throw new Error("Nada para atualizar.");

  const { error } = await supabase.from("organizations").update(patch).eq("id", orgId);
  ensureOk(error);
  return JSON.stringify({
    ok: true,
    mensagem: "Contexto da empresa atualizado.",
    campos: Object.keys(patch),
  });
}

export async function deleteRow(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  workspaceKey: string,
  table: "contacts" | "deals" | "tasks",
  id: string,
  message: string
) {
  const { data: confirmed, error: confirmationError } = await supabase.rpc(
    "consume_assistant_deletion_confirmation",
    {
      p_org_id: orgId,
      p_workspace_key: workspaceKey,
      p_entity_table: table,
      p_entity_id: id,
    },
  );
  ensureOk(confirmationError);

  if (confirmed !== true) {
    const code = createDeletionCode();
    const { error: requestError } = await supabase.rpc(
      "request_assistant_deletion_confirmation",
      {
        p_org_id: orgId,
        p_workspace_key: workspaceKey,
        p_entity_table: table,
        p_entity_id: id,
        p_code_hash: hashDeletionCode(code),
      },
    );
    ensureOk(requestError);
    throw new Error(
      `A exclusão ainda não foi autorizada. Peça ao usuário para digitar exatamente EXCLUIR ${code}. O código expira em 10 minutos.`,
    );
  }

  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey);
  ensureOk(error);
  if (!count) throw new Error("Registro não encontrado.");
  return JSON.stringify({ ok: true, mensagem: message });
}
