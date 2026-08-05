import { expect, test } from "@playwright/test";

test("expõe o canvas e os volumes Liquid Glass da landing", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const canvas = page.locator('[data-landing-liquid-canvas="true"]');
  const navigation = page.locator("header.landing-liquid-nav");
  const stage = page.locator('[data-landing-glass-stage="true"]').first();

  await expect(canvas).toBeVisible();
  await expect(navigation).toBeVisible();
  await expect(stage).toBeVisible();

  const material = await stage.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backdropFilter: style.backdropFilter,
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
    };
  });

  expect(material.backdropFilter).not.toBe("none");
  expect(material.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(Number.parseFloat(material.borderRadius)).toBeGreaterThanOrEqual(20);
});

test("mantém a landing sem overflow e com controles tocáveis no celular", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /A IA atende seu WhatsApp/i })).toBeVisible();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasOverflow).toBe(false);

  await page.getByRole("button", { name: "Abrir menu" }).click();
  const resourcesLink = page
    .getByRole("dialog", { name: "Menu" })
    .getByRole("link", { name: "Recursos" });
  await expect(resourcesLink).toBeVisible();
  await resourcesLink.click();
  await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  await page.getByRole("tab", { name: "Vendedor autônomo" }).click();
  await expect(page.getByText("Do primeiro contato ao pós-venda, sem planilha paralela.")).toBeVisible();

  const smallTargets = await page
    .locator("button:visible, a:visible, select:visible")
    .evaluateAll((elements) =>
      elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            label: element.getAttribute("aria-label") ?? element.textContent?.trim(),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        })
        .filter(({ width, height }) => width > 0 && height > 0 && (width < 44 || height < 44)),
    );

  expect(smallTargets, JSON.stringify(smallTargets.slice(0, 20))).toEqual([]);
});
