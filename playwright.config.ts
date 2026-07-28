import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// O Playwright roda fora do Next, então não herda o .env.local que o app lê
// sozinho. Sem isto, E2E_EMAIL/E2E_PASSWORD ficam indefinidos e os testes
// autenticados são PULADOS em silêncio — a suíte termina verde sem ter
// exercitado nada que dependa de sessão, que é justamente o que interessa.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const consentCookieName = process.env.E2E_CONSENT_COOKIE_NAME;
const consentCookieValue = process.env.E2E_CONSENT_COOKIE_VALUE;
const storageState =
  consentCookieName && consentCookieValue
    ? {
        cookies: [
          {
            name: consentCookieName,
            value: consentCookieValue,
            domain: new URL(baseURL).hostname,
            path: "/",
            expires: -1,
            httpOnly: false,
            secure: false,
            sameSite: "Lax" as const,
          },
        ],
        origins: [],
      }
    : undefined;

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL,
    storageState,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 5"] } },
  ],
});
