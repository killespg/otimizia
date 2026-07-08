#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv(join(__dirname, "..", ".env.local"));
loadEnv(join(__dirname, "..", ".env"));

const DEAL_STAGES = new Set(["novo", "em_contato", "negociacao", "ganho", "perdido"]);
const WORKSPACE_ALIASES = new Map([
  ["pecuaria", "livestock_producer"],
  ["pecuária", "livestock_producer"],
  ["cabanha", "livestock_producer"],
  ["gado", "livestock_producer"],
  ["livestock", "livestock_producer"],
  ["corretor", "real_estate_broker"],
  ["corretor de imoveis", "real_estate_broker"],
  ["corretor de imóveis", "real_estate_broker"],
  ["imoveis", "real_estate_broker"],
  ["imóveis", "real_estate_broker"],
  ["real estate", "real_estate_broker"],
]);

const LIST_STAGE_RULES = [
  ["ganho", ["ganho", "fechado", "vendido", "concluido", "concluído", "done", "won"]],
  ["perdido", ["perdido", "cancelado", "lost"]],
  ["negociacao", ["proposta", "orcamento", "orçamento", "negociacao", "negociação", "quote"]],
  ["em_contato", ["contato", "follow", "andamento", "atendimento"]],
  ["novo", ["novo", "lead", "entrada", "inbox", "triagem"]],
];

const args = parseArgs(process.argv.slice(2));

if (args.help || (!args["list-orgs"] && !args.file) || !args.user) {
  printHelp(args.help ? 0 : 1);
}

const file = args.file ? resolve(String(args.file)) : null;
const dryRun = args["dry-run"] !== false;
const mode = String(args.mode ?? "pipeline");
const includeArchived = Boolean(args["include-archived"]);

if (!["pipeline", "contacts", "tasks"].includes(mode)) {
  fail("Modo invalido. Use --mode pipeline, contacts ou tasks.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  fail("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente ou em .env.local.");
}

if (file && !existsSync(file)) {
  fail(`Arquivo nao encontrado: ${file}`);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const owner = await resolveUser(supabase, String(args.user));
const schemaMode = await detectSchemaMode(supabase);
if (args["list-orgs"]) {
  const targets = await listTargets(supabase, owner.id, schemaMode);
  console.log(`Empresas do OtimizIA para ${owner.email ?? owner.id}:`);
  for (const target of targets) console.log(`- ${target.name} (${target.id})`);
  process.exit(0);
}

const board = readJson(file);
const target = await resolveTarget(supabase, owner.id, schemaMode, {
  orgId: args.org ? String(args.org) : null,
  orgName: args["org-name"] ? String(args["org-name"]) : null,
  workspaceKey: args["workspace-key"] ? String(args["workspace-key"]) : null,
  allowActiveOrg: Boolean(args["allow-active-org"]),
});
const records = buildRecords(board, {
  ownerId: owner.id,
  tenant: target.tenant,
  targetName: target.name,
  hasTaskAssignee: schemaMode === "organization",
  mode,
  includeArchived,
  onlyLists: listArg(args["only-list"]),
  onlyLabels: listArg(args["only-label"]),
  sourceName: String(args.source ?? `Trello: ${board.name ?? basename(file)}`),
});

printPlan({
  board,
  owner,
  target,
  schemaMode,
  records,
  dryRun,
  mode,
  filters: { lists: listArg(args["only-list"]), labels: listArg(args["only-label"]) },
});

if (dryRun) {
  console.log("\nDry-run ativo. Rode com --no-dry-run para gravar.");
  process.exit(0);
}

await insertRecords(supabase, records);
console.log("\nImportacao concluida.");

function buildRecords(board, options) {
  const listsById = new Map((board.lists ?? []).map((list) => [list.id, list]));
  const checklistsByCard = groupBy(board.checklists ?? [], "idCard");
  const actionsByCard = groupBy(
    (board.actions ?? []).filter((action) => action.type === "commentCard"),
    (action) => action.data?.card?.id
  );
  const cards = (board.cards ?? []).filter((card) => {
    const list = listsById.get(card.idList);
    const labels = (card.labels ?? []).map((label) => label.name).filter(Boolean);
    return (
      (options.includeArchived || !card.closed) &&
      matchesAny(list?.name, options.onlyLists) &&
      matchesAny(labels, options.onlyLabels)
    );
  });

  const contacts = [];
  const deals = [];
  const tasks = [];
  const interactions = [];
  const now = new Date().toISOString();

  for (const card of cards) {
    const list = listsById.get(card.idList);
    const contactId = randomUUID();
    const dealId = randomUUID();
    const labels = (card.labels ?? []).map((label) => label.name).filter(Boolean);
    const url = card.shortUrl ?? card.url ?? "";
    const cardDate = normalizeDate(card.dateLastActivity) ?? now;
    const notes = compact([
      card.desc,
      labels.length ? `Etiquetas: ${labels.join(", ")}` : "",
      list?.name ? `Lista original: ${list.name}` : "",
      url ? `Trello: ${url}` : "",
    ]).join("\n\n");

    if (options.mode !== "tasks") {
      contacts.push({
        id: contactId,
        owner_id: options.ownerId,
        ...options.tenant,
        name: truncate(card.name, 120) || "Contato Trello",
        source: truncate(options.sourceName, 120),
        notes: truncate(notes, 1200) || null,
        details: {
          trello_card_id: card.id,
          trello_list: list?.name ?? "",
          pipeline_list: list?.name ?? "",
          trello_labels: labels.join(", "),
          trello_url: url,
          trello_company: options.targetName,
        },
        created_at: normalizeDate(card.start) ?? cardDate,
      });
    }

    if (options.mode === "pipeline") {
      const stage = stageFromList(list?.name);
      const valueCents = extractDealValueCents(card);
      deals.push({
        id: dealId,
        owner_id: options.ownerId,
        ...options.tenant,
        contact_id: contactId,
        title: truncate(card.name, 160) || "Venda Trello",
        value_cents: valueCents,
        stage,
        position: safeIntegerPosition(card.pos),
        details: {
          trello_card_id: card.id,
          trello_list: list?.name ?? "",
          pipeline_list: list?.name ?? "",
          trello_labels: labels.join(", "),
          trello_url: url,
          trello_company: options.targetName,
          ...(valueCents === 0 ? { value_unset: "true" } : {}),
        },
        created_at: cardDate,
        closed_at: stage === "ganho" || stage === "perdido" ? cardDate : null,
      });
    }

    if (card.due) {
      tasks.push({
        owner_id: options.ownerId,
        ...options.tenant,
        ...taskAssignee(options),
        contact_id: options.mode === "tasks" ? null : contactId,
        deal_id: options.mode === "pipeline" ? dealId : null,
        title: truncate(`Trello: ${card.name}`, 160),
        due_at: normalizeDate(card.due),
        done: Boolean(card.dueComplete),
        created_at: cardDate,
      });
    }

    for (const checklist of checklistsByCard.get(card.id) ?? []) {
      for (const item of checklist.checkItems ?? []) {
        tasks.push({
          owner_id: options.ownerId,
          ...options.tenant,
          ...taskAssignee(options),
          contact_id: options.mode === "tasks" ? null : contactId,
          deal_id: options.mode === "pipeline" ? dealId : null,
          title: truncate(`${checklist.name}: ${item.name}`, 160),
          due_at: normalizeDate(item.due),
          done: item.state === "complete",
          created_at: cardDate,
        });
      }
    }

    if (options.mode !== "tasks") {
      for (const action of actionsByCard.get(card.id) ?? []) {
        const body = action.data?.text;
        if (!body) continue;
        interactions.push({
          owner_id: options.ownerId,
          ...options.tenant,
          contact_id: contactId,
          body: truncate(`[Trello] ${body}`, 1200),
          created_at: normalizeDate(action.date) ?? cardDate,
        });
      }
    }
  }

  return { contacts, deals, tasks, interactions };
}

async function insertRecords(supabase, records) {
  if (records.contacts.length) await insertChunked(supabase, "contacts", records.contacts);
  if (records.deals.length) await insertChunked(supabase, "deals", records.deals);
  if (records.tasks.length) await insertChunked(supabase, "tasks", records.tasks);
  if (records.interactions.length) await insertChunked(supabase, "interactions", records.interactions);
}

async function insertChunked(supabase, table, rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) fail(`Erro ao importar ${table}: ${error.message}`);
    console.log(`Gravado ${table}: ${Math.min(i + chunk.length, rows.length)}/${rows.length}`);
  }
}

async function resolveUser(supabase, userArg) {
  if (isUuid(userArg)) {
    const { data, error } = await supabase.auth.admin.getUserById(userArg);
    if (error || !data?.user) fail(`Usuario nao encontrado por id: ${userArg}`);
    return data.user;
  }

  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(`Erro ao procurar usuario: ${error.message}`);
    const user = data.users.find((item) => item.email?.toLowerCase() === userArg.toLowerCase());
    if (user) return user;
    if (data.users.length < 1000) break;
    page += 1;
  }

  fail(`Usuario nao encontrado por email: ${userArg}`);
}

async function detectSchemaMode(supabase) {
  const { error } = await supabase.from("organizations").select("id").limit(1);
  return error ? "workspace" : "organization";
}

async function listTargets(supabase, userId, schemaMode) {
  if (schemaMode === "organization") return listUserOrgs(supabase, userId);
  return listUserWorkspaces(supabase, userId);
}

async function resolveTarget(supabase, userId, schemaMode, options) {
  if (schemaMode === "organization") return resolveOrg(supabase, userId, options);
  return resolveWorkspace(supabase, userId, options);
}

async function resolveOrg(supabase, userId, options) {
  const orgs = await listUserOrgs(supabase, userId);
  const extraTenant = options.workspaceKey ? { workspace_key: options.workspaceKey } : {};

  if (options.orgId) {
    const org = orgs.find((item) => item.id === options.orgId);
    if (!org) fail(`Usuario nao pertence a organizacao ${options.orgId}.`);
    return { ...org, tenant: { org_id: org.id, ...extraTenant } };
  }

  if (options.orgName) {
    const wanted = normalize(options.orgName);
    const matches = orgs.filter((item) => normalize(item.name) === wanted);
    if (matches.length === 1) return { ...matches[0], tenant: { org_id: matches[0].id, ...extraTenant } };
    if (matches.length > 1) {
      fail(`Mais de uma organizacao chamada "${options.orgName}". Use --org <uuid>.`);
    }
    const available = orgs.map((item) => `${item.name} (${item.id})`).join(", ");
    fail(`Organizacao "${options.orgName}" nao encontrada para esse usuario. Disponiveis: ${available}`);
  }

  if (options.allowActiveOrg) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("active_org_id")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) fail(`Erro ao buscar profile: ${profileError.message}`);
    const active = orgs.find((item) => item.id === profile?.active_org_id);
    if (active) return { ...active, tenant: { org_id: active.id, ...extraTenant } };
  }

  const available = orgs.map((item) => `${item.name} (${item.id})`).join(", ");
  fail(
    `Escolha a empresa do OtimizIA com --org-name ou --org. Disponiveis: ${available || "nenhuma"}`
  );
}

async function resolveWorkspace(supabase, userId, options) {
  const workspaces = await listUserWorkspaces(supabase, userId);

  if (options.workspaceKey || options.orgId) {
    const key = options.workspaceKey ?? options.orgId;
    const workspace = workspaces.find((item) => item.id === key);
    if (!workspace) fail(`Usuario nao possui workspace_key ${key}.`);
    return { ...workspace, tenant: { workspace_key: workspace.id } };
  }

  if (options.orgName) {
    const wanted = normalize(options.orgName);
    const aliasKey = WORKSPACE_ALIASES.get(wanted);
    const matches = workspaces.filter(
      (item) => normalize(item.name) === wanted || item.id === aliasKey || item.id === options.orgName
    );
    if (matches.length === 1) return { ...matches[0], tenant: { workspace_key: matches[0].id } };
    if (matches.length > 1) fail(`Mais de um workspace bate com "${options.orgName}". Use --workspace-key.`);
    const available = workspaces.map((item) => `${item.name} (${item.id})`).join(", ");
    fail(`Workspace "${options.orgName}" nao encontrado. Disponiveis: ${available}`);
  }

  const available = workspaces.map((item) => `${item.name} (${item.id})`).join(", ");
  fail(`Escolha a empresa com --org-name ou --workspace-key. Disponiveis: ${available || "nenhuma"}`);
}

async function listUserWorkspaces(supabase, userId) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("profession_type, profession_types")
    .eq("id", userId)
    .maybeSingle();
  if (error) fail(`Erro ao buscar workspaces: ${error.message}`);
  const keys = [...new Set([...(profile?.profession_types ?? []), profile?.profession_type].filter(Boolean))];
  if (keys.length === 0) fail("Usuario sem workspaces/profissoes no OtimizIA.");
  return keys.map((key) => ({ id: key, name: workspaceLabel(key), tenant: { workspace_key: key } }));
}

async function listUserOrgs(supabase, userId) {
  const { data: memberships, error: memberError } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (memberError) fail(`Erro ao buscar organizacao: ${memberError.message}`);
  const orgIds = (memberships ?? []).map((member) => member.org_id).filter(Boolean);
  if (orgIds.length === 0) fail("Usuario sem organizacao no OtimizIA.");

  const { data: orgs, error: orgError } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", orgIds);
  if (orgError) fail(`Erro ao listar organizacoes: ${orgError.message}`);

  const byId = new Map((orgs ?? []).map((org) => [org.id, org]));
  return orgIds.map((id) => byId.get(id)).filter(Boolean);
}

function printPlan({ board, owner, target, schemaMode, records, dryRun, mode, filters }) {
  console.log(`Board: ${board.name ?? "sem nome"}`);
  console.log(`Usuario: ${owner.email ?? owner.id}`);
  console.log(`Schema: ${schemaMode}`);
  console.log(`Empresa OtimizIA: ${target.name} (${target.id})`);
  console.log(`Modo: ${mode}`);
  if (filters.lists.length) console.log(`Filtro de listas: ${filters.lists.join(", ")}`);
  if (filters.labels.length) console.log(`Filtro de etiquetas: ${filters.labels.join(", ")}`);
  console.log(`Dry-run: ${dryRun ? "sim" : "nao"}`);
  console.log("\nVai importar:");
  console.log(`- contatos: ${records.contacts.length}`);
  console.log(`- vendas: ${records.deals.length}`);
  console.log(`- tarefas: ${records.tasks.length}`);
  console.log(`- interacoes: ${records.interactions.length}`);
}

function stageFromList(name = "") {
  const normalized = normalize(name);
  for (const [stage, words] of LIST_STAGE_RULES) {
    if (words.some((word) => normalized.includes(normalize(word)))) return stage;
  }
  return DEAL_STAGES.has(normalized) ? normalized : "novo";
}

function normalize(value) {
  return String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function matchesAny(valueOrValues, filters) {
  if (filters.length === 0) return true;
  const values = Array.isArray(valueOrValues) ? valueOrValues : [valueOrValues];
  const normalizedValues = values.map(normalize);
  return filters.some((filter) => normalizedValues.includes(normalize(filter)));
}

function workspaceLabel(key) {
  const labels = {
    livestock_producer: "Pecuaria",
    real_estate_broker: "Corretor de imoveis",
    law_office: "Advocacia",
    founder: "Empresa",
  };
  return labels[key] ?? key;
}

function listArg(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function groupBy(items, key) {
  const map = new Map();
  for (const item of items) {
    const value = typeof key === "function" ? key(item) : item[key];
    if (!value) continue;
    const group = map.get(value) ?? [];
    group.push(item);
    map.set(value, group);
  }
  return map;
}

function compact(values) {
  return values.map((value) => String(value ?? "").trim()).filter(Boolean);
}

function truncate(value, max) {
  const text = String(value ?? "").trim();
  return text.length > max ? text.slice(0, max) : text;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeIntegerPosition(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.round(value), 2_147_483_647));
}

function taskAssignee(options) {
  return options.hasTaskAssignee ? { assignee_id: options.ownerId } : {};
}

function extractDealValueCents(card) {
  const text = normalize(`${card.name ?? ""}\n${card.desc ?? ""}`);
  const matches = [];
  const patterns = [
    /(?:valor|avaliad[oa]|ate|orcamento|busca|procur[ao]|pretende|pode ter|tem)[^\n.]{0,90}?r\$\s*\d[\d.]*,?\d*/gi,
    /(?:valor|avaliad[oa]|ate|orcamento|busca|procur[ao]|pretende)[^\n.]{0,90}?\b\d+(?:[,.]\d+)?\s*(?:mil|milhao|milhoes)\b/gi,
    /r\$\s*\d[\d.]*,?\d*/gi,
    /\b\d+(?:[,.]\d+)?\s*(?:mil|milhao|milhoes)\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const context = match[0];
      if (isExcludedValueContext(context)) continue;
      const raw =
        context.match(/r\$\s*\d[\d.]*,?\d*(?:\s*(?:mil|milhao|milhoes))?/i)?.[0] ??
        context.match(/\d+(?:[,.]\d+)?\s*(?:mil|milhao|milhoes)/i)?.[0];
      if (!raw) continue;
      const cents = parseMoneyToCents(raw);
      if (cents >= 50_000_00) matches.push(cents);
    }
  }

  return matches.length ? Math.max(...matches) : 0;
}

function parseMoneyToCents(raw) {
  let text = normalize(raw)
    .replace(/r\$/g, "")
    .replace(/reais?/g, "")
    .trim();
  const multiplier = /\bmilhao\b|\bmilhoes\b/.test(text) ? 1_000_000 : /\bmil\b/.test(text) ? 1_000 : 1;
  text = text.replace(/\b(?:mil|milhao|milhoes)\b/g, "").trim();
  const value = text.includes(",")
    ? Number(text.replace(/\./g, "").replace(",", "."))
    : Number(text.replace(/\./g, ""));
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.round(value * multiplier * 100), 999_999_999_99);
}

function isExcludedValueContext(context) {
  const text = normalize(context);
  return ["renda", "fgts", "entrada", "sinal", "salario", "aluguel", "m2", "m²"].some((word) =>
    text.includes(word)
  );
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    fail(`Nao consegui ler JSON: ${error.message}`);
  }
}

function loadEnv(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") result.help = true;
    else if (arg === "--no-dry-run") result["dry-run"] = false;
    else if (arg === "--include-archived") result["include-archived"] = true;
    else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) result[key] = true;
      else {
        if (result[key]) result[key] = Array.isArray(result[key]) ? [...result[key], next] : [result[key], next];
        else result[key] = next;
        i += 1;
      }
    }
  }
  return result;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function printHelp(exitCode) {
  console.log(`
Uso:
  node scripts/import-trello.mjs --file caminho/board.json --user email@exemplo.com

Opcoes:
  --mode pipeline       Importa cards como contatos + vendas + tarefas (padrao)
  --mode contacts       Importa cards como contatos + tarefas
  --mode tasks          Importa cards/checklists apenas como tarefas
  --org <uuid>          Forca uma organizacao especifica
  --org-name <nome>     Escolhe a empresa do OtimizIA pelo nome exato
  --workspace-key <key> Escolhe empresa em bases antigas por workspace_key
  --source <texto>      Origem gravada no contato
  --list-orgs           Lista as empresas do usuario no OtimizIA e sai
  --only-list <nome>    Importa so cards desta lista (pode repetir ou usar virgula)
  --only-label <nome>   Importa so cards desta etiqueta (pode repetir ou usar virgula)
  --include-archived    Inclui cards arquivados do Trello
  --allow-active-org    Permite cair na empresa ativa se --org/--org-name faltar
  --no-dry-run          Grava de verdade no Supabase

Exemplos:
  node scripts/import-trello.mjs --user cliente@email.com --list-orgs
  node scripts/import-trello.mjs --file pecuaria.json --user cliente@email.com --org-name "Pecuaria"
  node scripts/import-trello.mjs --file corretor.json --user cliente@email.com --org-name "Corretor" --no-dry-run
  node scripts/import-trello.mjs --file workspace.json --user cliente@email.com --org-name "Pecuaria" --only-label "Pecuaria"
`);
  process.exit(exitCode);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
