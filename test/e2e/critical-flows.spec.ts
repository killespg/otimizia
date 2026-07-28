import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const hasAuthenticatedFixture = Boolean(email && password);

async function signIn(page: Page) {
  await page.goto("/login?next=/painel");
  await page.getByLabel("E-mail").fill(email!);
  await page.getByLabel("Senha").fill(password!);
  const captchaToken = page.locator('input[name="cf-turnstile-response"]');
  if (await captchaToken.count()) {
    await expect(captchaToken.first()).not.toHaveValue("", { timeout: 15_000 });
  }
  const loginResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/login",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Entrar" }).click();
  await loginResponse;
  await expect
    .poll(() => new URL(page.url()).pathname, {
      message: "O login não chegou ao painel.",
      timeout: 30_000,
    })
    .toBe("/painel");
  await expect
    .poll(
      async () =>
        (await page.context().cookies()).filter((cookie) => cookie.name.startsWith("sb-")).length,
      {
        message: "O login chegou ao painel sem persistir a sessão.",
        timeout: 10_000,
      },
    )
    .toBeGreaterThan(0);
}

async function expectHealthyProductPage(page: Page, path: string) {
  await page.goto(path);
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page.locator("main").first()).toBeVisible();
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasOverflow).toBe(false);
}

test("protege o painel e preserva o destino no login", async ({ page }) => {
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/login\?.*next=%2Fpainel/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test.describe("fluxos críticos autenticados", () => {
  test.skip(
    !hasAuthenticatedFixture,
    "Defina E2E_EMAIL e E2E_PASSWORD para validar os fluxos autenticados.",
  );

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("abre dashboard, funil, calendário e Tim sem perder a sessão", async ({ page }) => {
    for (const path of [
      "/painel",
      "/painel/funil",
      "/painel/calendario",
      "/painel/assistente",
    ]) {
      await expectHealthyProductPage(page, path);
    }
  });

  test("mantém os controles essenciais utilizáveis no mobile", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("mobile"));
    await expectHealthyProductPage(page, "/painel");
    const smallTargets = await page.locator("button:visible, a:visible").evaluateAll((elements) =>
      elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { label: element.getAttribute("aria-label") ?? element.textContent, width: rect.width, height: rect.height };
        })
        .filter(({ width, height }) => width > 0 && height > 0 && (width < 44 || height < 44)),
    );
    expect(smallTargets, JSON.stringify(smallTargets.slice(0, 10))).toEqual([]);
  });
});
