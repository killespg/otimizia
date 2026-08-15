import { execFileSync } from "node:child_process";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

try {
  const testWorkdir = process.env.SUPABASE_TEST_WORKDIR;
  const output = execFileSync(process.execPath, [
    path.resolve(process.cwd(), "node_modules/supabase/dist/supabase.js"),
    "status",
    "-o",
    "json",
    ...(testWorkdir ? ["--workdir", testWorkdir] : []),
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const status = JSON.parse(output);
  if (!status.API_URL || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
    throw new Error("configuração incompleta");
  }

  const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (!error) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  if (!ready) {
    throw new Error("serviço de autenticação local não ficou pronto em 30 segundos");
  }
} catch {
  console.error(
    [
      "Os testes de integração exigem um Supabase local ativo.",
      "Rode `npx --no-install supabase start` e tente `npm run test:integration` novamente.",
      "A suíte não é ignorada: ausência do banco é uma falha de validação.",
    ].join("\n"),
  );
  process.exit(1);
}
