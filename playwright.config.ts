import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { CONSENT_COOKIE, CONSENT_POLICY_VERSION } from "./lib/consent/consent";

// O Playwright roda fora do Next, então não herda o .env.local que o app lê
// sozinho. Sem isto, E2E_EMAIL/E2E_PASSWORD ficam indefinidos e os testes
// autenticados são PULADOS em silêncio — a suíte termina verde sem ter
// exercitado nada que dependa de sessão, que é justamente o que interessa.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
if (
  process.env.CI &&
  (!process.env.E2E_EMAIL ||
    !process.env.E2E_PASSWORD ||
    !process.env.E2E_RESTRICTED_EMAIL ||
    !process.env.E2E_RESTRICTED_PASSWORD ||
    !process.env.E2E_SHARED_CONTACT_NAME)
) {
  throw new Error(
    "CI sem as fixtures autenticadas completas: fluxos, permissões e privacidade não podem ser ignorados.",
  );
}
// O banner de cookies é um overlay fixo no rodapé e intercepta o clique em
// "Entrar". Em vez de exigir que cada pessoa descubra o formato do cookie e
// preencha duas variáveis, os testes já começam com a escolha registrada.
// O padrão é RECUSAR: nenhuma tag de medição carrega durante os testes, e o
// caminho exercitado é o do visitante que disse não. Para testar o outro
// caminho, defina E2E_CONSENT_COOKIE_VALUE com marketing/analytics em "1".
// O visitorId precisa ser 32 caracteres hexadecimais (ver isVisitorId).
const consentCookieName = process.env.E2E_CONSENT_COOKIE_NAME ?? CONSENT_COOKIE;
const consentCookieValue =
  process.env.E2E_CONSENT_COOKIE_VALUE ??
  `${CONSENT_POLICY_VERSION}|e2e5e2e5e2e5e2e5e2e5e2e5e2e5e2e5|0|0|rejected_all`;
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
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
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
        // Nunca herda um `next dev` comum: ele pode estar com a chave real do
        // Turnstile e produzir um falso erro de CAPTCHA.
        reuseExistingServer: false,
        timeout: 120_000,
        // O servidor que ESTES testes sobem usa as chaves de teste do
        // Turnstile, publicadas pela Cloudflare em
        // https://developers.cloudflare.com/turnstile/troubleshooting/testing/
        // O widget real nunca emite token em navegador automatizado, e o
        // login travaria no CAPTCHA. Isso vale só para este processo: o seu
        // `npm run dev` normal continua com as chaves do .env.local, então
        // não há nada para trocar de um lado para o outro. Variável de
        // ambiente tem precedência sobre .env.local no Next.
        env: {
          ...process.env,
          NEXT_PUBLIC_TURNSTILE_SITE_KEY:
            process.env.E2E_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA",
          TURNSTILE_SECRET:
            process.env.E2E_TURNSTILE_SECRET ??
            "1x0000000000000000000000000000000AA",
        },
      },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 5"] } },
  ],
});
