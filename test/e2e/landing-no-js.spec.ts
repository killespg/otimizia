import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

test("mantém proposta, Prisma Glass, recursos e preço visíveis sem JavaScript", async ({
  page,
}, testInfo) => {
  const isMobileProject = testInfo.project.name === "mobile-chromium";
  if (isMobileProject) {
    await page.setViewportSize({ width: 390, height: 844 });
  }

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: /Seu negócio não para/i }),
  ).toBeVisible();
  await expect(page.locator('[data-landing-cinematic="true"]')).toBeVisible();
  await expect(page.locator('[data-prisma-panel-frame="true"]')).toBeVisible();
  await expect(
    page.locator('[data-dashboard-screenshot="true"]'),
  ).toBeVisible();
  await expect(page.getByText("O que muda de profissão pra profissão")).toBeVisible();
  await expect(page.locator("body")).toContainText("R$ 39,90 por mês");
  await expect(page.getByRole("link", { name: /Começar grátis/i }).first()).toHaveAttribute(
    "href",
    /signup/,
  );

  if (isMobileProject) {
    const geometry = await page.evaluate(() => {
      const heading = document.querySelector<HTMLElement>(
        '[data-landing-panel-heading="true"]',
      );
      const frame = document.querySelector<HTMLElement>(
        '[data-prisma-panel-frame="true"]',
      );
      const viewport = document.querySelector<HTMLElement>(
        '[data-dashboard-screenshot-viewport="true"]',
      );
      if (!heading || !frame || !viewport) return null;

      const headingRect = heading.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      return {
        gap: frameRect.top - headingRect.bottom,
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        panelClientWidth: viewport.clientWidth,
        panelScrollWidth: viewport.scrollWidth,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.gap).toBeGreaterThanOrEqual(20);
    expect(geometry!.pageWidth).toBeLessThanOrEqual(geometry!.viewportWidth);
    expect(geometry!.panelScrollWidth).toBeGreaterThan(
      geometry!.panelClientWidth,
    );
  }
});
