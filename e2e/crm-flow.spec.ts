import { expect, test } from "@playwright/test";
import { E2E_EMAIL, E2E_PASSWORD } from "./fixtures";

test.describe.configure({ mode: "serial" });

test("login, criar contato e concluir um lembrete", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-?mail/i).fill(E2E_EMAIL);
  await page.locator('input[name="password"]').fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /entrar/i }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  const contactName = `Cliente E2E ${Date.now()}`;
  await page.goto("/contacts");
  await page.locator('input[name="name"]').first().fill(contactName);
  await page.getByRole("button", { name: /salvar/i }).first().click();
  await expect(page.getByText(contactName)).toBeVisible({ timeout: 15_000 });

  const taskTitle = `Ligar para revisar proposta ${Date.now()}`;
  await page.goto("/tasks");
  await page.locator("#task-title").fill(taskTitle);
  await page.locator('#new-task button[type="submit"]').click();
  const taskRow = page.getByText(taskTitle);
  await expect(taskRow).toBeVisible({ timeout: 15_000 });

  const checkbox = page.locator("li", { hasText: taskTitle }).locator('input[type="checkbox"]');
  await checkbox.check();
  await expect(checkbox).toBeChecked();
});
