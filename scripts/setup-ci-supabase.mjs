import { appendFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { createE2EFixtures } from "./e2e-fixtures.mjs";

const githubEnv = process.env.GITHUB_ENV;
if (!githubEnv) {
  throw new Error("GITHUB_ENV não está disponível; este script é exclusivo do CI.");
}

const status = JSON.parse(
  execSync("npx --no-install supabase status -o json", {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }),
);

const apiUrl = status.API_URL;
const anonKey = status.ANON_KEY;
const serviceRoleKey = status.SERVICE_ROLE_KEY;
if (!apiUrl || !anonKey || !serviceRoleKey) {
  throw new Error("O Supabase local não retornou URL e chaves completas.");
}

const admin = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const fixtures = await createE2EFixtures(admin, "e2e-ci");

for (const value of [
  anonKey,
  serviceRoleKey,
  fixtures.seller.password,
  fixtures.restricted.password,
]) {
  process.stdout.write(`::add-mask::${value}\n`);
}

const variables = {
  NEXT_PUBLIC_SUPABASE_URL: apiUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
  SITE_URL: "http://127.0.0.1:3100",
  E2E_EMAIL: fixtures.seller.email,
  E2E_PASSWORD: fixtures.seller.password,
  E2E_RESTRICTED_EMAIL: fixtures.restricted.email,
  E2E_RESTRICTED_PASSWORD: fixtures.restricted.password,
  E2E_SHARED_CONTACT_NAME: fixtures.sharedContactName,
};
appendFileSync(
  githubEnv,
  Object.entries(variables)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n",
  "utf8",
);

console.log("Supabase local e conta E2E efêmera preparados.");
