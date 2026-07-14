// Cria (idempotente) um corretor de imoveis de teste direto no Supabase via
// admin API — mesmo mecanismo do e2e/global-setup.ts. O trigger handle_new_user
// cria o profile + org pessoal a partir do user_metadata.
//
// Uso:
//   1) Preencha .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
//      (ou exporte essas variaveis no shell).
//   2) node scripts/create-test-broker.mjs
//
// Nao commitar credenciais. A service role key ignora RLS — use so localmente.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  let content;
  try {
    content = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

// Dados do corretor de teste. Ajuste se quiser.
const EMAIL = process.env.TEST_BROKER_EMAIL || "corretor.teste@otimizia.com";
const PASSWORD = process.env.TEST_BROKER_PASSWORD || "CorretorTeste-2026!";
const NAME = process.env.TEST_BROKER_NAME || "Corretor Teste";
const CPF = process.env.TEST_BROKER_CPF || "52998224725"; // CPF valido de teste

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Preencha o .env.local (gitignored) ou exporte no shell e rode de novo."
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing, error: listError } = await admin.auth.admin.listUsers();
if (listError) {
  console.error("Falha ao listar usuarios:", listError.message);
  process.exit(1);
}

const already = existing?.users.find((u) => u.email === EMAIL);
if (already) {
  console.log(`Usuario ja existe: ${EMAIL} (id ${already.id}). Nada a fazer.`);
  console.log(`Login: ${EMAIL} / ${PASSWORD}`);
  process.exit(0);
}

const { data, error } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: {
    name: NAME,
    cpf: CPF,
    terms_accepted: "true",
    profession_type: "real_estate_broker",
    profession_types: ["real_estate_broker"],
  },
});

if (error) {
  console.error("Falha ao criar corretor de teste:", error.message);
  process.exit(1);
}

console.log("Corretor de imoveis de teste criado com sucesso.");
console.log(`  id:    ${data.user?.id}`);
console.log(`  email: ${EMAIL}`);
console.log(`  senha: ${PASSWORD}`);
console.log(`  area:  real_estate_broker (workspace de imoveis)`);
console.log("\nEntre em https://useotimizia.com/login com esses dados.");
