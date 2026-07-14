import { expect, test } from "@playwright/test";
import { E2E_REALESTATE_EMAIL, E2E_REALESTATE_PASSWORD } from "./fixtures";

test.describe.configure({ mode: "serial" });

// 1x1 PNG transparente — só precisa ser um arquivo de imagem válido para
// passar pela validação de upload, o conteúdo não importa para o teste.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-?mail/i).fill(E2E_REALESTATE_EMAIL);
  await page.locator('input[name="password"]').fill(E2E_REALESTATE_PASSWORD);
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test("corretor cadastra imóvel, monta vitrine e recebe reação do cliente sem login", async ({ page, context, browser }) => {
  await login(page);

  const propertyTitle = `Apartamento E2E ${Date.now()}`;
  const neighborhood = `BairroE2E${Date.now()}`;

  await page.goto("/imoveis/novo");
  await page.locator('input[name="title"]').fill(propertyTitle);
  await page.locator('select[name="property_type"]').selectOption("apartamento");
  await page.locator('select[name="transaction_type"]').selectOption("venda");
  await page.locator('input[name="price"]').fill("450000");
  await page.locator('input[name="bedrooms"]').fill("3");
  await page.locator('input[name="address_neighborhood"]').fill(neighborhood);
  await page.getByRole("button", { name: /salvar imóvel/i }).click();

  await expect(page).toHaveURL(/\/imoveis\/[0-9a-f-]{36}/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: propertyTitle })).toBeVisible();

  // Sobe duas fotos e reordena — confirma que a galeria dedicada (não o
  // padrão details.photo_urls de deal-photos) funciona ponta a ponta.
  const fileInput = page.locator('input[name="photo"]');
  await fileInput.setInputFiles({ name: "foto-1.png", mimeType: "image/png", buffer: TINY_PNG });
  await page.getByRole("button", { name: /adicionar foto/i }).click();
  await expect(page.locator("img[src*='property-photos']")).toHaveCount(1, { timeout: 15_000 });

  await fileInput.setInputFiles({ name: "foto-2.png", mimeType: "image/png", buffer: TINY_PNG });
  await page.getByRole("button", { name: /adicionar foto/i }).click();
  await expect(page.locator("img[src*='property-photos']")).toHaveCount(2, { timeout: 15_000 });

  const srcsBeforeMove = await page.locator("img[src*='property-photos']").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src")));
  await page.getByRole("button", { name: "Mover foto 2 para trás" }).click();
  await expect(page.locator("img[src*='property-photos']").first()).not.toHaveAttribute("src", srcsBeforeMove[0]!, { timeout: 15_000 });

  // Filtro server-side na lista: bairro inexistente não deve retornar o
  // imóvel recém-criado (confirma que o filtro roda no banco, não em memória).
  await page.goto(`/imoveis?neighborhood=${encodeURIComponent(neighborhood)}`);
  await expect(page.getByText(propertyTitle)).toBeVisible();
  await page.goto("/imoveis?neighborhood=bairro-que-nao-existe-jamais");
  await expect(page.getByText(propertyTitle)).not.toBeVisible();
  await expect(page.getByText(/nenhum imóvel encontrado/i)).toBeVisible();

  // Cria a vitrine com esse imóvel.
  const collectionTitle = `Vitrine E2E ${Date.now()}`;
  await page.goto("/imoveis/colecoes/nova");
  await page.locator('input[name="title"]').fill(collectionTitle);
  await page.getByText(propertyTitle).locator("..").locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: /criar vitrine/i }).click();
  await expect(page).toHaveURL(/\/imoveis\/colecoes$/, { timeout: 15_000 });
  await expect(page.getByText(collectionTitle)).toBeVisible();

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page
    .locator("section", { hasText: collectionTitle })
    .getByRole("button", { name: /copiar link/i })
    .click();
  const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());
  const token = copiedUrl.split("/").pop()!;
  expect(token).toMatch(/^[0-9a-f-]{36}$/i);

  // Abre o link público num contexto novo, sem sessão nenhuma — é o
  // comportamento genuinamente novo desta fase (escrita anônima refletindo
  // de volta no CRM), por isso vale cobrir ponta a ponta em vez de só RLS.
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(`/share/imoveis/${token}`);
  await expect(publicPage.getByText(propertyTitle)).toBeVisible({ timeout: 15_000 });
  await publicPage.getByRole("button", { name: /quero visitar/i }).click();
  await expect(publicPage.getByText(/obrigado/i)).toBeVisible({ timeout: 15_000 });
  await publicContext.close();

  await page.goto("/imoveis/colecoes");
  await expect(page.getByText(/quer visitar/i)).toBeVisible({ timeout: 15_000 });
});
