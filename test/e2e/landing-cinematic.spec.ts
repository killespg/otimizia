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
    .locator("main [id]")
    .evaluateAll((targets) => targets.map((target) => target.id));
  expect(chapterOrder).toContain("painel");
  expect(chapterOrder).toContain("recursos");
  expect(chapterOrder.indexOf("painel")).toBeLessThan(
    chapterOrder.indexOf("recursos"),
  );

  const panelStage = page.locator('[data-landing-stage="panel"]');
  await expect(panelStage).toBeVisible();
});

test("remove os balões decorativos e o texto contido neles", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.locator(".landing-cinematic-kicker")).toHaveCount(0);
  await expect(
    page.getByText("CRM com WhatsApp e IA para quem vende", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Seu próximo negócio", { exact: true }),
  ).toHaveCount(0);

  const margins = await page.evaluate(() => ({
    heroTitle: getComputedStyle(
      document.querySelector(".landing-cinematic-hero h1")!,
    ).marginTop,
    finalTitle: getComputedStyle(
      document.querySelector(".landing-cinematic-final-cta h2")!,
    ).marginTop,
  }));

  expect(margins).toEqual({ heroTitle: "0px", finalTitle: "0px" });
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
  const frame = page.locator('[data-prisma-panel-frame="true"]');
  const screenshot = page.locator('[data-dashboard-screenshot="true"]');
  await expect(stage).toBeVisible();
  await expect(frame).toBeVisible();
  await expect(screenshot).toBeVisible();

  const maximumScroll = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );

  for (const scrollY of [0, maximumScroll / 2, maximumScroll]) {
    await page.evaluate((top) => window.scrollTo({ top }), scrollY);

    const rendering = await Promise.all(
      [stage, frame, screenshot].map((locator) =>
        locator.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            transform: style.transform,
            transformStyle: style.transformStyle,
            willChange: style.willChange,
          };
        }),
      ),
    );

    expect(rendering).toEqual([
      { transform: "none", transformStyle: "flat", willChange: "auto" },
      { transform: "none", transformStyle: "flat", willChange: "auto" },
      { transform: "none", transformStyle: "flat", willChange: "auto" },
    ]);
  }
});

test("substitui o notebook pela moldura Prisma Glass estática", async ({
  page,
}) => {
  await page.goto("/#painel", { waitUntil: "networkidle" });

  const stage = page.locator('[data-landing-stage="panel"]');
  const frame = page.locator('[data-prisma-panel-frame="true"]');
  const viewport = frame.locator(
    '[data-dashboard-screenshot-viewport="true"]',
  );
  const screenshot = frame.locator('[data-dashboard-screenshot="true"]');

  await expect(stage).toBeVisible();
  await expect(frame).toBeVisible();
  await expect(viewport).toBeVisible();
  await expect(screenshot).toBeVisible();
  await expect(page.locator('[data-laptop-frame="true"]')).toHaveCount(0);
  await expect(page.locator('[data-laptop-hardware="true"]')).toHaveCount(0);
  await expect(page.locator('[data-laptop-cover="true"]')).toHaveCount(0);
  await expect(page.locator('[data-laptop-base="true"]')).toHaveCount(0);
  await expect(page.locator('[data-laptop-hinge="true"]')).toHaveCount(0);

  const rendering = await Promise.all(
    [stage, frame, screenshot].map((locator) =>
      locator.evaluate((element) => ({
        transform: getComputedStyle(element).transform,
        transformStyle: getComputedStyle(element).transformStyle,
        willChange: getComputedStyle(element).willChange,
      })),
    ),
  );

  expect(rendering).toEqual([
    { transform: "none", transformStyle: "flat", willChange: "auto" },
    { transform: "none", transformStyle: "flat", willChange: "auto" },
    { transform: "none", transformStyle: "flat", willChange: "auto" },
  ]);

  const unfocusedIndicator = await viewport.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineColor: style.outlineColor,
      outlineOffset: style.outlineOffset,
      outlineWidth: style.outlineWidth,
    };
  });

  await viewport.focus();
  await expect(viewport).toHaveCSS("outline-width", "3px");
  await expect(viewport).toHaveCSS("outline-offset", "3px");
  const focusedIndicator = await viewport.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      matchesFocusVisible: element.matches(":focus-visible"),
      outlineColor: style.outlineColor,
      outlineOffset: style.outlineOffset,
      outlineWidth: style.outlineWidth,
    };
  });

  expect(focusedIndicator.matchesFocusVisible).toBe(true);
  expect(Number.parseFloat(focusedIndicator.outlineWidth)).toBeGreaterThanOrEqual(
    2,
  );
  expect(Number.parseFloat(focusedIndicator.outlineOffset)).toBeGreaterThan(0);
  expect(focusedIndicator).not.toMatchObject(unfocusedIndicator);
});

test("preserva a Prisma Glass nos fallbacks de transparência", async ({
  page,
}) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
  });
  await page.goto("/#painel", { waitUntil: "networkidle" });

  const fallbackRendering = await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>(
      ".landing-cinematic-panel-stage",
    );
    const frame = document.querySelector<HTMLElement>(
      ".landing-prisma-panel-frame",
    );
    const hint = document.querySelector<HTMLElement>(
      ".landing-prisma-panel-drag-hint",
    );
    if (!stage || !frame || !hint) return null;

    function renderingOf(element: HTMLElement) {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        backdropFilter: style.backdropFilter,
      };
    }

    return {
      stage: renderingOf(stage),
      frame: renderingOf(frame),
      hint: renderingOf(hint),
    };
  });

  expect(fallbackRendering).toEqual({
    stage: {
      backgroundColor: "rgba(0, 0, 0, 0)",
      backdropFilter: "none",
    },
    frame: {
      backgroundColor: "rgb(16, 26, 50)",
      backdropFilter: "none",
    },
    hint: {
      backgroundColor: "rgb(7, 17, 38)",
      backdropFilter: "none",
    },
  });

  const fallbackRules = await page.evaluate(() => {
    const selectors = {
      panelStage: ".landing-cinematic-panel-stage",
      frame: ".landing-prisma-panel-frame",
      hint: ".landing-prisma-panel-drag-hint",
    };
    const results: Record<
      string,
      Record<
        string,
        {
          backgroundColor: string;
          backgroundColorHasZeroAlpha: boolean;
          backgroundImageIsNone: boolean;
          backdropFilter: string;
        }
      >
    > = {};

    function normalizeBackground(style: CSSStyleDeclaration) {
      const probe = document.createElement("span");
      probe.style.background = style.background;
      probe.style.backgroundColor = style.backgroundColor;
      document.body.append(probe);
      const computedStyle = getComputedStyle(probe);
      const color = computedStyle.backgroundColor;
      const backgroundImage = computedStyle.backgroundImage;
      probe.remove();

      const channels = color.match(/[\d.]+/g)?.map(Number) ?? [];
      return {
        backgroundColorHasZeroAlpha:
          channels.length === 4 && channels[3] === 0,
        backgroundImageIsNone: backgroundImage === "none",
      };
    }

    function visit(rules: CSSRuleList, inheritedCondition?: string) {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule && inheritedCondition) {
          const ruleSelectors = rule.selectorText
            .split(",")
            .map((selector) => selector.trim());
          const fallbackName = inheritedCondition.includes(
            "prefers-reduced-transparency",
          )
            ? "reducedTransparency"
            : inheritedCondition.includes("backdrop-filter")
              ? "unsupportedBackdrop"
              : undefined;

          if (fallbackName) {
            results[fallbackName] ??= {};
            for (const [name, selector] of Object.entries(selectors)) {
              if (ruleSelectors.includes(selector)) {
                results[fallbackName][name] = {
                  backgroundColor: rule.style.backgroundColor,
                  ...normalizeBackground(rule.style),
                  backdropFilter: rule.style.backdropFilter,
                };
              }
            }
          }
        }

        if (rule instanceof CSSGroupingRule) {
          const conditionText = (
            rule as CSSGroupingRule & { conditionText?: string }
          ).conditionText;
          visit(rule.cssRules, conditionText ?? inheritedCondition);
        }
      }
    }

    for (const sheet of Array.from(document.styleSheets)) {
      visit(sheet.cssRules);
    }

    return results;
  });

  const expectedFallback = {
    panelStage: {
      backgroundColorHasZeroAlpha: true,
      backgroundImageIsNone: true,
      backdropFilter: "none",
    },
    frame: {
      backgroundColor: "rgb(16, 26, 50)",
      backgroundColorHasZeroAlpha: false,
      backgroundImageIsNone: true,
      backdropFilter: "none",
    },
    hint: {
      backgroundColor: "rgb(7, 17, 38)",
      backgroundColorHasZeroAlpha: false,
      backgroundImageIsNone: true,
      backdropFilter: "none",
    },
  };
  expect(fallbackRules).toMatchObject({
    unsupportedBackdrop: {
      ...expectedFallback,
    },
    reducedTransparency: {
      ...expectedFallback,
    },
  });
});

test("separa título e Prisma Glass nos viewports que reproduzem o problema", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile-chromium",
    "A geometria compacta precisa rodar uma vez.",
  );

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 660, height: 694 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });

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
        gap:
          frameRect.top + window.scrollY -
          (headingRect.bottom + window.scrollY),
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        panelClientWidth: viewport.clientWidth,
        panelScrollWidth: viewport.scrollWidth,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.gap).toBeGreaterThanOrEqual(20);
    expect(geometry!.pageWidth).toBeLessThanOrEqual(geometry!.viewportWidth);
    if (viewport.width < 640) {
      expect(geometry!.panelScrollWidth).toBeGreaterThan(
        geometry!.panelClientWidth,
      );

      const screenshotViewport = page.locator(
        '[data-dashboard-screenshot-viewport="true"]',
      );
      await screenshotViewport.evaluate((element) => {
        element.scrollLeft = 0;
        window.scrollTo({ left: 0 });
      });
      const beforeKeyboardScroll = await screenshotViewport.evaluate(
        (element) => ({
          pageScrollX: window.scrollX,
          panelScrollLeft: element.scrollLeft,
        }),
      );

      await screenshotViewport.focus();
      await page.keyboard.press("ArrowRight");
      await expect
        .poll(() => screenshotViewport.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(beforeKeyboardScroll.panelScrollLeft);

      const afterKeyboardScroll = await screenshotViewport.evaluate(
        (element) => ({
          pageScrollX: window.scrollX,
          panelScrollLeft: element.scrollLeft,
        }),
      );
      expect(afterKeyboardScroll.panelScrollLeft).toBeGreaterThan(
        beforeKeyboardScroll.panelScrollLeft,
      );
      expect(afterKeyboardScroll.pageScrollX).toBe(
        beforeKeyboardScroll.pageScrollX,
      );
    } else {
      expect(
        geometry!.panelScrollWidth - geometry!.panelClientWidth,
      ).toBeLessThanOrEqual(1);
    }
  }
});

test("mantém o título do painel visível ao abrir a âncora Prisma Glass", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "A navegação direta é exercitada uma vez com os três viewports literais.",
  );

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 660, height: 694 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/#painel", { waitUntil: "networkidle" });

    const geometry = await page.evaluate(() => {
      const navigation = document.querySelector<HTMLElement>("header");
      const heading = document.querySelector<HTMLElement>(
        '[data-landing-panel-heading="true"]',
      );
      const frame = document.querySelector<HTMLElement>(
        '[data-prisma-panel-frame="true"]',
      );
      if (!navigation || !heading || !frame) return null;

      const navigationRect = navigation.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      return {
        navigationBottom: navigationRect.bottom,
        headingTop: headingRect.top,
        headingBottom: headingRect.bottom,
        frameTop: frameRect.top,
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.headingTop).toBeGreaterThanOrEqual(
      geometry!.navigationBottom,
    );
    expect(geometry!.headingBottom).toBeLessThanOrEqual(
      geometry!.viewportHeight,
    );
    expect(geometry!.frameTop - geometry!.headingBottom).toBeGreaterThanOrEqual(
      20,
    );
    expect(geometry!.pageWidth).toBeLessThanOrEqual(geometry!.viewportWidth);
  }
});

test("deixa a iluminação do canvas atravessar os volumes de vidro", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const material = await page.evaluate(() => {
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

    function alphaOf(color: string) {
      const channels = color.match(/[\d.]+/g)?.map(Number) ?? [];
      return channels.length === 4 ? channels[3] : 1;
    }

    function hasColoredEmission(value: string) {
      return colorsOf(value).some((color) => {
        if (color.alpha === 0) return false;
        const blue = color.blue > color.red + 40 && color.blue > color.green + 20;
        const purple = color.blue > color.green + 40 && color.red > color.green + 10;
        return blue || purple;
      });
    }

    const root = document.querySelector<HTMLElement>(
      '[data-landing-cinematic="true"]',
    );
    const primaryLight = document.querySelector<HTMLElement>(
      ".landing-cinematic-light--blue",
    );
    if (!root || !primaryLight) {
      throw new Error("Materiais cinematográficos não renderizados");
    }

    const selectors = [
      "[data-cinematic-plate]",
      '[data-landing-stage="tim"]',
      '[data-landing-stage="professions"]',
      '[data-landing-stage="pricing"]',
      '[data-landing-stage="faq"]',
      '[data-landing-stage="about"]',
      '[data-landing-stage="conversion"]',
      ".landing-prisma-panel-frame",
      "header.landing-cinematic-nav",
      ".landing-cinematic-mobile-cta",
    ];

    const surfaces = selectors.map((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Superfície ausente: ${selector}`);
      const style = getComputedStyle(element);
      const before = getComputedStyle(element, "::before");
      const after = getComputedStyle(element, "::after");
      const paint = [
        style.backgroundImage,
        style.boxShadow,
        before.backgroundImage,
        before.boxShadow,
        after.backgroundImage,
        after.boxShadow,
      ].join(" ");
      return {
        selector,
        alpha: alphaOf(style.backgroundColor),
        backdropFilter: style.backdropFilter,
        hasColoredEmission: hasColoredEmission(paint),
      };
    });

    return {
      ambientLayer: getComputedStyle(root, "::before").backgroundImage,
      lightCoverage:
        primaryLight.getBoundingClientRect().width / window.innerWidth,
      surfaces,
    };
  });

  expect(material.ambientLayer).not.toBe("none");
  expect(material.lightCoverage).toBeGreaterThan(1.1);
  expect(Math.max(...material.surfaces.map((surface) => surface.alpha))).toBeLessThanOrEqual(0.3);
  expect(material.surfaces.filter((surface) => surface.hasColoredEmission)).toEqual([]);
  expect(
    material.surfaces.filter((surface) => !surface.backdropFilter.includes("blur")),
  ).toEqual([]);
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
