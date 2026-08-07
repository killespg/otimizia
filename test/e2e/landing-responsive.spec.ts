import { expect, test } from "@playwright/test";

test("mantém a landing sem overflow e com controles tocáveis no celular", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Seu negócio não para/i })).toBeVisible();
  await expect(page.locator('[data-landing-cinematic="true"]')).toBeVisible();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasOverflow).toBe(false);

  await page.getByRole("button", { name: "Abrir menu" }).click();
  // O menu mobile é um dialog (bottom sheet), não um <nav> — mesmo contrato
  // do menu "Mais" da área logada (components/design-system/tubelight-navbar.tsx).
  const resourcesLink = page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Recursos" });
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
        // O indicador de dev do Next.js (<nextjs-portal>) só existe em `next
        // dev` — nunca no build de produção que vai pro ar — e vive dentro de
        // shadow DOM, então closest() não alcança o host; precisa checar a
        // raiz da árvore. Não é controlado pelo produto, então não faz
        // sentido auditar o alvo de toque dele.
        .filter((element) => {
          const root = element.getRootNode();
          const host = root instanceof ShadowRoot ? root.host : null;
          return host?.tagName !== "NEXTJS-PORTAL";
        })
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
