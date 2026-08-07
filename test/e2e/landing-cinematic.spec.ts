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
});

test("mostra o print real do painel no lugar do mockup", async ({ page, isMobile }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const screenshot = page.locator('[data-dashboard-screenshot="true"]');
  const viewport = page.locator('[data-dashboard-screenshot-viewport="true"]');

  await expect(screenshot).toBeVisible();
  await expect(screenshot).toHaveAttribute("src", /painel-imobiliario-mariana/);
  await expect(screenshot).toHaveAttribute(
    "alt",
    "Painel imobiliário da OtimizIA com carteira, visitas, vitrines e comissões",
  );
  await expect(page.locator(".landing-dashboard-preview")).toHaveCount(0);

  const overflow = await viewport.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));

  if (isMobile) {
    expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth * 1.5);
  } else {
    expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
  }
});

test("entrega o print original sem recompressão que borre o texto", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const fidelity = await page
    .locator('[data-dashboard-screenshot="true"]')
    .evaluate((element) => {
      const image = element as HTMLImageElement;
      return {
        currentSrc: image.currentSrc,
        naturalWidth: image.naturalWidth,
        renderedWidth: image.getBoundingClientRect().width,
      };
    });

  expect(fidelity.currentSrc).not.toContain("/_next/image");
  expect(fidelity.naturalWidth / fidelity.renderedWidth).toBeGreaterThan(1.75);
});

test("mantém o print fora de transformações 3D que rasterizam o texto", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#painel", { waitUntil: "networkidle" });

  const stage = page.locator('[data-landing-stage="panel"]');
  await expect(stage).toBeVisible();

  const rendering = await stage.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      transform: style.transform,
      willChange: style.willChange,
    };
  });

  expect(rendering.transform).toBe("none");
  expect(rendering.willChange).not.toContain("transform");
});

test("abre a tampa no scroll sem transformar o print nítido", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "networkidle" });

  const frame = page.locator('[data-laptop-frame="true"]');
  const lid = page.locator('[data-laptop-opening-lid="true"]');
  const stage = page.locator('[data-landing-stage="panel"]');

  await expect(lid).toBeVisible();
  expect(Number(await lid.evaluate((element) => getComputedStyle(element).opacity))).toBeGreaterThan(0.85);

  await frame.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, Math.round(window.innerHeight * 0.45)));

  await expect
    .poll(async () => Number(await lid.evaluate((element) => getComputedStyle(element).opacity)))
    .toBeLessThan(0.15);
  expect(await stage.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
});

test("enquadra o print em uma moldura reconhecível de notebook", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const frame = page.locator('[data-laptop-frame="true"]');
  const screen = page.locator('[data-laptop-screen="true"]');
  const camera = page.locator('[data-laptop-camera="true"]');
  const base = page.locator('[data-laptop-base="true"]');

  await expect(frame).toBeVisible();
  await expect(camera).toBeVisible();
  await expect(base).toBeVisible();
  await expect(screen.locator('[data-dashboard-screenshot="true"]')).toBeVisible();

  const [screenBox, cameraBox, baseBox] = await Promise.all([
    screen.boundingBox(),
    camera.boundingBox(),
    base.boundingBox(),
  ]);

  expect(screenBox).not.toBeNull();
  expect(cameraBox).not.toBeNull();
  expect(baseBox).not.toBeNull();

  if (!screenBox || !cameraBox || !baseBox) return;

  expect(baseBox.width).toBeGreaterThan(screenBox.width);
  expect(baseBox.height).toBeGreaterThanOrEqual(10);
  expect(baseBox.y).toBeGreaterThanOrEqual(screenBox.y + screenBox.height - 2);
  expect(Math.abs(cameraBox.x + cameraBox.width / 2 - (screenBox.x + screenBox.width / 2))).toBeLessThan(2);
});

test("deixa a iluminação do canvas atravessar os volumes de vidro", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const material = await page.evaluate(() => {
    function alphaOf(color: string) {
      const channels = color.match(/[\d.]+/g)?.map(Number) ?? [];
      return channels.length === 4 ? channels[3] : 1;
    }

    const root = document.querySelector<HTMLElement>('[data-landing-cinematic="true"]');
    const primaryLight = document.querySelector<HTMLElement>(".landing-cinematic-light--blue");
    const plate = document.querySelector<HTMLElement>("[data-cinematic-plate]");
    const stages = Array.from(
      document.querySelectorAll<HTMLElement>("[data-landing-stage]"),
    );

    if (!root || !primaryLight || !plate || stages.length === 0) {
      throw new Error("Materiais cinematográficos não renderizados");
    }

    return {
      ambientLayer: getComputedStyle(root, "::before").backgroundImage,
      lightCoverage: primaryLight.getBoundingClientRect().width / window.innerWidth,
      plateAlpha: alphaOf(getComputedStyle(plate).backgroundColor),
      stageAlphas: stages.map((stage) => alphaOf(getComputedStyle(stage).backgroundColor)),
    };
  });

  expect(material.ambientLayer).not.toBe("none");
  expect(material.lightCoverage).toBeGreaterThan(1.1);
  expect(material.plateAlpha).toBeLessThanOrEqual(0.5);
  expect(Math.max(...material.stageAlphas)).toBeLessThanOrEqual(0.6);
});

test("usa o azul da logo como luz dominante e o roxo como apoio", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const palette = await page.evaluate(() => {
    function colorsOf(value: string) {
      return Array.from(value.matchAll(/rgba?\(([^)]+)\)/g), (match) => {
        const channels = match[1].match(/[\d.]+/g)?.map(Number) ?? [];
        return {
          red: channels[0] ?? 0,
          green: channels[1] ?? 0,
          blue: channels[2] ?? 0,
          alpha: channels[3] ?? 1,
        };
      });
    }

    const root = document.querySelector<HTMLElement>('[data-landing-cinematic="true"]');
    const primary = document.querySelector<HTMLElement>(".landing-cinematic-light--blue");
    const secondary = document.querySelector<HTMLElement>(".landing-cinematic-light--purple");

    if (!root || !primary || !secondary) {
      throw new Error("Luzes azul e roxa não renderizadas");
    }

    const ambient = colorsOf(getComputedStyle(root, "::before").backgroundImage);
    const primaryColor = colorsOf(getComputedStyle(primary).backgroundImage)[0];
    const secondaryColor = colorsOf(getComputedStyle(secondary).backgroundImage)[0];

    return {
      primaryColor,
      secondaryColor,
      blueWeight: ambient
        .filter((color) => color.blue > color.red + 50 && color.green > color.red)
        .reduce((total, color) => total + color.alpha, 0),
      purpleWeight: ambient
        .filter((color) => color.blue > color.green + 50 && color.red >= color.green)
        .reduce((total, color) => total + color.alpha, 0),
    };
  });

  expect(palette.primaryColor.blue).toBeGreaterThan(palette.primaryColor.green);
  expect(palette.primaryColor.green).toBeGreaterThan(palette.primaryColor.red);
  expect(palette.secondaryColor.blue).toBeGreaterThan(palette.secondaryColor.red);
  expect(palette.secondaryColor.red).toBeGreaterThan(palette.secondaryColor.green);
  expect(palette.blueWeight).toBeGreaterThan(palette.purpleWeight * 3);
});
