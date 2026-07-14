import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { E2E_EMAIL, E2E_PASSWORD, E2E_REALESTATE_EMAIL, E2E_REALESTATE_PASSWORD } from "./fixtures";

function loadEnvLocal() {
  let content: string;
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

// Garante que o usuário de e2e existe no Supabase local antes da suíte
// rodar — sem isso, o primeiro `npm run test:e2e` falharia por falta de
// conta pra logar.
export default async function globalSetup() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY para rodar e2e. " +
        "Rode `npx supabase start` e aponte o .env.local para a instância local (veja e2e/README.md)."
    );
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await admin.auth.admin.listUsers();
  const alreadyExists = existing?.users.some((u) => u.email === E2E_EMAIL);
  if (!alreadyExists) {
    const { error } = await admin.auth.admin.createUser({
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Falha ao criar usuário de e2e: ${error.message}`);
  }

  const realEstateExists = existing?.users.some((u) => u.email === E2E_REALESTATE_EMAIL);
  if (!realEstateExists) {
    const { error } = await admin.auth.admin.createUser({
      email: E2E_REALESTATE_EMAIL,
      password: E2E_REALESTATE_PASSWORD,
      email_confirm: true,
      user_metadata: { profession_type: "real_estate_broker", profession_types: ["real_estate_broker"] },
    });
    if (error) throw new Error(`Falha ao criar usuário imobiliário de e2e: ${error.message}`);
  }
}
