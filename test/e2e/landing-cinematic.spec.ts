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

test("mostra o print real do painel no lugar do mockup", async ({
  page,
  isMobile,
}) => {
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

test("entrega o print original sem recompressão que borre o texto", async ({
  page,
}) => {
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

test("mantém o print fora de transformações 3D que rasterizam o texto", async ({
  page,
}) => {
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

test("abre o notebook fisicamente pela dobradiça conforme o scroll", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#painel", { waitUntil: "networkidle" });

  const frame = page.locator('[data-laptop-frame="true"]');
  const screen = page.locator('[data-laptop-opening-screen="true"]');
  const cover = page.locator('[data-laptop-cover="true"]');
  const hinge = page.locator('[data-laptop-hinge="true"]');
  const base = page.locator('[data-laptop-base="true"]');
  const hardware = page.locator('[data-laptop-hardware="true"]');
  const heading = page.locator('[data-landing-panel-heading="true"]');
  const stage = page.locator('[data-landing-stage="panel"]');
  const viewportHeight = await page.evaluate(() => window.innerHeight);

  await expect
    .poll(async () =>
      frame.evaluate((element) =>
        Math.abs(element.getBoundingClientRect().top),
      ),
    )
    .toBeLessThanOrEqual(1);
  await expect
    .poll(async () =>
      base.evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeLessThan(viewportHeight * 0.84);
  expect(
    await hardware.evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");

  await page.evaluate(() => {
    const notebook = document.querySelector<HTMLElement>(
      '[data-laptop-frame="true"]',
    );
    if (!notebook) return;

    window.scrollTo(0, notebook.getBoundingClientRect().top + window.scrollY);
  });

  await expect
    .poll(async () =>
      frame.evaluate((element) =>
        Math.abs(element.getBoundingClientRect().top),
      ),
    )
    .toBeLessThanOrEqual(1);

  await expect(page.locator('[data-laptop-opening-lid="true"]')).toHaveCount(0);
  await expect(screen).toBeVisible();
  await expect(cover).toBeVisible();
  await expect(hinge).toBeVisible();
  await expect(heading).toBeVisible();

  const closed = await screen.evaluate((element) => ({
    layoutHeight: element.clientHeight,
    layoutWidth: element.clientWidth,
    screenTop: element.getBoundingClientRect().top,
    renderedHeight: element.getBoundingClientRect().height,
    renderedWidth: element.getBoundingClientRect().width,
    transform: getComputedStyle(element).transform,
  }));
  const closedBaseGap = await Promise.all([
    screen.evaluate((element) => element.getBoundingClientRect().bottom),
    base.evaluate((element) => element.getBoundingClientRect().top),
  ]).then(([screenBottom, baseTop]) => Math.abs(screenBottom - baseTop));
  const closedBaseTop = await base.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  const closedHeadingBox = await heading.boundingBox();

  expect(closed.transform).not.toBe("none");
  expect(closed.transform).toContain("matrix3d");
  expect(closed.renderedHeight).toBeLessThan(closed.layoutHeight * 0.2);
  expect(closed.renderedWidth).toBeGreaterThan(closed.layoutWidth * 0.85);
  expect(closed.renderedWidth).toBeLessThanOrEqual(closed.layoutWidth * 1.05);
  expect(closedBaseGap).toBeLessThanOrEqual(4);
  expect(
    Number(
      await cover.evaluate((element) => getComputedStyle(element).opacity),
    ),
  ).toBeGreaterThan(0.85);
  expect(closedBaseTop).toBeGreaterThan(0);
  expect(closedBaseTop).toBeLessThan(viewportHeight * 0.84);
  expect(closedHeadingBox).not.toBeNull();
  expect(closedHeadingBox!.y).toBeGreaterThan(80);
  expect(closed.screenTop - (closedHeadingBox!.y + closedHeadingBox!.height)).toBeLessThan(
    viewportHeight * 0.45,
  );

  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.22));

  await expect
    .poll(async () =>
      screen.evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeGreaterThan(closed.renderedHeight * 3);

  const midway = await screen.evaluate((element) => ({
    renderedHeight: element.getBoundingClientRect().height,
    renderedWidth: element.getBoundingClientRect().width,
  }));
  const midwayBaseGap = await Promise.all([
    screen.evaluate((element) => element.getBoundingClientRect().bottom),
    base.evaluate((element) => element.getBoundingClientRect().top),
  ]).then(([screenBottom, baseTop]) => Math.abs(screenBottom - baseTop));
  const midwayBaseTop = await base.evaluate(
    (element) => element.getBoundingClientRect().top,
  );

  expect(midway.renderedHeight).toBeGreaterThan(closed.renderedHeight * 3);
  expect(midway.renderedWidth).toBeGreaterThan(closed.renderedWidth);
  expect(midway.renderedWidth).toBeLessThanOrEqual(closed.layoutWidth * 1.05);
  expect(midwayBaseGap).toBeLessThanOrEqual(4);
  expect(Math.abs(midwayBaseTop - closedBaseTop)).toBeLessThanOrEqual(2);
  expect(
    Number(
      await cover.evaluate((element) => getComputedStyle(element).opacity),
    ),
  ).toBeLessThan(0.5);

  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.26));

  await expect
    .poll(async () =>
      screen.evaluate((element) => getComputedStyle(element).transform),
    )
    .toBe("none");
  await expect(cover).toHaveCount(0);
  const openBaseTop = await base.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  expect(Math.abs(openBaseTop - closedBaseTop)).toBeLessThanOrEqual(2);

  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.08));
  const heldOpenBaseTop = await base.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  expect(Math.abs(heldOpenBaseTop - closedBaseTop)).toBeLessThanOrEqual(2);
  expect(
    await stage.evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
});

test("mantém a dobradiça fixa quando a abertura começa em viewport compacta", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile-chromium",
    "O cenário reproduz a largura compacta registrada pelo usuário.",
  );
  await page.setViewportSize({ width: 552, height: 800 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "networkidle" });

  const frame = page.locator('[data-laptop-frame="true"]');
  const screen = page.locator('[data-laptop-opening-screen="true"]');
  const base = page.locator('[data-laptop-base="true"]');
  const frameDocumentTop = await frame.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );

  await page.evaluate(
    ({ top }) => window.scrollTo(0, top - 160),
    { top: frameDocumentTop },
  );
  await expect
    .poll(async () =>
      frame.evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeGreaterThan(158);

  const closed = await screen.evaluate((element) => ({
    layoutHeight: element.clientHeight,
    renderedHeight: element.getBoundingClientRect().height,
  }));
  const closedBaseTop = await base.evaluate(
    (element) => element.getBoundingClientRect().top,
  );

  expect(closed.renderedHeight).toBeLessThan(closed.layoutHeight * 0.2);
  expect(closedBaseTop).toBeLessThan(800);

  await page.evaluate(() => window.scrollBy(0, 160 + window.innerHeight * 0.22));
  await expect
    .poll(async () =>
      screen.evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeGreaterThan(closed.renderedHeight * 3);

  const openingBaseTop = await base.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  expect(Math.abs(openingBaseTop - closedBaseTop)).toBeLessThanOrEqual(2);
});

test("mantém o notebook aberto quando o movimento é reduzido", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });

  const screen = page.locator('[data-laptop-opening-screen="true"]');

  await expect(screen).toBeVisible();
  await expect(page.locator('[data-laptop-cover="true"]')).toHaveCount(0);
  expect(
    await screen.evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
  expect(
    await screen.evaluate((element) => getComputedStyle(element).willChange),
  ).toBe("auto");
});

test("enquadra o print em uma moldura reconhecível de notebook", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const frame = page.locator('[data-laptop-frame="true"]');
  const screen = page.locator('[data-laptop-screen="true"]');
  const camera = page.locator('[data-laptop-camera="true"]');
  const base = page.locator('[data-laptop-base="true"]');

  await expect(frame).toBeVisible();
  await expect(camera).toBeVisible();
  await expect(base).toBeVisible();
  await expect(
    screen.locator('[data-dashboard-screenshot="true"]'),
  ).toBeVisible();

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
  expect(
    Math.abs(
      cameraBox.x + cameraBox.width / 2 - (screenBox.x + screenBox.width / 2),
    ),
  ).toBeLessThan(2);
});

test("deixa a iluminação do canvas atravessar os volumes de vidro", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const material = await page.evaluate(() => {
    function alphaOf(color: string) {
      const channels = color.match(/[\d.]+/g)?.map(Number) ?? [];
      return channels.length === 4 ? channels[3] : 1;
    }

    const root = document.querySelector<HTMLElement>(
      '[data-landing-cinematic="true"]',
    );
    const primaryLight = document.querySelector<HTMLElement>(
      ".landing-cinematic-light--blue",
    );
    const plate = document.querySelector<HTMLElement>("[data-cinematic-plate]");
    const stages = Array.from(
      document.querySelectorAll<HTMLElement>("[data-landing-stage]"),
    );

    if (!root || !primaryLight || !plate || stages.length === 0) {
      throw new Error("Materiais cinematográficos não renderizados");
    }

    return {
      ambientLayer: getComputedStyle(root, "::before").backgroundImage,
      lightCoverage:
        primaryLight.getBoundingClientRect().width / window.innerWidth,
      plateAlpha: alphaOf(getComputedStyle(plate).backgroundColor),
      stageAlphas: stages.map((stage) =>
        alphaOf(getComputedStyle(stage).backgroundColor),
      ),
    };
  });

  expect(material.ambientLayer).not.toBe("none");
  expect(material.lightCoverage).toBeGreaterThan(1.1);
  expect(material.plateAlpha).toBeLessThanOrEqual(0.5);
  expect(Math.max(...material.stageAlphas)).toBeLessThanOrEqual(0.6);
});

test("usa o azul da logo como luz dominante e o roxo como apoio", async ({
  page,
}) => {
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

    const root = document.querySelector<HTMLElement>(
      '[data-landing-cinematic="true"]',
    );
    const primary = document.querySelector<HTMLElement>(
      ".landing-cinematic-light--blue",
    );
    const secondary = document.querySelector<HTMLElement>(
      ".landing-cinematic-light--purple",
    );

    if (!root || !primary || !secondary) {
      throw new Error("Luzes azul e roxa não renderizadas");
    }

    const ambient = colorsOf(
      getComputedStyle(root, "::before").backgroundImage,
    );
    const primaryColor = colorsOf(getComputedStyle(primary).backgroundImage)[0];
    const secondaryColor = colorsOf(
      getComputedStyle(secondary).backgroundImage,
    )[0];

    return {
      primaryColor,
      secondaryColor,
      blueWeight: ambient
        .filter(
          (color) => color.blue > color.red + 50 && color.green > color.red,
        )
        .reduce((total, color) => total + color.alpha, 0),
      purpleWeight: ambient
        .filter(
          (color) => color.blue > color.green + 50 && color.red >= color.green,
        )
        .reduce((total, color) => total + color.alpha, 0),
    };
  });

  expect(palette.primaryColor.blue).toBeGreaterThan(palette.primaryColor.green);
  expect(palette.primaryColor.green).toBeGreaterThan(palette.primaryColor.red);
  expect(palette.secondaryColor.blue).toBeGreaterThan(
    palette.secondaryColor.red,
  );
  expect(palette.secondaryColor.red).toBeGreaterThan(
    palette.secondaryColor.green,
  );
  expect(palette.blueWeight).toBeGreaterThan(palette.purpleWeight * 3);
});
