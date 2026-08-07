import { expect, test } from "@playwright/test";

test("apresenta o corredor cinematográfico com o produto antes das profissões", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.locator('[data-landing-cinematic="true"]')).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Seu negócio não para/i }),
  ).toBeVisible();

  const plates = page.locator("[data-cinematic-plate]");
  await expect(plates).toHaveCount(3);
  await expect(plates.nth(0)).toContainText("Hoje");
  await expect(plates.nth(1)).toContainText("Tim");
  await expect(plates.nth(2)).toContainText("Negócios");

  const chapterOrder = await page
    .locator("main section[id]")
    .evaluateAll((sections) => sections.map((section) => section.id));
  expect(chapterOrder.indexOf("painel")).toBeLessThan(
    chapterOrder.indexOf("recursos"),
  );

  const panelStage = page.locator('[data-landing-stage="panel"]');
  await expect(panelStage).toBeVisible();
  expect(
    await panelStage.evaluate(
      (element) => getComputedStyle(element).backdropFilter,
    ),
  ).not.toBe("none");
});
