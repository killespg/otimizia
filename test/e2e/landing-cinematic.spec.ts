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

test("deixa a iluminação do canvas atravessar os volumes de vidro", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const material = await page.evaluate(() => {
    function alphaOf(color: string) {
      const channels = color.match(/[\d.]+/g)?.map(Number) ?? [];
      return channels.length === 4 ? channels[3] : 1;
    }

    const root = document.querySelector<HTMLElement>('[data-landing-cinematic="true"]');
    const violetLight = document.querySelector<HTMLElement>(".landing-cinematic-light--violet");
    const plate = document.querySelector<HTMLElement>("[data-cinematic-plate]");
    const stages = Array.from(
      document.querySelectorAll<HTMLElement>("[data-landing-stage]"),
    );

    if (!root || !violetLight || !plate || stages.length === 0) {
      throw new Error("Materiais cinematográficos não renderizados");
    }

    return {
      ambientLayer: getComputedStyle(root, "::before").backgroundImage,
      lightCoverage: violetLight.getBoundingClientRect().width / window.innerWidth,
      plateAlpha: alphaOf(getComputedStyle(plate).backgroundColor),
      stageAlphas: stages.map((stage) => alphaOf(getComputedStyle(stage).backgroundColor)),
    };
  });

  expect(material.ambientLayer).not.toBe("none");
  expect(material.lightCoverage).toBeGreaterThan(1.1);
  expect(material.plateAlpha).toBeLessThanOrEqual(0.5);
  expect(Math.max(...material.stageAlphas)).toBeLessThanOrEqual(0.6);
});
