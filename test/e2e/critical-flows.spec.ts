import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const restrictedEmail = process.env.E2E_RESTRICTED_EMAIL;
const restrictedPassword = process.env.E2E_RESTRICTED_PASSWORD;
const sharedContactName = process.env.E2E_SHARED_CONTACT_NAME;
const hasAuthenticatedFixture = Boolean(email && password);
const hasRestrictedFixture = Boolean(
  restrictedEmail && restrictedPassword && sharedContactName,
);

async function signIn(
  page: Page,
  credentials = { email: email!, password: password! },
) {
  await page.goto("/login?next=/painel");
  await page.getByLabel("E-mail").fill(credentials.email);
  await page.getByLabel("Senha").fill(credentials.password);
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
    .poll(() => new URL(page.url()).pathname.startsWith("/painel"), {
      message: "O login não chegou ao painel.",
      timeout: 30_000,
    })
    .toBe(true);
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

test("permite o microfone somente para a própria aplicação", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.headers()["permissions-policy"]).toContain(
    "microphone=(self)",
  );
  expect(response?.headers()["permissions-policy"]).not.toContain(
    "microphone=()",
  );
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
      "/painel/workspaces",
    ]) {
      await expectHealthyProductPage(page, path);
    }
    await page.goto("/painel/assistente");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Tim, seu assistente de negócios",
      }),
    ).toBeAttached();
  });

  test("não oferece instalação por cima dos fluxos e mantém o controle nas configurações", async ({
    page,
  }) => {
    await page.goto("/painel/funil");
    await expect(page.locator(".install-app-prompt")).toHaveCount(0);
    await page.goto("/painel/configuracoes");
    await expect(
      page.getByRole("heading", { name: "Aplicativo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Instalar aplicativo" }),
    ).toBeVisible();
  });

  test("nega a vertical imobiliária quando ela não é o workspace ativo", async ({
    page,
  }) => {
    await page.goto("/painel/imoveis/novo");
    await expect(
      page.getByRole("heading", {
        name: "Este endereço não existe no painel",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Novo imóvel" }),
    ).toHaveCount(0);
  });

  test("exporta somente registros vinculados à própria conta", async ({
    page,
  }) => {
    const response = await page.request.get("/api/account/export");
    expect(response.ok()).toBe(true);
    const payload = (await response.json()) as {
      schema_version: number;
      organization_data?: unknown;
      personal_data?: { contacts?: Array<{ name?: string }> };
    };
    expect(payload.schema_version).toBe(3);
    expect(payload.organization_data).toBeUndefined();
    expect(payload.personal_data?.contacts ?? []).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: sharedContactName }),
      ]),
    );
    expect(JSON.stringify(payload)).not.toContain(sharedContactName);
  });

  test("cria cliente e confirma venda com produto, estoque e garantia", async ({
    page,
  }, testInfo) => {
    const suffix = `${testInfo.project.name}-${Date.now()}`;
    const contactName = `Cliente E2E ${suffix}`;
    const dealName = `Venda E2E ${suffix}`;
    const productName = `Produto E2E ${suffix}`;

    await page.goto("/painel/contatos");
    await page.getByRole("button", { name: "Novo cliente" }).click();
    const contactDrawer = page.getByRole("dialog");
    await expect(contactDrawer).toBeVisible();
    await contactDrawer.locator('input[name="name"]').fill(contactName);
    await contactDrawer.locator('input[name="phone"]').fill("11999990000");
    await contactDrawer.locator('button[type="submit"]').click();
    await expect(
      page.getByRole("link", { name: new RegExp(contactName) }),
    ).toBeVisible();

    await page.goto("/painel/funil");
    const newDealForm = page.locator("form#new-deal");
    await newDealForm.locator('input[name="title"]').fill(dealName);
    await newDealForm.locator('input[name="value"]').fill("149,90");
    await newDealForm.locator('select[name="contact_id"]').selectOption({
      label: contactName,
    });
    await newDealForm.locator('button[type="submit"]').click();
    const card = page.locator("article").filter({ hasText: dealName }).first();
    await expect(card).toBeVisible();
    await card
      .getByRole("button", {
        name: `Mover ${dealName} para outra lista`,
      })
      .click();
    await card
      .getByRole("link", { name: "Confirmar venda e criar pedido" })
      .click();

    await expect(page).toHaveURL(/\/painel\/vendas\/[^/]+\/confirmar/);
    await page
      .getByRole("button", { name: "Criar produto nesta venda" })
      .click();
    await page.getByLabel("Nome do produto").fill(productName);
    await page.getByLabel("Preço", { exact: true }).fill("149,90");
    await page.getByLabel("Estoque inicial").fill("3");
    await page.getByLabel("Garantia em dias").fill("365");
    await page.getByLabel("Número de série").fill(`SERIE-${suffix}`);
    await page.getByRole("button", { name: "Criar e adicionar" }).click();
    await expect(page.getByText(productName, { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Confirmar venda e criar pedido" })
      .click();

    await expect(page).toHaveURL(/\/painel\/pedidos\/[^/]+/);
    await expect(page.getByText(productName, { exact: true })).toBeVisible();
    await page.goto("/painel/produtos");
    await expect(page.getByText(productName, { exact: true }).first()).toBeVisible();
    await page.goto("/painel/pos-venda");
    await expect(page.getByText(productName, { exact: true }).first()).toBeVisible();
  });

  test("mantém os controles essenciais utilizáveis no mobile", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("mobile"));
    await expectHealthyProductPage(page, "/painel");
    const smallTargets = await page.locator("button:visible, a:visible, summary:visible").evaluateAll((elements) =>
      elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { label: element.getAttribute("aria-label") ?? element.textContent, width: rect.width, height: rect.height };
        })
        .filter(({ width, height }) => width > 0 && height > 0 && (width < 44 || height < 44)),
    );
    expect(smallTargets, JSON.stringify(smallTargets.slice(0, 10))).toEqual([]);

    const clippedMobileLabels = await page.locator("[data-mobile-nav] a span:last-child").evaluateAll(
      (elements) =>
        elements
          .filter((element) => element.scrollWidth > element.clientWidth + 1)
          .map((element) => element.textContent),
    );
    expect(clippedMobileLabels).toEqual([]);

    const moreButton = page.getByRole("button", { name: "Mais" });
    await moreButton.click();
    await expect(page.getByRole("dialog", { name: "Todas as áreas" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Todas as áreas" })).toHaveCount(0);
    await expect(moreButton).toBeFocused();
  });
});

test.describe("permissões autenticadas", () => {
  test.skip(
    !hasRestrictedFixture,
    "Defina a fixture E2E restrita para validar negações por cargo.",
  );

  test("membro sem cargo imobiliário usa o CRM básico e não abre dados da vertical", async ({
    page,
  }) => {
    await signIn(page, {
      email: restrictedEmail!,
      password: restrictedPassword!,
    });
    await expect(page).toHaveURL(/\/painel\/contatos$/);
    await page.goto("/painel/imoveis/novo");
    await expect(
      page.getByRole("heading", {
        name: "Este endereço não existe no painel",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Novo imóvel" }),
    ).toHaveCount(0);
    await expect(page.getByText(sharedContactName!, { exact: true })).toHaveCount(
      0,
    );
  });
});
