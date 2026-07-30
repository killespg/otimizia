import { execSync, spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import {
  createE2EFixtures,
  deleteE2EFixtures,
} from "./e2e-fixtures.mjs";

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

let userIds = [];
let orgIds = [];
try {
  const fixtures = await createE2EFixtures(admin, "e2e-local");
  userIds = fixtures.userIds;
  orgIds = fixtures.orgIds;

  const result = spawnSync(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: apiUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
        SITE_URL: "http://127.0.0.1:3100",
        SUPABASE_ENVIRONMENT: "local",
        E2E_EMAIL: fixtures.seller.email,
        E2E_PASSWORD: fixtures.seller.password,
        E2E_RESTRICTED_EMAIL: fixtures.restricted.email,
        E2E_RESTRICTED_PASSWORD: fixtures.restricted.password,
        E2E_SHARED_CONTACT_NAME: fixtures.sharedContactName,
      },
      stdio: "inherit",
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
  if (userIds.length > 0) {
    await deleteE2EFixtures(admin, userIds, orgIds).catch(() => {
      console.error("Aviso: não foi possível remover as contas E2E efêmeras.");
      process.exitCode = process.exitCode || 1;
    });
  }
}
