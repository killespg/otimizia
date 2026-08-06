import type { SupabaseClient } from "@supabase/supabase-js";
import { ALL_DASHBOARD_METRICS, DASHBOARD_WIDGETS, getDashboardPreferences } from "@/lib/workspace/dashboard-preferences";
import { getProfessionPreset } from "@/lib/people/professions";
import { parseWorkspacePreferences } from "@/lib/workspace/workspace-preferences";
import type { ToolInput } from "./types";
import { STAGE_KEYS, clampInt, ensureOk, isStage, optionalStr, str } from "./validation";

export async function listContacts(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const limit = clampInt(input.limite, 1, 50, 20);
  let query = supabase
    .from("contacts")
    .select("id, name, phone, email, company, source, details, created_at")
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .order("created_at", { ascending: false })
    .limit(limit);

  const busca = optionalStr(input.busca, 120);
  if (busca) {
    const q = busca.replace(/[,()%]/g, " ").trim();
    if (q) {
      query = query.or(
        `name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%,phone.ilike.%${q}%`
      );
    }
  }

  const { data, error } = await query;
  ensureOk(error);
  return JSON.stringify({ total: data?.length ?? 0, contatos: data ?? [] });
}

export async function getContact(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const id = str(input.contato_id, "contato_id");

  const { data: contact, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  ensureOk(error);
  if (!contact) return JSON.stringify({ erro: "Contato não encontrado." });

  const [deals, tasks, interactions] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, value_cents, stage, details, created_at, closed_at")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("tasks")
      .select("id, title, due_at, done, assignee_id")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("interactions")
      .select("id, body, created_at")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  ensureOk(deals.error);
  ensureOk(tasks.error);
  ensureOk(interactions.error);

  return JSON.stringify({
    contato: contact,
    vendas: deals.data ?? [],
    lembretes: tasks.data ?? [],
    ultimas_conversas: interactions.data ?? [],
  });
}

export async function listDeals(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  let query = supabase
    .from("deals")
    .select("id, title, value_cents, stage, contact_id, details, created_at, closed_at")
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .order("created_at", { ascending: false })
    .limit(50);

  const etapa = optionalStr(input.etapa, 40);
  if (etapa) {
    if (!isStage(etapa)) throw new Error(`Etapa inválida: ${etapa}`);
    query = query.eq("stage", etapa);
  }

  const { data, error } = await query;
  ensureOk(error);
  const deals = data ?? [];
  const totalCents = deals.reduce((sum, d) => sum + (d.value_cents ?? 0), 0);
  return JSON.stringify({
    total: deals.length,
    valor_total_centavos: totalCents,
    vendas: deals,
  });
}

export async function listTasks(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const filtro = optionalStr(input.filtro, 20) ?? "abertos";
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("tasks")
    .select("id, title, due_at, done, contact_id, assignee_id")
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(50);

  if (filtro === "concluidos") {
    query = query.eq("done", true);
  } else {
    query = query.eq("done", false);
    if (filtro === "atrasados") {
      query = query.not("due_at", "is", null).lt("due_at", nowIso);
    } else if (filtro === "hoje") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      query = query.gte("due_at", start.toISOString()).lt("due_at", end.toISOString());
    }
  }

  const { data, error } = await query;
  ensureOk(error);
  return JSON.stringify({ filtro, total: data?.length ?? 0, lembretes: data ?? [] });
}

export async function getBusinessSummary(supabase: SupabaseClient, orgId: string, workspaceKey: string) {
  const nowIso = new Date().toISOString();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [contacts, deals, openTasks] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey),
    supabase
      .from("deals")
      .select("stage, value_cents, closed_at")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey),
    supabase
      .from("tasks")
      .select("id, due_at")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .eq("done", false),
  ]);
  ensureOk(contacts.error);
  ensureOk(deals.error);
  ensureOk(openTasks.error);

  const byStage: Record<string, { quantidade: number; valor_centavos: number }> = {};
  for (const s of STAGE_KEYS) byStage[s] = { quantidade: 0, valor_centavos: 0 };
  let wonMonthCents = 0;
  for (const d of deals.data ?? []) {
    const bucket = byStage[d.stage];
    if (bucket) {
      bucket.quantidade += 1;
      bucket.valor_centavos += d.value_cents ?? 0;
    }
    if (d.stage === "ganho" && d.closed_at && d.closed_at >= monthStart.toISOString()) {
      wonMonthCents += d.value_cents ?? 0;
    }
  }

  const tasks = openTasks.data ?? [];
  const overdue = tasks.filter((t) => t.due_at && t.due_at < nowIso).length;

  return JSON.stringify({
    total_contatos: contacts.count ?? 0,
    funil_por_etapa: byStage,
    ganho_no_mes_centavos: wonMonthCents,
    lembretes_abertos: tasks.length,
    lembretes_atrasados: overdue,
  });
}

export async function getWorkspaceCustomization(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  workspaceKey: string
) {
  const preset = getProfessionPreset(workspaceKey as never);
  const [{ data: profile }, { data: org }] = await Promise.all([
    supabase
      .from("profiles")
      .select("dashboard_preferences")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("workspace_preferences, name, business_context, business_priorities, ai_tone, ai_instructions, industry, region, team_size, website, extra_notes")
      .eq("id", orgId)
      .maybeSingle(),
  ]);
  ensureOk(null);
  const preferences = getDashboardPreferences(profile?.dashboard_preferences, preset, workspaceKey);
  const workspacePreferences = parseWorkspacePreferences(org?.workspace_preferences);
  const workspaceRecord = workspacePreferences as Record<string, { labels?: unknown }>;
  return JSON.stringify({
    dashboard: preferences,
    metricas_disponiveis: ALL_DASHBOARD_METRICS,
    widgets_disponiveis: DASHBOARD_WIDGETS,
    labels_workspace: workspaceRecord[workspaceKey]?.labels ?? {},
    contexto_empresa: org ?? null,
  });
}
