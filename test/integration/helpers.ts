import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type LocalSupabaseConfig = {
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
};

let cached: LocalSupabaseConfig | null | undefined;

// Lê a config do Supabase local rodando (URL/chaves) via `supabase status`,
// em vez de hardcodar as chaves de demo — assim continua correto mesmo se a
// CLI mudar as chaves padrão entre versões. Retorna null se não achar uma
// instância local rodando (o teste que chamar isso deve pular a suíte).
export function getLocalSupabaseConfig(): LocalSupabaseConfig | null {
  if (cached !== undefined) return cached;
  try {
    const output = execSync("npx supabase status -o json", {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const status = JSON.parse(output);
    cached = {
      apiUrl: status.API_URL,
      anonKey: status.ANON_KEY,
      serviceRoleKey: status.SERVICE_ROLE_KEY,
    };
  } catch {
    cached = null;
  }
  return cached;
}

export function adminClient(config: LocalSupabaseConfig): SupabaseClient {
  return createClient(config.apiUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Cria um usuário de teste já confirmado e devolve um client autenticado
// como ele (mesmo client que o app usaria no navegador, só que com a sessão
// já plantada) — é assim que exercitamos RLS de verdade, não a service role.
export async function createTestUser(
  config: LocalSupabaseConfig,
  admin: SupabaseClient,
  userMetadata?: Record<string, unknown>,
): Promise<{ userId: string; email: string; client: SupabaseClient }> {
  const email = `rls-test-${randomUUID()}@example.com`;
  const password = `Test-${randomUUID()}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });
  if (error || !data.user) {
    throw new Error(`Falha ao criar usuário de teste: ${error?.message}`);
  }

  const client = createClient(config.apiUrl, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`Falha ao logar usuário de teste: ${signInError.message}`);
  }

  return { userId: data.user.id, email, client };
}

export async function getPersonalOrgId(admin: SupabaseClient, userId: string): Promise<string> {
  const { data } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error(`Usuário ${userId} sem organização (handle_new_user não rodou?).`);
  return data.org_id as string;
}

export async function deleteTestUser(admin: SupabaseClient, userId: string): Promise<void> {
  await admin.auth.admin.deleteUser(userId);
}
