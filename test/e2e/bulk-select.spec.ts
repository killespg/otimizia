import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const hasAuthenticatedFixture = Boolean(email && password);

async function signIn(page: Page) {
  await page.goto("/login?next=/painel");
  await page.getByLabel("E-mail").fill(email!);
  await page.locator("#password").fill(password!);
  const captchaToken = page.locator('input[name="cf-turnstile-response"]');
  if (await captchaToken.count()) {
    await expect(captchaToken.first()).not.toHaveValue("", { timeout: 15_000 });
  }
  const loginResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname === "/login",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Entrar" }).click();
  await loginResponse;
  await expect
    .poll(() => new URL(page.url()).pathname.startsWith("/painel"), { timeout: 30_000 })
    .toBe(true);
}

// A exclusão em lote é destrutiva, então o teste vai até a confirmação e volta:
// exercita marcar, contar, pedir exclusão e desistir — tudo que o usuário faz
// antes do ponto sem volta — sem apagar registro da conta de fixture.
test.describe("seleção em lote", () => {
  test.skip(!hasAuthenticatedFixture, "sem E2E_EMAIL/E2E_PASSWORD");

  test("marca contatos, mostra a barra e exige o segundo toque para excluir", async ({ page }) => {
    await signIn(page);
    await page.goto("/contatos");
    await expect(page).not.toHaveURL(/\/login/);

    const checkboxes = page.getByRole("checkbox", { name: /^Selecionar / });
    const total = await checkboxes.count();
    test.skip(total < 2, "a carteira da fixture não tem contato suficiente");

    const actionBar = page.getByRole("region", { name: "Ações da seleção" });
    await expect(actionBar).toBeHidden();

    // O primeiro checkbox é o "marcar tudo" do cabeçalho; os seguintes são linhas.
    await checkboxes.nth(1).check();
    await expect(actionBar).toBeVisible();
    await expect(actionBar).toContainText("1 contato");

    await checkboxes.nth(2).check();
    await expect(actionBar).toContainText("2 contatos");

    await actionBar.getByRole("button", { name: "Excluir", exact: true }).click();
    const confirm = actionBar.getByRole("button", { name: /Excluir 2 definitivamente/ });
    await expect(confirm).toBeVisible();

    await actionBar.getByRole("button", { name: "Cancelar" }).click();
    await expect(confirm).toBeHidden();
    await expect(actionBar).toContainText("2 contatos");

    // Desmarcar tudo devolve a lista ao estado original: a barra deixa de existir.
    await checkboxes.nth(1).uncheck();
    await checkboxes.nth(2).uncheck();
    await expect(actionBar).toBeHidden();
  });

  test("a barra flutuante não cobre a barra de navegação no celular", async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/contatos");

    const checkboxes = page.getByRole("checkbox", { name: /^Selecionar / });
    test.skip((await checkboxes.count()) < 2, "a carteira da fixture não tem contato suficiente");
    await checkboxes.nth(1).check();

    const actionBar = page.getByRole("region", { name: "Ações da seleção" });
    await expect(actionBar).toBeVisible();
    const bar = await actionBar.boundingBox();
    const nav = await page.locator("[data-mobile-nav]").boundingBox();
    expect(bar).not.toBeNull();
    expect(nav).not.toBeNull();
    expect(bar!.y + bar!.height).toBeLessThanOrEqual(nav!.y);
  });
});
