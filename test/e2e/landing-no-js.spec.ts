import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

test("mantém proposta, recursos e preço visíveis sem JavaScript", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A IA atende seu WhatsApp/i }),
  ).toBeVisible();
  await expect(page.getByText("O que muda de profissão pra profissão")).toBeVisible();
  await expect(page.locator("body")).toContainText("R$ 39,90 por mês");
  await expect(page.getByRole("link", { name: /Começar grátis/i }).first()).toHaveAttribute(
    "href",
    /signup/,
  );
});
