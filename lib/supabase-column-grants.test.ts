import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guarda da allowlist de colunas de `profiles` e `organizations`.
 *
 * Desde a 0072 essas duas tabelas não têm mais UPDATE aberto para o papel
 * `authenticated`: cada coluna editável pelo navegador precisa de um
 * `grant update (coluna)` explícito. O compilador não sabe disso, o build
 * passa, e a falha só aparece quando um usuário clica no botão — vira 42501,
 * "permission denied for table profiles". Aconteceu com `favorite_tribunals`
 * (0041), com `avatar_path` (0081) e com `calendar_ics_token` e as colunas da
 * página pública do corretor (0082).
 *
 * Este teste reconstrói a allowlist efetiva lendo as migrations na ordem e
 * confronta com todas as colunas que o produto grava usando o client do
 * usuário. Escrita com service role não passa por grant de coluna e fica de
 * fora da checagem — mas continua sendo listada, para que trocar um client
 * pelo outro seja uma decisão visível.
 */

const REPO = resolve(__dirname, "..");
const MIGRATIONS_DIR = join(REPO, "supabase", "migrations");
const SOURCE_DIRS = ["app", "lib"] as const;
const GUARDED_TABLES = ["profiles", "organizations"] as const;

type GuardedTable = (typeof GUARDED_TABLES)[number];

// ---------------------------------------------------------------- migrations

type GrantState = { fullUpdate: boolean; columns: Set<string> };

function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "");
}

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function includesAuthenticated(roles: string): boolean {
  return splitList(roles).includes("authenticated");
}

type Statement =
  | { at: number; kind: "allTables"; privileges: string; roles: string }
  | { at: number; kind: "revoke"; table: GuardedTable; columns: string[]; roles: string }
  | { at: number; kind: "grant"; table: GuardedTable; columns: string[]; roles: string };

// Reconstrói o estado do grant aplicando as migrations em ordem de nome, que é
// a mesma ordem em que o Supabase as executa.
function buildAllowlists(): Record<GuardedTable, GrantState> {
  const state: Record<GuardedTable, GrantState> = {
    profiles: { fullUpdate: false, columns: new Set() },
    organizations: { fullUpdate: false, columns: new Set() },
  };

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = stripSqlComments(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    const statements: Statement[] = [];

    const allTables = /grant\s+([^;]*?)\s+on\s+all\s+tables\s+in\s+schema\s+public\s+to\s+([^;]+);/gi;
    for (let m = allTables.exec(sql); m; m = allTables.exec(sql)) {
      statements.push({ at: m.index, kind: "allTables", privileges: m[1], roles: m[2] });
    }

    const revokes = new RegExp(
      String.raw`revoke\s+update\s*(?:\(([^)]*)\))?\s*on\s+public\.(profiles|organizations)\s+from\s+([^;]+);`,
      "gi"
    );
    for (let m = revokes.exec(sql); m; m = revokes.exec(sql)) {
      statements.push({
        at: m.index,
        kind: "revoke",
        table: m[2].toLowerCase() as GuardedTable,
        columns: m[1] ? splitList(m[1]) : [],
        roles: m[3],
      });
    }

    const grants = new RegExp(
      String.raw`grant\s+update\s*\(([^)]*)\)\s*on\s+public\.(profiles|organizations)\s+to\s+([^;]+);`,
      "gi"
    );
    for (let m = grants.exec(sql); m; m = grants.exec(sql)) {
      statements.push({
        at: m.index,
        kind: "grant",
        table: m[2].toLowerCase() as GuardedTable,
        columns: splitList(m[1]),
        roles: m[3],
      });
    }

    for (const statement of statements.sort((a, b) => a.at - b.at)) {
      if (!includesAuthenticated(statement.roles)) continue;

      if (statement.kind === "allTables") {
        if (!/\bupdate\b/i.test(statement.privileges) && !/\ball\b/i.test(statement.privileges)) continue;
        for (const table of GUARDED_TABLES) state[table].fullUpdate = true;
        continue;
      }

      const target = state[statement.table];
      if (statement.kind === "revoke") {
        if (statement.columns.length === 0) {
          // `revoke update on <tabela>` derruba o privilégio inteiro, inclusive
          // as colunas concedidas antes — é o que a 0072 faz para recomeçar.
          target.fullUpdate = false;
          target.columns.clear();
        } else {
          for (const column of statement.columns) target.columns.delete(column);
        }
        continue;
      }

      for (const column of statement.columns) target.columns.add(column);
    }
  }

  return state;
}

// -------------------------------------------------------------------- código

type WriteSite = {
  file: string;
  line: number;
  table: GuardedTable;
  receiver: string;
  client: "user" | "service";
  columns: string[];
  dynamic: boolean;
};

function listSourceFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".next") continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (/\.tsx?$/.test(entry) && !entry.endsWith(".test.ts")) files.push(full);
    }
  };
  for (const dir of SOURCE_DIRS) walk(join(REPO, dir));
  return files;
}

// Anda para trás a partir do `.from(...)` para descobrir de quem é a chamada:
// `supabase`, `admin` ou o próprio `createAdminClient()`.
function receiverBefore(source: string, at: number): string {
  const head = source.slice(0, at).replace(/\s+$/, "");
  const call = /([A-Za-z_$][\w$]*)\s*\(\s*\)$/.exec(head);
  if (call) return `${call[1]}()`;
  const identifier = /([A-Za-z_$][\w$]*)$/.exec(head);
  return identifier ? identifier[1] : "";
}

// Um objeto literal pode ter aninhamento, template string e chamada de função
// dentro. Só interessam as chaves do primeiro nível — são elas que viram
// coluna no UPDATE.
function topLevelKeys(source: string, openBrace: number): { keys: string[]; dynamic: boolean } {
  const keys: string[] = [];
  let dynamic = false;
  let depth = 0;
  let index = openBrace;
  let segmentStart = openBrace + 1;

  const flush = (end: number) => {
    const segment = source.slice(segmentStart, end).trim();
    if (!segment) return;
    if (segment.startsWith("...")) {
      dynamic = true;
      return;
    }
    const key = /^(?:(["'`])([^"'`]+)\1|\[|([A-Za-z_$][\w$]*))\s*:/.exec(segment);
    if (!key) {
      // Atalho `{ name }` ou chave computada `{ [x]: 1 }`.
      const shorthand = /^([A-Za-z_$][\w$]*)$/.exec(segment);
      if (shorthand) keys.push(shorthand[1]);
      else dynamic = true;
      return;
    }
    if (key[2]) keys.push(key[2]);
    else if (key[3]) keys.push(key[3]);
    else dynamic = true;
  };

  while (index < source.length) {
    const char = source[index];
    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      index += 1;
      while (index < source.length && source[index] !== quote) {
        if (source[index] === "\\") index += 1;
        index += 1;
      }
    } else if (char === "{" || char === "[" || char === "(") {
      depth += 1;
    } else if (char === "}" || char === "]" || char === ")") {
      depth -= 1;
      if (depth === 0 && char === "}") {
        flush(index);
        return { keys, dynamic };
      }
    } else if (char === "," && depth === 1) {
      flush(index);
      segmentStart = index + 1;
    }
    index += 1;
  }

  return { keys, dynamic: true };
}

// `supabase` pode ser tanto o client do usuário quanto o service role,
// dependendo de como foi declarado no arquivo. Na dúvida assumimos o client do
// usuário: errar para o lado estrito faz o teste cobrar um grant a mais, e não
// deixar uma coluna sem cobertura passar batido.
function resolveClient(source: string, receiver: string): "user" | "service" {
  if (/^create\w*AdminClient\(\)$/.test(receiver)) return "service";
  const name = receiver.replace(/\(\)$/, "");
  if (new RegExp(String.raw`(?:const|let)\s+${name}\s*=\s*await\s+createClient\s*\(`).test(source)) {
    return "user";
  }
  if (new RegExp(String.raw`(?:const|let)\s+${name}\s*=\s*create\w*AdminClient\s*\(`).test(source)) {
    return "service";
  }
  return "user";
}

function collectWriteSites(): WriteSite[] {
  const sites: WriteSite[] = [];

  for (const file of listSourceFiles()) {
    const source = readFileSync(file, "utf8");
    const relativePath = relative(REPO, file).split(sep).join("/");
    const from = /\.from\(\s*(["'])(profiles|organizations)\1\s*\)/g;

    for (let match = from.exec(source); match; match = from.exec(source)) {
      const afterFrom = match.index + match[0].length;
      const operation = /^\s*\.\s*(update|upsert)\s*\(/.exec(source.slice(afterFrom));
      if (!operation) continue;

      const argumentStart = afterFrom + operation[0].length;
      const braceOffset = /^\s*\{/.exec(source.slice(argumentStart));
      const parsed = braceOffset
        ? topLevelKeys(source, argumentStart + braceOffset[0].length - 1)
        : { keys: [] as string[], dynamic: true };

      const receiver = receiverBefore(source, match.index);
      sites.push({
        file: relativePath,
        line: source.slice(0, match.index).split("\n").length,
        table: match[2] as GuardedTable,
        receiver,
        client: resolveClient(source, receiver),
        columns: parsed.keys,
        dynamic: parsed.dynamic,
      });
    }
  }

  return sites.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}

/**
 * Escritas cujo conjunto de colunas não é um objeto literal — o patch é montado
 * em tempo de execução. Declaramos as colunas à mão para que continuem
 * cobertas; se o mapa do código crescer, o par abaixo precisa crescer junto.
 */
const DYNAMIC_WRITE_COLUMNS: Record<string, string[]> = {
  // updateOrganizationContextByAi monta `patch` a partir de um mapa
  // português -> coluna. As colunas são exatamente as do formulário da equipe.
  "lib/ai/tools/write.ts:organizations": [
    "name",
    "business_context",
    "business_priorities",
    "ai_tone",
    "ai_instructions",
    "industry",
    "region",
    "team_size",
    "website",
    "extra_notes",
  ],
};

describe("grants de coluna em profiles e organizations", () => {
  const allowlists = buildAllowlists();
  const sites = collectWriteSites();

  it("mantém a allowlist fechada — nenhuma das duas tabelas volta a ter UPDATE aberto", () => {
    for (const table of GUARDED_TABLES) {
      expect(
        allowlists[table].fullUpdate,
        `public.${table} está com UPDATE aberto para authenticated: a proteção da 0072 foi desfeita.`
      ).toBe(false);
      expect(allowlists[table].columns.size).toBeGreaterThan(0);
    }
  });

  it("encontra as escritas conhecidas (a varredura não pode ficar cega)", () => {
    expect(sites.length).toBeGreaterThanOrEqual(15);
    expect(sites.some((site) => site.client === "user")).toBe(true);
    expect(sites.some((site) => site.client === "service")).toBe(true);
  });

  it("só grava, com o client do usuário, colunas que têm grant", () => {
    const violations: string[] = [];

    for (const site of sites) {
      if (site.client === "service") continue;

      const declared = DYNAMIC_WRITE_COLUMNS[`${site.file}:${site.table}`];
      const columns = site.dynamic ? declared : site.columns;
      if (!columns) {
        violations.push(
          `${site.file}:${site.line} grava em ${site.table} com um patch dinâmico não declarado. ` +
            `Liste as colunas em DYNAMIC_WRITE_COLUMNS["${site.file}:${site.table}"].`
        );
        continue;
      }

      for (const column of columns) {
        if (allowlists[site.table].columns.has(column)) continue;
        violations.push(
          `${site.file}:${site.line} grava ${site.table}.${column} com o client do usuário, ` +
            `mas a coluna não tem "grant update" para authenticated — isso falha em runtime com 42501. ` +
            `Adicione o grant numa migration nova ou mova a escrita para uma RPC security definer.`
        );
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("não concede as colunas de cobrança e de identidade", () => {
    const locked = {
      profiles: [
        "cpf",
        "is_admin",
        "terms_accepted_at",
        "welcome_email_sent_at",
        "email",
        "id",
      ],
      organizations: [
        "plan",
        "plan_status",
        "trial_ends_at",
        "stripe_customer_id",
        "stripe_subscription_id",
        "id",
      ],
    } as const;

    for (const table of GUARDED_TABLES) {
      for (const column of locked[table]) {
        expect(
          allowlists[table].columns.has(column),
          `public.${table}.${column} não pode ser editável pelo client do usuário.`
        ).toBe(false);
      }
    }
  });
});
