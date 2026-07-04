import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEAL_STAGES, type DealStage } from "@/lib/supabase/types";

// Ferramentas que espelham tudo que o usuário pode fazer no OtimizIA.
// Cada execução usa o client Supabase da sessão do usuário, então o RLS
// garante que a IA só enxerga e altera dados do próprio dono.

const STAGE_KEYS = DEAL_STAGES.map((s) => s.key);

export const CRM_TOOLS: Anthropic.Tool[] = [
  // ---------- Leitura ----------
  {
    name: "list_contacts",
    description:
      "Lista os contatos do usuário. Use 'busca' para filtrar por nome, e-mail, telefone ou empresa. Sempre consulte antes de afirmar algo sobre contatos.",
    input_schema: {
      type: "object",
      properties: {
        busca: { type: "string", description: "Texto para filtrar (opcional)" },
        limite: { type: "integer", description: "Máximo de resultados (padrão 20)" },
      },
    },
  },
  {
    name: "get_contact",
    description:
      "Retorna os detalhes completos de um contato: dados cadastrais, vendas, lembretes e últimas conversas registradas. Use quando o usuário perguntar sobre um contato específico.",
    input_schema: {
      type: "object",
      properties: {
        contato_id: { type: "string", description: "ID do contato" },
      },
      required: ["contato_id"],
    },
  },
  {
    name: "list_deals",
    description:
      "Lista as vendas (negócios) do funil. Filtre por etapa se precisar. Etapas: novo, em_contato, negociacao (Proposta), ganho, perdido.",
    input_schema: {
      type: "object",
      properties: {
        etapa: {
          type: "string",
          enum: STAGE_KEYS,
          description: "Filtrar por etapa do funil (opcional)",
        },
      },
    },
  },
  {
    name: "list_tasks",
    description:
      "Lista os lembretes/tarefas do usuário. Filtros: 'abertos' (padrão), 'concluidos', 'atrasados' ou 'hoje'.",
    input_schema: {
      type: "object",
      properties: {
        filtro: {
          type: "string",
          enum: ["abertos", "concluidos", "atrasados", "hoje"],
          description: "Qual recorte listar (padrão: abertos)",
        },
      },
    },
  },
  {
    name: "get_business_summary",
    description:
      "Resumo geral do negócio: total de contatos, valor do funil por etapa, vendas ganhas no mês e lembretes pendentes/atrasados. Use para perguntas do tipo 'como está meu negócio?'.",
    input_schema: { type: "object", properties: {} },
  },

  // ---------- Escrita ----------
  {
    name: "create_contact",
    description:
      "Cria um novo contato. Somente 'nome' é obrigatório. Antes de criar, verifique com list_contacts se já não existe um contato parecido para evitar duplicados. Use 'detalhes' para os campos extras da profissão do usuário (ex: bairro, orçamento, tipo de cliente) — eles aparecem no contexto do sistema.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome do contato" },
        telefone: { type: "string" },
        email: { type: "string" },
        empresa: { type: "string" },
        origem: { type: "string", description: "De onde veio (indicação, Instagram etc.)" },
        anotacoes: { type: "string" },
        detalhes: {
          type: "object",
          description: "Campos extras específicos da profissão do usuário. Só preencha os que o usuário mencionar.",
          additionalProperties: { type: "string" },
        },
      },
      required: ["nome"],
    },
  },
  {
    name: "update_contact",
    description:
      "Atualiza campos de um contato existente. Envie apenas os campos que devem mudar. Para limpar um campo, envie string vazia.",
    input_schema: {
      type: "object",
      properties: {
        contato_id: { type: "string", description: "ID do contato" },
        nome: { type: "string" },
        telefone: { type: "string" },
        email: { type: "string" },
        empresa: { type: "string" },
        origem: { type: "string" },
        anotacoes: { type: "string" },
        detalhes: {
          type: "object",
          description: "Campos extras específicos da profissão do usuário para atualizar (mescla com os já existentes).",
          additionalProperties: { type: "string" },
        },
      },
      required: ["contato_id"],
    },
  },
  {
    name: "log_interaction",
    description:
      "Registra uma conversa/interação com um contato (ligação, WhatsApp, reunião etc.). Use quando o usuário relatar que falou com alguém.",
    input_schema: {
      type: "object",
      properties: {
        contato_id: { type: "string", description: "ID do contato" },
        texto: { type: "string", description: "Resumo da conversa" },
      },
      required: ["contato_id", "texto"],
    },
  },
  {
    name: "create_deal",
    description:
      "Cria uma venda no funil (entra na etapa 'novo'). Valor em reais (ex.: 1500.50). Vincule a um contato quando possível. Use 'detalhes' para os campos extras da profissão do usuário (ex: área do direito, tipo de imóvel).",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Título da venda" },
        valor_reais: { type: "number", description: "Valor em reais (opcional)" },
        contato_id: { type: "string", description: "ID do contato relacionado (opcional)" },
        detalhes: {
          type: "object",
          description: "Campos extras específicos da profissão do usuário. Só preencha os que o usuário mencionar.",
          additionalProperties: { type: "string" },
        },
      },
      required: ["titulo"],
    },
  },
  {
    name: "move_deal",
    description:
      "Move uma venda para outra etapa do funil. 'ganho' e 'perdido' fecham a venda.",
    input_schema: {
      type: "object",
      properties: {
        venda_id: { type: "string", description: "ID da venda" },
        etapa: { type: "string", enum: STAGE_KEYS, description: "Nova etapa" },
      },
      required: ["venda_id", "etapa"],
    },
  },
  {
    name: "create_task",
    description:
      "Cria um lembrete/tarefa. 'vencimento' em formato ISO 8601 (ex.: 2026-07-02T14:00:00-03:00). Vincule a um contato quando fizer sentido.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "O que precisa ser feito" },
        vencimento: { type: "string", description: "Data/hora limite em ISO 8601 (opcional)" },
        contato_id: { type: "string", description: "ID do contato relacionado (opcional)" },
      },
      required: ["titulo"],
    },
  },
  {
    name: "toggle_task",
    description: "Marca um lembrete como concluído ou reabre.",
    input_schema: {
      type: "object",
      properties: {
        lembrete_id: { type: "string", description: "ID do lembrete" },
        concluido: { type: "boolean", description: "true = concluído, false = reabrir" },
      },
      required: ["lembrete_id", "concluido"],
    },
  },

  // ---------- Exclusão (exigem confirmação explícita do usuário) ----------
  {
    name: "delete_contact",
    description:
      "Exclui um contato permanentemente (vendas e lembretes vinculados perdem o vínculo). Só chame depois que o usuário confirmar explicitamente a exclusão na conversa.",
    input_schema: {
      type: "object",
      properties: {
        contato_id: { type: "string", description: "ID do contato" },
      },
      required: ["contato_id"],
    },
  },
  {
    name: "delete_deal",
    description:
      "Exclui uma venda permanentemente. Só chame depois que o usuário confirmar explicitamente a exclusão na conversa.",
    input_schema: {
      type: "object",
      properties: {
        venda_id: { type: "string", description: "ID da venda" },
      },
      required: ["venda_id"],
    },
  },
  {
    name: "delete_task",
    description:
      "Exclui um lembrete permanentemente. Só chame depois que o usuário confirmar explicitamente a exclusão na conversa.",
    input_schema: {
      type: "object",
      properties: {
        lembrete_id: { type: "string", description: "ID do lembrete" },
      },
      required: ["lembrete_id"],
    },
  },
];

const MUTATING_TOOLS = new Set([
  "create_contact",
  "update_contact",
  "log_interaction",
  "create_deal",
  "move_deal",
  "create_task",
  "toggle_task",
  "delete_contact",
  "delete_deal",
  "delete_task",
]);

export function isMutatingTool(name: string): boolean {
  return MUTATING_TOOLS.has(name);
}

// =========================================================
// Execução
// =========================================================

type ToolInput = Record<string, unknown>;

export async function executeTool(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  rawInput: unknown
): Promise<string> {
  const input = (rawInput ?? {}) as ToolInput;

  switch (name) {
    case "list_contacts":
      return listContacts(supabase, userId, input);
    case "get_contact":
      return getContact(supabase, userId, input);
    case "list_deals":
      return listDeals(supabase, userId, input);
    case "list_tasks":
      return listTasks(supabase, userId, input);
    case "get_business_summary":
      return getBusinessSummary(supabase, userId);
    case "create_contact":
      return createContact(supabase, userId, input);
    case "update_contact":
      return updateContact(supabase, userId, input);
    case "log_interaction":
      return logInteraction(supabase, userId, input);
    case "create_deal":
      return createDeal(supabase, userId, input);
    case "move_deal":
      return moveDeal(supabase, userId, input);
    case "create_task":
      return createTask(supabase, userId, input);
    case "toggle_task":
      return toggleTask(supabase, userId, input);
    case "delete_contact":
      return deleteRow(supabase, userId, "contacts", str(input.contato_id, "contato_id"), "Contato excluído.");
    case "delete_deal":
      return deleteRow(supabase, userId, "deals", str(input.venda_id, "venda_id"), "Venda excluída.");
    case "delete_task":
      return deleteRow(supabase, userId, "tasks", str(input.lembrete_id, "lembrete_id"), "Lembrete excluído.");
    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

// ---------- Leitura ----------

async function listContacts(supabase: SupabaseClient, userId: string, input: ToolInput) {
  const limit = clampInt(input.limite, 1, 50, 20);
  let query = supabase
    .from("contacts")
    .select("id, name, phone, email, company, source, details, created_at")
    .eq("owner_id", userId)
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

async function getContact(supabase: SupabaseClient, userId: string, input: ToolInput) {
  const id = str(input.contato_id, "contato_id");

  const { data: contact, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();
  ensureOk(error);
  if (!contact) return JSON.stringify({ erro: "Contato não encontrado." });

  const [deals, tasks, interactions] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, value_cents, stage, details, created_at, closed_at")
      .eq("owner_id", userId)
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("tasks")
      .select("id, title, due_at, done")
      .eq("owner_id", userId)
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("interactions")
      .select("id, body, created_at")
      .eq("owner_id", userId)
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

async function listDeals(supabase: SupabaseClient, userId: string, input: ToolInput) {
  let query = supabase
    .from("deals")
    .select("id, title, value_cents, stage, contact_id, details, created_at, closed_at")
    .eq("owner_id", userId)
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

async function listTasks(supabase: SupabaseClient, userId: string, input: ToolInput) {
  const filtro = optionalStr(input.filtro, 20) ?? "abertos";
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("tasks")
    .select("id, title, due_at, done, contact_id")
    .eq("owner_id", userId)
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

async function getBusinessSummary(supabase: SupabaseClient, userId: string) {
  const nowIso = new Date().toISOString();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [contacts, deals, openTasks] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId),
    supabase
      .from("deals")
      .select("stage, value_cents, closed_at")
      .eq("owner_id", userId),
    supabase
      .from("tasks")
      .select("id, due_at")
      .eq("owner_id", userId)
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

// ---------- Escrita ----------

async function createContact(supabase: SupabaseClient, userId: string, input: ToolInput) {
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      owner_id: userId,
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

async function updateContact(supabase: SupabaseClient, userId: string, input: ToolInput) {
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
      .eq("owner_id", userId)
      .maybeSingle();
    patch.details = { ...(existing?.details ?? {}), ...detailsObject(input.detalhes) };
  }
  if (Object.keys(patch).length === 0) throw new Error("Nenhum campo para atualizar.");

  const { data, error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id, name")
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Contato não encontrado.");
  return JSON.stringify({ ok: true, contato: data });
}

async function logInteraction(supabase: SupabaseClient, userId: string, input: ToolInput) {
  const { data, error } = await supabase
    .from("interactions")
    .insert({
      owner_id: userId,
      contact_id: str(input.contato_id, "contato_id"),
      body: str(input.texto, "texto", 1200),
    })
    .select("id")
    .single();
  ensureOk(error);
  return JSON.stringify({ ok: true, interacao_id: data?.id });
}

async function createDeal(supabase: SupabaseClient, userId: string, input: ToolInput) {
  const valor = input.valor_reais;
  let cents = 0;
  if (valor !== undefined && valor !== null) {
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 0) throw new Error("valor_reais inválido.");
    cents = Math.min(Math.round(n * 100), 999_999_999_99);
  }

  const { data, error } = await supabase
    .from("deals")
    .insert({
      owner_id: userId,
      contact_id: optionalStr(input.contato_id, 80),
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

async function moveDeal(supabase: SupabaseClient, userId: string, input: ToolInput) {
  const id = str(input.venda_id, "venda_id");
  const etapa = str(input.etapa, "etapa", 40);
  if (!isStage(etapa)) throw new Error(`Etapa inválida: ${etapa}`);

  const closed = etapa === "ganho" || etapa === "perdido";
  const { data, error } = await supabase
    .from("deals")
    .update({ stage: etapa, closed_at: closed ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id, title, stage")
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Venda não encontrada.");
  return JSON.stringify({ ok: true, venda: data });
}

async function createTask(supabase: SupabaseClient, userId: string, input: ToolInput) {
  let dueAt: string | null = null;
  const vencimento = optionalStr(input.vencimento, 64);
  if (vencimento) {
    const date = new Date(vencimento);
    if (Number.isNaN(date.getTime())) throw new Error("vencimento inválido (use ISO 8601).");
    dueAt = date.toISOString();
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      owner_id: userId,
      contact_id: optionalStr(input.contato_id, 80),
      title: str(input.titulo, "titulo", 160),
      due_at: dueAt,
    })
    .select("id, title, due_at")
    .single();
  ensureOk(error);
  return JSON.stringify({ ok: true, lembrete: data });
}

async function toggleTask(supabase: SupabaseClient, userId: string, input: ToolInput) {
  const id = str(input.lembrete_id, "lembrete_id");
  if (typeof input.concluido !== "boolean") throw new Error("'concluido' deve ser true ou false.");

  const { data, error } = await supabase
    .from("tasks")
    .update({ done: input.concluido })
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id, title, done")
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Lembrete não encontrado.");
  return JSON.stringify({ ok: true, lembrete: data });
}

async function deleteRow(
  supabase: SupabaseClient,
  userId: string,
  table: "contacts" | "deals" | "tasks",
  id: string,
  message: string
) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("owner_id", userId);
  ensureOk(error);
  if (!count) throw new Error("Registro não encontrado.");
  return JSON.stringify({ ok: true, mensagem: message });
}

// ---------- Validação ----------

function str(v: unknown, field: string, max = 80): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw new Error(`Campo obrigatório: ${field}.`);
  return s.length > max ? s.slice(0, max) : s;
}

function detailsObject(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) {
      result[key.slice(0, 60)] = value.trim().slice(0, 200);
    }
  }
  return result;
}

function optionalStr(v: unknown, max: number): string | null {
  if (v === undefined || v === null) return null;
  const s = typeof v === "string" ? v.trim() : String(v).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function emailOrNull(v: unknown): string | null {
  const email = optionalStr(v, 160)?.toLowerCase() ?? null;
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  return email;
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function isStage(v: string): v is DealStage {
  return (STAGE_KEYS as string[]).includes(v);
}

function ensureOk(error: unknown) {
  if (!error) return;
  console.error("[ai/tools]", error);
  throw new Error("Erro ao acessar o banco de dados.");
}
