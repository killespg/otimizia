import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageLegal, canViewFinance, canViewLegal } from "@/lib/law/law-office";
import { getOrgRole } from "@/lib/workspace/org";
import { DATAJUD_TRIBUNAL_ALIASES } from "@/lib/law/datajud-tribunals";
import { DatajudApiError, normalizeProcessNumber, searchDatajudProcess } from "@/lib/law/datajud";
import { legalCaseHref } from "@/lib/law/legal-case-path";
import { syncCaseWithDatajud } from "@/lib/law/law-datajud-sync";
import { trackWatchedProcess } from "@/lib/law/law-watched-processes";
import type { JobRole } from "@/lib/supabase/types";
import type { ToolInput } from "./types";
import { clampInt, ensureOk, optionalStr, str } from "./validation";

const LEGAL_CASE_STATUSES = ["intake", "active", "waiting", "suspended", "closed", "archived"];
const DEADLINE_TYPES = ["procedural", "hearing", "internal", "client", "administrative"];
const DEADLINE_PRIORITIES = ["low", "normal", "high", "critical"];
const EVENT_TYPES = ["update", "filing", "decision", "hearing", "communication", "note"];
const DOCUMENT_TYPES = ["petition", "contract", "evidence", "decision", "power_of_attorney", "client_document", "other"];
const DOCUMENT_STATUSES = ["draft", "review", "approved", "filed", "archived"];
const RISK_LEVELS = ["low", "standard", "high", "critical"];
const CASE_MEMBER_ROLES = ["lead", "collaborator", "viewer"];
const MAX = { title: 180, text: 1600, short: 160 };

type LegalAccess = { jobRole: JobRole; isAdmin: boolean };

async function legalAccess(
  supabase: SupabaseClient,
  orgId: string,
  userId: string
): Promise<LegalAccess> {
  const [orgRole, { data: membership }] = await Promise.all([
    getOrgRole(supabase, orgId, userId),
    supabase
      .from("organization_members")
      .select("job_role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  return { isAdmin: orgRole === "admin", jobRole: (membership?.job_role as JobRole | undefined) ?? "staff" };
}

function requireViewLegal(access: LegalAccess) {
  if (!canViewLegal(access.jobRole, access.isAdmin)) {
    throw new Error("Seu cargo não acessa a área jurídica.");
  }
}

function requireManageLegal(access: LegalAccess) {
  if (!canManageLegal(access.jobRole, access.isAdmin)) {
    throw new Error("Seu cargo não pode alterar dados jurídicos.");
  }
}

function optionalEnum<T extends string>(v: unknown, allowed: readonly T[], label: string): T | undefined {
  const value = optionalStr(v, 40);
  if (!value) return undefined;
  if (!(allowed as readonly string[]).includes(value)) throw new Error(`${label} inválido: ${value}`);
  return value as T;
}

function dateTimeOrNull(v: unknown): string | null {
  const value = optionalStr(v, 40);
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Data/hora inválida (use ISO 8601).");
  return date.toISOString();
}

async function visibleLegalCaseIdOrNull(supabase: SupabaseClient, orgId: string, v: unknown): Promise<string | null> {
  const id = optionalStr(v, 80);
  if (!id) return null;
  const { data, error } = await supabase
    .from("legal_cases")
    .select("id")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Caso não encontrado.");
  return id;
}

async function requireVisibleLegalCaseId(supabase: SupabaseClient, orgId: string, v: unknown): Promise<string> {
  const id = await visibleLegalCaseIdOrNull(supabase, orgId, v);
  if (!id) throw new Error("Campo obrigatório: caso_id.");
  return id;
}

async function visibleLegalDeadlineIdOrNull(supabase: SupabaseClient, orgId: string, v: unknown): Promise<string | null> {
  const id = optionalStr(v, 80);
  if (!id) return null;
  const { data, error } = await supabase
    .from("legal_deadlines")
    .select("id")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Prazo não encontrado.");
  return id;
}

async function visibleLegalDocumentIdOrNull(supabase: SupabaseClient, orgId: string, v: unknown): Promise<string | null> {
  const id = optionalStr(v, 80);
  if (!id) return null;
  const { data, error } = await supabase
    .from("legal_documents")
    .select("id")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Documento não encontrado.");
  return id;
}

async function visibleOrgMemberIdOrNull(supabase: SupabaseClient, orgId: string, v: unknown): Promise<string | null> {
  const id = optionalStr(v, 80);
  if (!id) return null;
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", id)
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Esse integrante não pertence à organização.");
  return id;
}

async function userNames(supabase: SupabaseClient, ids: (string | null)[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  if (unique.length === 0) return {};
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", unique);
  ensureOk(error);
  return Object.fromEntries((data ?? []).map((p) => [p.id as string, (p.name as string | null) ?? "Sem nome"]));
}

function maskStoragePath(path: string | null): string | null {
  if (!path) return null;
  return path.split("/").at(-1) ?? path;
}

// ---------- Leitura ----------

export async function listLegalCases(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireViewLegal(access);

  const status = optionalEnum(input.status, LEGAL_CASE_STATUSES, "status");
  let query = supabase
    .from("legal_cases")
    .select("id, title, slug, case_number, area, status, risk_level, confidentiality, responsible_id, contact_id, next_deadline_at, opposing_party, court, jurisdiction, updated_at, created_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(clampInt(input.limite, 1, 50, 20));

  if (status) query = query.eq("status", status);
  const busca = optionalStr(input.busca, 120);
  if (busca) {
    const q = busca.replace(/[,()%]/g, " ").trim();
    if (q) {
      query = query.or(`title.ilike.%${q}%,case_number.ilike.%${q}%,opposing_party.ilike.%${q}%`);
    }
  }

  const { data, error } = await query;
  ensureOk(error);
  const rows = data ?? [];
  const names = await userNames(supabase, rows.map((r) => r.responsible_id as string | null));
  const casos = rows.map((r) => ({
    ...r,
    caminho: legalCaseHref(r.slug as string | undefined, r.id as string),
    responsavel: r.responsible_id ? (names[r.responsible_id as string] ?? null) : null,
  }));
  return JSON.stringify({ total: casos.length, casos });
}

export async function getLegalCase(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireViewLegal(access);
  const caseId = str(input.caso_id, "caso_id");

  const { data: legalCase, error } = await supabase
    .from("legal_cases")
    .select("*")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();
  ensureOk(error);
  if (!legalCase) return JSON.stringify({ erro: "Caso não encontrado." });

  const [contactRows, memberRows, deadlineRows, eventRows, documentRows, expenseRows, watchedRows, shareRows] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, name, phone, email, company")
      .eq("org_id", orgId)
      .eq("id", legalCase.contact_id)
      .maybeSingle(),
    supabase
      .from("legal_case_members")
      .select("user_id, role, created_at")
      .eq("case_id", caseId)
      .order("created_at"),
    supabase
      .from("legal_deadlines")
      .select("id, title, deadline_type, due_at, status, priority, assigned_to, completed_at, notes, client_visible")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("due_at"),
    supabase
      .from("legal_case_events")
      .select("id, event_type, title, description, occurred_at, client_visible")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("occurred_at", { ascending: false })
      .limit(50),
    supabase
      .from("legal_documents")
      .select("id, name, document_type, status, storage_path, external_url, generated_by_ai, version, notes, client_visible, updated_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("legal_expenses")
      .select("id, description, category, amount_cents, expense_date, reimbursable, reimbursed, notes")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("expense_date", { ascending: false })
      .limit(50),
    supabase
      .from("legal_watched_processes")
      .select("id, tribunal_alias, case_number, label, last_movement_nome, last_movement_at, last_synced_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId),
    supabase
      .from("legal_case_share_links")
      .select("id, label, created_at, revoked_at, expires_at, view_count")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
  ]);
  ensureOk(contactRows.error);
  ensureOk(memberRows.error);
  ensureOk(deadlineRows.error);
  ensureOk(eventRows.error);
  ensureOk(documentRows.error);
  ensureOk(expenseRows.error);
  ensureOk(watchedRows.error);
  ensureOk(shareRows.error);

  const memberIds = (memberRows.data ?? []).map((m) => m.user_id as string);
  const names = await userNames(supabase, [
    legalCase.responsible_id as string | null,
    legalCase.created_by as string | null,
    ...memberIds,
    ...(deadlineRows.data ?? []).map((d) => d.assigned_to as string | null),
  ]);

  const finance = canViewFinance(access.jobRole, access.isAdmin);

  return JSON.stringify({
    caso: legalCase,
    cliente: contactRows.data ?? null,
    responsavel: legalCase.responsible_id ? (names[legalCase.responsible_id as string] ?? null) : null,
    criado_por: legalCase.created_by ? (names[legalCase.created_by as string] ?? null) : null,
    equipe: (memberRows.data ?? []).map((m) => ({
      user_id: m.user_id,
      nome: names[m.user_id as string] ?? "Sem nome",
      papel: m.role,
      desde: m.created_at,
    })),
    prazos: (deadlineRows.data ?? []).map((d) => ({
      ...d,
      responsavel: d.assigned_to ? (names[d.assigned_to as string] ?? null) : null,
    })),
    movimentacoes: eventRows.data ?? [],
    documentos: (documentRows.data ?? []).map((d) => ({
      ...d,
      storage_path: maskStoragePath(d.storage_path as string | null),
    })),
    despesas: finance ? (expenseRows.data ?? []) : [],
    processos_acompanhados: watchedRows.data ?? [],
    links_compartilhamento: shareRows.data ?? [],
    financeiro_disponivel: finance,
  });
}

export async function listLegalDeadlines(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireViewLegal(access);

  const caseId = await visibleLegalCaseIdOrNull(supabase, orgId, input.caso_id);
  let query = supabase
    .from("legal_deadlines")
    .select("id, case_id, title, deadline_type, due_at, status, priority, assigned_to, notes, client_visible")
    .eq("org_id", orgId)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(clampInt(input.limite, 1, 100, 50));

  if (caseId) query = query.eq("case_id", caseId);
  const status = optionalEnum(input.status, ["pending", "completed", "cancelled"], "status");
  if (status) query = query.eq("status", status);
  const filtro = optionalStr(input.filtro, 20);
  if (filtro === "atrasados") {
    query = query.eq("status", "pending").not("due_at", "is", null).lt("due_at", new Date().toISOString());
  } else if (filtro === "proximos") {
    query = query.eq("status", "pending").gte("due_at", new Date().toISOString());
  }

  const { data, error } = await query;
  ensureOk(error);
  const rows = data ?? [];
  const names = await userNames(supabase, rows.map((r) => r.assigned_to as string | null));
  return JSON.stringify({
    total: rows.length,
    prazos: rows.map((r) => ({
      ...r,
      responsavel: r.assigned_to ? (names[r.assigned_to as string] ?? null) : null,
    })),
  });
}

export async function listLegalCaseEvents(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireViewLegal(access);
  const caseId = await requireVisibleLegalCaseId(supabase, orgId, input.caso_id);

  const { data, error } = await supabase
    .from("legal_case_events")
    .select("id, event_type, title, description, occurred_at, client_visible, created_at")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("occurred_at", { ascending: false })
    .limit(clampInt(input.limite, 1, 100, 50));
  ensureOk(error);
  return JSON.stringify({ total: data?.length ?? 0, movimentacoes: data ?? [] });
}

export async function listLegalDocuments(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireViewLegal(access);
  const caseId = await requireVisibleLegalCaseId(supabase, orgId, input.caso_id);

  const { data, error } = await supabase
    .from("legal_documents")
    .select("id, name, document_type, status, storage_path, external_url, generated_by_ai, version, notes, client_visible, updated_at")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(clampInt(input.limite, 1, 100, 50));
  ensureOk(error);
  return JSON.stringify({
    total: data?.length ?? 0,
    documentos: (data ?? []).map((d) => ({
      ...d,
      storage_path: maskStoragePath(d.storage_path as string | null),
    })),
  });
}

export async function listWatchedProcesses(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireViewLegal(access);

  let query = supabase
    .from("legal_watched_processes")
    .select("id, tribunal_alias, case_number, case_id, label, last_movement_nome, last_movement_at, last_synced_at, created_at")
    .eq("org_id", orgId)
    .order("last_movement_at", { ascending: false, nullsFirst: false })
    .limit(clampInt(input.limite, 1, 100, 30));

  const caseId = await visibleLegalCaseIdOrNull(supabase, orgId, input.caso_id);
  if (caseId) query = query.eq("case_id", caseId);

  const { data, error } = await query;
  ensureOk(error);
  return JSON.stringify({ total: data?.length ?? 0, processos_acompanhados: data ?? [] });
}

export async function searchDatajudProcessTool(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireViewLegal(access);

  const tribunalAlias = str(input.tribunal_alias, "tribunal_alias", 16).toLowerCase();
  if (!DATAJUD_TRIBUNAL_ALIASES.has(tribunalAlias)) throw new Error("Tribunal inválido.");
  const numeroRaw = str(input.numero_processo, "numero_processo", 60);
  const numero = normalizeProcessNumber(numeroRaw);
  if (numero.length !== 20) throw new Error("Número de processo inválido — o formato CNJ tem 20 dígitos.");

  try {
    const process = await searchDatajudProcess(tribunalAlias, numero);
    if (!process) return JSON.stringify({ erro: "Processo não encontrado nesse tribunal." });
    try {
      await trackWatchedProcess(supabase, orgId, userId, tribunalAlias, numero, process);
    } catch {
      // Rastreamento é extra — nunca derruba a busca em si.
    }
    return JSON.stringify({
      processo: {
        numero_processo: process.numeroProcesso,
        data_ajuizamento: process.dataAjuizamento,
        classe: process.classe,
        orgao_julgador: process.orgaoJulgador,
        total_movimentos: process.movimentos.length,
        ultimos_movimentos: process.movimentos.slice(-8).reverse(),
      },
      acompanhado: true,
    });
  } catch (error) {
    const message = error instanceof DatajudApiError ? error.message : "Falha ao consultar o DataJud.";
    throw new Error(message);
  }
}

export async function getLegalBusinessOverview(supabase: SupabaseClient, orgId: string, userId: string) {
  const access = await legalAccess(supabase, orgId, userId);
  requireViewLegal(access);

  const nowIso = new Date().toISOString();
  const finance = canViewFinance(access.jobRole, access.isAdmin);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [casesByStatus, openDeadlines, overdueDeadlines, watched, contacts, receivables, expenses] = await Promise.all([
    supabase.from("legal_cases").select("status").eq("org_id", orgId),
    supabase
      .from("legal_deadlines")
      .select("id")
      .eq("org_id", orgId)
      .eq("status", "pending"),
    supabase
      .from("legal_deadlines")
      .select("id")
      .eq("org_id", orgId)
      .eq("status", "pending")
      .not("due_at", "is", null)
      .lt("due_at", nowIso),
    supabase
      .from("legal_watched_processes")
      .select("id, case_id, label, last_movement_nome, last_movement_at, seen_at")
      .eq("org_id", orgId)
      .order("last_movement_at", { ascending: false })
      .limit(20),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("workspace_key", "law_office"),
    finance
      ? supabase.from("receivables").select("status, original_cents, paid_cents, due_date").eq("org_id", orgId).eq("workspace_key", "law_office").in("status", ["pending", "partial"])
      : Promise.resolve({ data: [], error: null }),
    finance
      ? supabase.from("legal_expenses").select("amount_cents, expense_date").eq("org_id", orgId).limit(200)
      : Promise.resolve({ data: [], error: null }),
  ]);
  ensureOk(casesByStatus.error);
  ensureOk(openDeadlines.error);
  ensureOk(overdueDeadlines.error);
  ensureOk(watched.error);
  ensureOk(contacts.error);
  ensureOk(receivables.error);
  ensureOk(expenses.error);

  const byStatus: Record<string, number> = {};
  for (const status of LEGAL_CASE_STATUSES) byStatus[status] = 0;
  for (const c of casesByStatus.data ?? []) {
    const key = c.status as string;
    if (key in byStatus) byStatus[key] += 1;
  }

  const recentChanges = (watched.data ?? []).filter(
    (p) => p.last_movement_at && (!p.seen_at || new Date(p.last_movement_at).getTime() > new Date(p.seen_at as string).getTime()),
  );

  let receivablesCents = 0;
  let receivablesCount = 0;
  let overdueReceivables = 0;
  for (const r of receivables.data ?? []) {
    receivablesCount++;
    receivablesCents += Math.max(0, (r.original_cents ?? 0) - (r.paid_cents ?? 0));
    if (r.due_date && `${r.due_date}T23:59:59` < nowIso) overdueReceivables++;
  }

  let monthExpensesCents = 0;
  for (const e of expenses.data ?? []) {
    const expenseMonth = String(e.expense_date ?? "").slice(0, 7);
    if (expenseMonth === currentMonth) monthExpensesCents += e.amount_cents ?? 0;
  }

  return JSON.stringify({
    casos_por_status: byStatus,
    total_casos: (casesByStatus.data ?? []).length,
    prazos_pendentes: openDeadlines.data?.length ?? 0,
    prazos_atrasados: overdueDeadlines.data?.length ?? 0,
    processos_acompanhados: watched.data?.length ?? 0,
    movimentacoes_recentes_nao_vistas: recentChanges.length,
    total_contatos: contacts.count ?? 0,
    financeiro: finance
      ? {
          contas_receber_abertas: receivablesCount,
          saldo_receber_centavos: receivablesCents,
          contas_receber_atrasadas: overdueReceivables,
          despesas_do_mes_centavos: monthExpensesCents,
        }
      : null,
  });
}

// ---------- Escrita ----------

export async function createLegalCase(supabase: SupabaseClient, userId: string, orgId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);

  const responsibleId = (await visibleOrgMemberIdOrNull(supabase, orgId, input.responsavel_id)) ?? userId;
  const status = optionalEnum(input.status, LEGAL_CASE_STATUSES, "status") ?? "intake";
  const risk = optionalEnum(input.risco, RISK_LEVELS, "risco") ?? "standard";
  const confidentiality = optionalEnum(input.confidencialidade, ["team", "restricted"] as const, "confidencialidade") ?? "restricted";

  const { data: legalCase, error } = await supabase
    .from("legal_cases")
    .insert({
      org_id: orgId,
      workspace_key: "law_office",
      created_by: userId,
      responsible_id: responsibleId,
      contact_id: await visibleContactIdOrNullForLegal(supabase, orgId, input.contato_id),
      title: str(input.titulo, "titulo", MAX.title),
      case_number: optionalStr(input.numero_processo, MAX.short),
      area: optionalStr(input.area, MAX.short),
      court: optionalStr(input.vara, MAX.short),
      jurisdiction: optionalStr(input.comarca, MAX.short),
      opposing_party: optionalStr(input.parte_contraria, MAX.short),
      status,
      risk_level: risk,
      confidentiality,
      summary: optionalStr(input.resumo, MAX.text),
    })
    .select("id, slug, title, status")
    .single();
  ensureOk(error);
  if (!legalCase) throw new Error("Não foi possível criar o caso.");

  await supabase.from("legal_case_members").upsert({
    case_id: legalCase.id,
    user_id: responsibleId,
    role: "lead",
  });
  return JSON.stringify({
    ok: true,
    caso: { ...legalCase, caminho: legalCaseHref(legalCase.slug, legalCase.id) },
    mensagem: "Caso criado.",
  });
}

export async function updateLegalCase(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);
  const caseId = await requireVisibleLegalCaseId(supabase, orgId, input.caso_id);

  const patch: Record<string, string | null> = {};
  const titulo = optionalStr(input.titulo, MAX.title);
  if (titulo !== undefined) patch.title = titulo;
  const status = optionalEnum(input.status, LEGAL_CASE_STATUSES, "status");
  if (status) patch.status = status;
  const risk = optionalEnum(input.risco, RISK_LEVELS, "risco");
  if (risk) patch.risk_level = risk;
  const confidentiality = optionalEnum(input.confidencialidade, ["team", "restricted"] as const, "confidencialidade");
  if (confidentiality) patch.confidentiality = confidentiality;
  for (const [key, value] of Object.entries({
    case_number: input.numero_processo,
    area: input.area,
    court: input.vara,
    jurisdiction: input.comarca,
    opposing_party: input.parte_contraria,
    summary: input.resumo,
  } as Record<string, unknown>)) {
    const parsed = optionalStr(value, key === "summary" ? MAX.text : MAX.short);
    if (parsed !== undefined) patch[key] = parsed;
  }
  if (Object.keys(patch).length === 0) throw new Error("Nenhum campo para atualizar.");

  const { data, error } = await supabase
    .from("legal_cases")
    .update(patch)
    .eq("id", caseId)
    .eq("org_id", orgId)
    .select("id, title, status, risk_level, confidentiality")
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Caso não encontrado.");
  return JSON.stringify({ ok: true, caso: data, mensagem: "Caso atualizado." });
}

export async function createLegalDeadline(supabase: SupabaseClient, userId: string, orgId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);
  const caseId = await requireVisibleLegalCaseId(supabase, orgId, input.caso_id);
  const dueAt = dateTimeOrNull(input.vencimento);
  if (!dueAt) throw new Error("Informe a data e hora do prazo (ISO 8601).");
  const assignedTo = (await visibleOrgMemberIdOrNull(supabase, orgId, input.responsavel_id)) ?? userId;

  const { data, error } = await supabase
    .from("legal_deadlines")
    .insert({
      org_id: orgId,
      case_id: caseId,
      created_by: userId,
      assigned_to: assignedTo,
      title: str(input.titulo, "titulo", MAX.title),
      due_at: dueAt,
      deadline_type: optionalEnum(input.tipo, DEADLINE_TYPES, "tipo") ?? "procedural",
      priority: optionalEnum(input.prioridade, DEADLINE_PRIORITIES, "prioridade") ?? "normal",
      notes: optionalStr(input.observacoes, MAX.text),
    })
    .select("id, title, due_at, deadline_type, priority, status")
    .single();
  ensureOk(error);
  if (!data) throw new Error("Não foi possível criar o prazo.");
  return JSON.stringify({ ok: true, prazo: data, mensagem: "Prazo criado." });
}

export async function updateLegalDeadline(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);
  const deadlineId = await visibleLegalDeadlineIdOrNull(supabase, orgId, input.prazo_id);
  if (!deadlineId) throw new Error("Prazo não encontrado.");

  const status = optionalEnum(input.status, ["pending", "completed", "cancelled"] as const, "status");
  const patch: Record<string, string | null | boolean> = {};
  if (status) {
    patch.status = status;
    patch.completed_at = status === "completed" ? new Date().toISOString() : null;
  }
  const titulo = optionalStr(input.titulo, MAX.title);
  if (titulo !== undefined) patch.title = titulo;
  const dueAt = dateTimeOrNull(input.vencimento);
  if (dueAt !== null) patch.due_at = dueAt;
  const type = optionalEnum(input.tipo, DEADLINE_TYPES, "tipo");
  if (type) patch.deadline_type = type;
  const priority = optionalEnum(input.prioridade, DEADLINE_PRIORITIES, "prioridade");
  if (priority) patch.priority = priority;
  const notes = optionalStr(input.observacoes, MAX.text);
  if (notes !== undefined) patch.notes = notes;
  const assignedTo = await visibleOrgMemberIdOrNull(supabase, orgId, input.responsavel_id);
  if (assignedTo) patch.assigned_to = assignedTo;

  if (Object.keys(patch).length === 0) throw new Error("Nenhum campo para atualizar.");

  const { data, error } = await supabase
    .from("legal_deadlines")
    .update(patch)
    .eq("id", deadlineId)
    .eq("org_id", orgId)
    .select("id, title, due_at, status, priority, deadline_type")
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Prazo não encontrado.");
  return JSON.stringify({ ok: true, prazo: data, mensagem: "Prazo atualizado." });
}

export async function createLegalEvent(supabase: SupabaseClient, userId: string, orgId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);
  const caseId = await requireVisibleLegalCaseId(supabase, orgId, input.caso_id);

  const { data, error } = await supabase
    .from("legal_case_events")
    .insert({
      org_id: orgId,
      case_id: caseId,
      created_by: userId,
      event_type: optionalEnum(input.tipo, EVENT_TYPES, "tipo") ?? "update",
      title: str(input.titulo, "titulo", MAX.title),
      description: optionalStr(input.descricao, MAX.text),
      occurred_at: dateTimeOrNull(input.data_hora) ?? new Date().toISOString(),
    })
    .select("id, event_type, title, occurred_at")
    .single();
  ensureOk(error);
  if (!data) throw new Error("Não foi possível registrar a movimentação.");
  return JSON.stringify({ ok: true, movimentacao: data, mensagem: "Movimentação registrada." });
}

export async function linkDatajudProcess(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);
  const caseId = await requireVisibleLegalCaseId(supabase, orgId, input.caso_id);
  const tribunalAlias = str(input.tribunal_alias, "tribunal_alias", 16).toLowerCase();
  if (!DATAJUD_TRIBUNAL_ALIASES.has(tribunalAlias)) throw new Error("Tribunal inválido.");
  const numero = normalizeProcessNumber(str(input.numero_processo, "numero_processo", 60));
  if (numero.length !== 20) throw new Error("Número de processo inválido — o formato CNJ tem 20 dígitos.");

  const { error } = await supabase
    .from("legal_cases")
    .update({ case_number: numero, datajud_tribunal_alias: tribunalAlias })
    .eq("id", caseId)
    .eq("org_id", orgId);
  ensureOk(error);
  return JSON.stringify({ ok: true, mensagem: "Processo vinculado ao caso." });
}

export async function syncDatajudProcess(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);
  const caseId = await requireVisibleLegalCaseId(supabase, orgId, input.caso_id);

  const { data: legalCase, error } = await supabase
    .from("legal_cases")
    .select("id, org_id, title, case_number, datajud_tribunal_alias, responsible_id, created_by, datajud_sync_failed_count")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();
  ensureOk(error);
  if (!legalCase) throw new Error("Caso não encontrado.");
  if (!legalCase.datajud_tribunal_alias || !legalCase.case_number) {
    throw new Error("Este caso ainda não tem processo do DataJud vinculado. Use link_datajud_process primeiro.");
  }

  const result = await syncCaseWithDatajud(supabase, legalCase);
  if (result.error) throw new Error(result.error);
  return JSON.stringify({
    ok: true,
    mensagem: "Sincronização com o DataJud concluída.",
    movimentacoes_novas: result.newEvents,
    prazos_de_revisao_criados: result.newDeadlines,
  });
}

export async function createLegalDocumentLink(supabase: SupabaseClient, userId: string, orgId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);
  const caseId = await requireVisibleLegalCaseId(supabase, orgId, input.caso_id);
  const url = str(input.link, "link", 1000);
  try {
    new URL(url);
  } catch {
    throw new Error("Informe um link válido.");
  }

  const { data, error } = await supabase
    .from("legal_documents")
    .insert({
      org_id: orgId,
      case_id: caseId,
      uploaded_by: userId,
      name: str(input.nome, "nome", MAX.title),
      external_url: url,
      document_type: optionalEnum(input.tipo_documento, DOCUMENT_TYPES, "tipo_documento") ?? "other",
      status: "draft",
      notes: optionalStr(input.observacoes, MAX.text),
    })
    .select("id, name, document_type, status")
    .single();
  ensureOk(error);
  if (!data) throw new Error("Não foi possível adicionar o documento.");
  return JSON.stringify({ ok: true, documento: data, mensagem: "Documento adicionado." });
}

export async function updateLegalDocument(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);
  const documentId = await visibleLegalDocumentIdOrNull(supabase, orgId, input.documento_id);
  if (!documentId) throw new Error("Documento não encontrado.");

  const patch: Record<string, string | null> = {};
  const name = optionalStr(input.nome, MAX.title);
  if (name !== undefined) patch.name = name;
  const type = optionalEnum(input.tipo_documento, DOCUMENT_TYPES, "tipo_documento");
  if (type) patch.document_type = type;
  const status = optionalEnum(input.status, DOCUMENT_STATUSES, "status");
  if (status) patch.status = status;
  const notes = optionalStr(input.observacoes, MAX.text);
  if (notes !== undefined) patch.notes = notes;
  if (Object.keys(patch).length === 0) throw new Error("Nenhum campo para atualizar.");

  const { data, error } = await supabase
    .from("legal_documents")
    .update(patch)
    .eq("id", documentId)
    .eq("org_id", orgId)
    .select("id, name, document_type, status")
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Documento não encontrado.");
  return JSON.stringify({ ok: true, documento: data, mensagem: "Documento atualizado." });
}

export async function addLegalCaseMember(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);
  const caseId = await requireVisibleLegalCaseId(supabase, orgId, input.caso_id);
  const memberId = await visibleOrgMemberIdOrNull(supabase, orgId, input.membro_id);
  if (!memberId) throw new Error("Escolha um integrante da organização.");

  const { error } = await supabase.from("legal_case_members").upsert({
    case_id: caseId,
    user_id: memberId,
    role: optionalEnum(input.papel, CASE_MEMBER_ROLES, "papel") ?? "collaborator",
  });
  ensureOk(error);
  return JSON.stringify({ ok: true, mensagem: "Integrante adicionado à equipe do caso." });
}

export async function removeLegalCaseMember(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);
  const caseId = await requireVisibleLegalCaseId(supabase, orgId, input.caso_id);
  const memberId = str(input.membro_id, "membro_id");

  const { error } = await supabase
    .from("legal_case_members")
    .delete()
    .eq("case_id", caseId)
    .eq("user_id", memberId);
  ensureOk(error);
  return JSON.stringify({ ok: true, mensagem: "Integrante removido da equipe do caso." });
}

export async function deleteLegalCase(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);
  const caseId = await requireVisibleLegalCaseId(supabase, orgId, input.caso_id);

  const { data: documents, error: documentsError } = await supabase
    .from("legal_documents")
    .select("storage_path")
    .eq("case_id", caseId)
    .eq("org_id", orgId);
  ensureOk(documentsError);
  const paths = (documents ?? [])
    .map((d) => d.storage_path as string | null)
    .filter((p): p is string => Boolean(p));

  const { error, count } = await supabase
    .from("legal_cases")
    .delete({ count: "exact" })
    .eq("id", caseId)
    .eq("org_id", orgId);
  ensureOk(error);
  if (!count) throw new Error("Caso não encontrado.");

  if (paths.length > 0) {
    await createAdminClient().storage.from("legal-documents").remove(paths);
  }
  return JSON.stringify({ ok: true, mensagem: "Caso excluído." });
}

export async function deleteLegalDeadline(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);
  const deadlineId = await visibleLegalDeadlineIdOrNull(supabase, orgId, input.prazo_id);
  if (!deadlineId) throw new Error("Prazo não encontrado.");

  const { error, count } = await supabase
    .from("legal_deadlines")
    .delete({ count: "exact" })
    .eq("id", deadlineId)
    .eq("org_id", orgId);
  ensureOk(error);
  if (!count) throw new Error("Prazo não encontrado.");
  return JSON.stringify({ ok: true, mensagem: "Prazo excluído." });
}

export async function deleteLegalDocument(supabase: SupabaseClient, orgId: string, userId: string, input: ToolInput) {
  const access = await legalAccess(supabase, orgId, userId);
  requireManageLegal(access);
  const documentId = await visibleLegalDocumentIdOrNull(supabase, orgId, input.documento_id);
  if (!documentId) throw new Error("Documento não encontrado.");

  const { data: document, error: documentError } = await supabase
    .from("legal_documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("org_id", orgId)
    .maybeSingle();
  ensureOk(documentError);

  const { error, count } = await supabase
    .from("legal_documents")
    .delete({ count: "exact" })
    .eq("id", documentId)
    .eq("org_id", orgId);
  ensureOk(error);
  if (!count) throw new Error("Documento não encontrado.");

  if (document?.storage_path) {
    await createAdminClient().storage.from("legal-documents").remove([document.storage_path as string]);
  }
  return JSON.stringify({ ok: true, mensagem: "Documento excluído." });
}

async function visibleContactIdOrNullForLegal(supabase: SupabaseClient, orgId: string, v: unknown): Promise<string | null> {
  const id = optionalStr(v, 80);
  if (!id) return null;
  const { data, error } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", "law_office")
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Contato não encontrado.");
  return id;
}
