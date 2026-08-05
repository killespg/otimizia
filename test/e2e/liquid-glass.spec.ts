import { expect, test, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const hasAuthenticatedFixture = Boolean(email && password);

async function signIn(page: Page) {
  type AuthCookie = {
    name: string;
    value: string;
    options?: {
      httpOnly?: boolean;
      sameSite?: "lax" | "strict" | "none";
      secure?: boolean;
    };
  };

  let authCookies: AuthCookie[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: (cookies: AuthCookie[]) => {
          authCookies = cookies;
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: email!,
    password: password!,
  });
  expect(error).toBeNull();

  await page.goto("/login");
  const origin = new URL(page.url()).origin;
  await page.context().addCookies(
    authCookies.map(({ name, value, options }) => ({
      name,
      value,
      url: origin,
      httpOnly: options?.httpOnly,
      secure: options?.secure,
      sameSite:
        options?.sameSite === "strict"
          ? ("Strict" as const)
          : options?.sameSite === "none"
            ? ("None" as const)
            : ("Lax" as const),
    })),
  );

  await page.goto("/painel");
  return new URL(page.url()).pathname.startsWith("/painel");
}

test("oculta os botões nativos da scrollbar no Chromium", async ({ page }) => {
  await page.goto("/login");
  const scrollbar = await page.evaluate(() => {
    const scroller = document.createElement("div");
    scroller.className = "liquid-glass-scrollbar";
    scroller.style.cssText = "height:80px;width:120px;overflow-y:scroll";
    scroller.innerHTML = '<div style="height:320px">Conteúdo rolável</div>';
    document.body.append(scroller);

    const style = getComputedStyle(scroller);
    const buttonStyle = getComputedStyle(scroller, "::-webkit-scrollbar-button");
    return {
      standardWidth: style.scrollbarWidth,
      buttonDisplay: buttonStyle.display,
      buttonHeight: buttonStyle.height,
    };
  });

  expect(scrollbar.standardWidth).toBe("auto");
  expect(scrollbar.buttonDisplay).toBe("none");
  expect(scrollbar.buttonHeight).toBe("0px");
});

test("mantém o vidro funcional separado do material de conteúdo", async ({
  page,
}) => {
  await page.goto("/login");
  const materials = await page.evaluate(() => {
    const mount = document.createElement("div");
    mount.innerHTML = `
      <section data-material="content" class="panel">Conteúdo</section>
      <section data-material="contentMuted" class="panel-soft">Conteúdo secundário</section>
      <button data-material="control" class="liquid-glass-control">Controle</button>
      <aside data-material="chrome" class="od-chrome">Navegação</aside>
    `;
    document.body.append(mount);

    return Object.fromEntries(
      Array.from(mount.querySelectorAll<HTMLElement>("[data-material]")).map(
        (element) => {
          const style = getComputedStyle(element);
          return [
            element.dataset.material,
            {
              backdropFilter: style.backdropFilter,
              backgroundColor: style.backgroundColor,
              backgroundImage: style.backgroundImage,
              borderColor: style.borderColor,
              borderRadius: style.borderRadius,
              boxShadow: style.boxShadow,
            },
          ];
        },
      ),
    );
  });

  expect(materials.content.backdropFilter).toBe("none");
  expect(materials.content.backgroundImage).toBe("none");
  expect(materials.content.backgroundColor).toBe("rgba(54, 55, 68, 0.88)");
  expect(materials.content.borderColor).toBe("rgba(255, 255, 255, 0.13)");
  expect(materials.content.borderRadius).toBe("16px");
  expect(materials.content.boxShadow).toBe("none");
  expect(materials.contentMuted.backgroundColor).toBe(
    "rgba(47, 49, 62, 0.86)",
  );
  expect(materials.control.backdropFilter).not.toBe("none");
  expect(materials.chrome.backdropFilter).not.toBe("none");
});

test("sidebar neutraliza o azul do canvas sem perder o vidro claro", async ({
  page,
}) => {
  await page.goto("/login");
  const materials = await page.evaluate(() => {
    const mount = document.createElement("div");
    mount.innerHTML = `
      <button data-material="control" class="liquid-glass-control">Personalizar painel</button>
      <aside data-material="sidebar" class="od-chrome product-nav-glass-shell">Navegação</aside>
    `;
    document.body.append(mount);

    const readMaterial = (selector: string) => {
      const element = mount.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Material ausente: ${selector}`);
      const style = getComputedStyle(element);
      return {
        backdropFilter: style.backdropFilter,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderColor: style.borderColor,
        borderTopColor: style.borderTopColor,
        borderRightColor: style.borderRightColor,
        borderBottomColor: style.borderBottomColor,
        borderLeftColor: style.borderLeftColor,
        boxShadow: style.boxShadow,
        beforeDisplay: getComputedStyle(element, "::before").display,
        afterDisplay: getComputedStyle(element, "::after").display,
        afterBackgroundImage: getComputedStyle(element, "::after").backgroundImage,
        afterOpacity: getComputedStyle(element, "::after").opacity,
      };
    };

    return {
      control: readMaterial('[data-material="control"]'),
      sidebar: readMaterial('[data-material="sidebar"]'),
    };
  });

  expect(materials.control.backgroundColor).toBe(
    "rgba(255, 255, 255, 0.075)",
  );
  expect(materials.sidebar.backgroundColor).toBe("rgba(32, 27, 32, 0.1)");
  expect(materials.sidebar.backgroundImage).toContain("linear-gradient");
  expect(materials.sidebar.backgroundColor).not.toBe(materials.control.backgroundColor);
  expect(materials.sidebar.backdropFilter).toContain("saturate");
  expect(materials.sidebar.borderTopColor).toBe("rgba(255, 255, 255, 0.16)");
  expect(materials.sidebar.borderLeftColor).toBe("rgba(255, 255, 255, 0.18)");
  expect(materials.sidebar.borderRightColor).toBe("rgba(255, 255, 255, 0.09)");
  expect(materials.sidebar.borderBottomColor).toBe("rgba(255, 255, 255, 0.1)");
  expect(materials.sidebar.backdropFilter).not.toBe("none");
  expect(materials.sidebar.backdropFilter).not.toBe(materials.control.backdropFilter);
  expect(materials.sidebar.boxShadow).not.toBe(materials.control.boxShadow);
  expect(materials.sidebar.boxShadow).toContain("1px 0px 0px");
  expect(materials.sidebar.boxShadow).toContain("0px -1px 0px");
  expect(materials.sidebar.beforeDisplay).toBe("none");
  expect(materials.sidebar.afterDisplay).toBe("block");
  expect(materials.sidebar.afterBackgroundImage).toContain(
    "rgba(255, 255, 255, 0.26)",
  );
  expect(materials.sidebar.afterBackgroundImage).toContain("radial-gradient");
  const reflectionChannels = Array.from(
    materials.sidebar.afterBackgroundImage.matchAll(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)/g,
    ),
    ([, red, green, blue]) => [red, green, blue],
  );
  expect(reflectionChannels.length).toBeGreaterThan(0);
  for (const [red, green, blue] of reflectionChannels) {
    expect(red).toBe(green);
    expect(green).toBe(blue);
  }
  expect(materials.sidebar.afterOpacity).toBe("0.72");
});

test("cards de estatísticas usam vidro grafite em vez de absorver o azul", async ({
  page,
}) => {
  await page.goto("/login");
  const materials = await page.evaluate(() => {
    const mount = document.createElement("div");
    mount.innerHTML = `
      <section data-material="metrics" class="glass real-estate-metrics-glass">
        <a data-material="metric" class="real-estate-metric-card">Imóveis ativos</a>
      </section>
    `;
    document.body.append(mount);

    const metrics = mount.querySelector<HTMLElement>('[data-material="metrics"]');
    const metric = mount.querySelector<HTMLElement>('[data-material="metric"]');
    if (!metrics || !metric) throw new Error("Materiais de métricas ausentes");

    return {
      metricsBackground: getComputedStyle(metrics).backgroundColor,
      metricsOverlay: getComputedStyle(metrics, "::after").backgroundImage,
      metricsBackdrop: getComputedStyle(metrics).backdropFilter,
      metricBackground: getComputedStyle(metric).backgroundColor,
    };
  });

  expect(materials.metricsBackground).toBe("rgba(32, 27, 32, 0.08)");
  expect(materials.metricsOverlay).toContain("linear-gradient");
  expect(materials.metricsBackdrop).toContain("saturate");
  expect(materials.metricBackground).toBe("rgba(34, 29, 35, 0.07)");
});

test("usa a paisagem azul bilateral aprovada no canvas do produto", async ({
  page,
}) => {
  await page.goto("/login");
  const landscape = await page.evaluate(async () => {
    const workspace = document.createElement("section");
    workspace.className = "product-workspace";
    document.body.append(workspace);
    const backgroundImage = getComputedStyle(workspace).backgroundImage;

    // A paisagem é servida em duas resoluções (desktop e uma reamostrada para
    // celular), então o teste verifica o arquivo que o CSS realmente resolveu
    // neste viewport em vez de assumir um caminho fixo.
    const resolved = backgroundImage.match(
      /url\("?([^")]*dashboard-landscape[^")]*)"?\)/,
    );
    if (!resolved) throw new Error(`Paisagem ausente em: ${backgroundImage}`);

    const response = await fetch(resolved[1]);
    if (!response.ok) {
      return {
        backgroundImage,
        status: response.status,
        width: 0,
        height: 0,
        left: { red: 0, green: 0, blue: 0 },
        right: { red: 0, green: 0, blue: 0 },
        centerLuminance: 255,
      };
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.src = url;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 108;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas 2D indisponível");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const averageRegion = (startX: number, endX: number) => {
      const region = context.getImageData(
        startX,
        0,
        endX - startX,
        canvas.height,
      ).data;
      let red = 0;
      let green = 0;
      let blue = 0;
      let count = 0;
      for (let index = 0; index < region.length; index += 16) {
        red += region[index];
        green += region[index + 1];
        blue += region[index + 2];
        count += 1;
      }
      return { red: red / count, green: green / count, blue: blue / count };
    };

    const left = averageRegion(0, 38);
    const center = averageRegion(67, 125);
    const right = averageRegion(154, 192);
    return {
      backgroundImage,
      status: response.status,
      width: image.naturalWidth,
      height: image.naturalHeight,
      left,
      right,
      centerLuminance:
        center.red * 0.2126 + center.green * 0.7152 + center.blue * 0.0722,
    };
  });

  const isMobileLandscape =
    landscape.backgroundImage.includes("dashboard-landscape-mobile");

  expect(landscape.backgroundImage).toContain("dashboard-landscape");
  expect(landscape.backgroundImage).toContain(".webp");
  expect(landscape.backgroundImage).toContain("rgba(9, 10, 14, 0.56)");
  expect(landscape.status).toBe(200);
  // O master continua em 16:9 alto; a variante de celular carrega a mesma
  // composição reamostrada, então só o piso de resolução muda.
  expect(landscape.width).toBeGreaterThanOrEqual(isMobileLandscape ? 880 : 1600);
  expect(landscape.height).toBeGreaterThanOrEqual(isMobileLandscape ? 495 : 900);
  expect(landscape.width / landscape.height).toBeCloseTo(16 / 9, 1);
  expect(landscape.left.blue - landscape.left.red).toBeGreaterThan(20);
  expect(landscape.right.blue - landscape.right.red).toBeGreaterThan(20);
  expect(landscape.centerLuminance).toBeLessThan(80);
});

test("honra transparência reduzida e contraste aumentado em todos os aliases", async ({
  context,
  page,
}) => {
  await page.goto("/login");
  await page.evaluate(() => {
    const aliases = [
      "glass",
      "glass-soft",
      "assistant-sheet",
      "voice-panel",
      "dashboard-customize-panel",
      "mobile-create-menu",
      "od-chrome",
      "od-chrome product-nav-glass-shell",
    ];
    const mount = document.createElement("div");
    mount.innerHTML = aliases
      .map((className) => `<section data-glass-alias="${className}" class="${className}">${className}</section>`)
      .join("");
    document.body.append(mount);
  });

  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
  });

  await expect
    .poll(() =>
      page
        .locator('[data-glass-alias="od-chrome product-nav-glass-shell"]')
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .toBe("rgba(28, 26, 35, 0.96)");

  const reducedTransparency = await page
    .locator("[data-glass-alias]")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        alias: element.getAttribute("data-glass-alias"),
        backdropFilter: getComputedStyle(element).backdropFilter,
        backgroundColor: getComputedStyle(element).backgroundColor,
        beforeDisplay: getComputedStyle(element, "::before").display,
        afterDisplay: getComputedStyle(element, "::after").display,
      })),
    );
  for (const material of reducedTransparency) {
    expect(material.backdropFilter, material.alias ?? undefined).toBe("none");
    expect(material.backgroundColor, material.alias ?? undefined).toBe("rgba(28, 26, 35, 0.96)");
    expect(material.beforeDisplay, material.alias ?? undefined).toBe("none");
    expect(material.afterDisplay, material.alias ?? undefined).toBe("none");
  }

  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-contrast", value: "more" }],
  });
  await expect
    .poll(() =>
      page
        .locator('[data-glass-alias="od-chrome product-nav-glass-shell"]')
        .evaluate((element) => getComputedStyle(element).borderTopColor),
    )
    .toBe("rgba(255, 255, 255, 0.72)");
  const contrastBorders = await page
    .locator("[data-glass-alias]")
    .evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).borderTopColor),
    );
  expect(new Set(contrastBorders)).toEqual(
    new Set(["rgba(255, 255, 255, 0.72)"]),
  );
  const sidebarReflectionOpacity = await page
    .locator('[data-glass-alias="od-chrome product-nav-glass-shell"]')
    .evaluate((element) => getComputedStyle(element, "::after").opacity);
  expect(sidebarReflectionOpacity).toBe("0.42");
});

test.describe("Apple Liquid Glass no shell autenticado", () => {
  test.skip(
    !hasAuthenticatedFixture,
    "Defina E2E_EMAIL e E2E_PASSWORD para validar o shell autenticado.",
  );

  test("separa o vidro funcional do material de conteúdo no desktop", async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("desktop"));
    const fixtureCanOpenDashboard = await signIn(page);
    test.skip(
      !fixtureCanOpenDashboard,
      "A fixture autenticada precisa concluir o onboarding antes de validar o painel.",
    );

    await page.goto("/painel", { waitUntil: "networkidle" });

    const shell = page.locator("[data-liquid-glass-shell]");
    await expect(shell).toHaveCount(1);
    await expect(shell).toBeVisible();
    await expect(shell).toHaveAttribute("data-product-nav-expanded", "true");
    await expect(shell.locator("aside")).toHaveCount(1);

    const shellMaterial = await shell.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        backdropFilter: style.backdropFilter,
        left: rect.left,
        top: rect.top,
        bottomGap: window.innerHeight - rect.bottom,
      };
    });
    expect(shellMaterial.backdropFilter).not.toBe("none");
    expect(shellMaterial.left).toBeGreaterThanOrEqual(8);
    expect(shellMaterial.top).toBeGreaterThanOrEqual(8);
    expect(shellMaterial.bottomGap).toBeGreaterThanOrEqual(8);

    await expect(page.locator("[data-liquid-glass-search]")).toBeVisible();
    await expect(page.locator("[data-liquid-glass-actions]")).toBeVisible();

    const panel = page.locator("main .panel").first();
    await expect(panel).toBeVisible();
    const contentMaterial = await panel.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backdropFilter: style.backdropFilter,
        backgroundColor: style.backgroundColor,
      };
    });
    expect(contentMaterial.backdropFilter).toBe("none");
    const alpha = Number(
      contentMaterial.backgroundColor.match(/rgba?\([^/]*[, ]\s*([\d.]+)\s*\)$/)?.[1] ??
        "1",
    );
    expect(alpha).toBeGreaterThanOrEqual(0.7);

    const detail = page.getByRole("complementary", {
      name: /Detalhes da navegação/i,
    });
    await expect(detail).toBeVisible();
    await expect(page.getByRole("button", { name: "Ocultar detalhes" })).toHaveCount(0);
    const resizer = page.getByRole("separator", { name: "Redimensionar menu lateral" });
    await expect(resizer).toBeVisible();
    await resizer.focus();
    await resizer.press("Home");
    const resizerBox = await resizer.boundingBox();
    expect(resizerBox).not.toBeNull();
    if (resizerBox) {
      await page.mouse.move(resizerBox.x + resizerBox.width - 2, resizerBox.y + 24);
      await page.mouse.down();
      await page.mouse.move(resizerBox.x + resizerBox.width + 62, resizerBox.y + 24);
      await page.mouse.up();
      expect((await shell.boundingBox())?.width ?? 0).toBeCloseTo(320, 0);
    }
    await resizer.press("End");
    expect((await shell.boundingBox())?.width ?? 0).toBeCloseTo(360, 0);
    await resizer.press("Home");
    expect((await shell.boundingBox())?.width ?? 0).toBeCloseTo(256, 0);
    await resizer.press("ArrowRight");
    expect((await shell.boundingBox())?.width ?? 0).toBeCloseTo(272, 0);
    await resizer.dblclick();
    expect((await shell.boundingBox())?.width ?? 0).toBeCloseTo(288, 0);
    expect(await detail.locator("nav section").count()).toBeGreaterThan(0);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasOverflow).toBe(false);
  });

  test("usa um dock de vidro com sheet irmão e devolve o foco no mobile", async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("mobile"));
    const fixtureCanOpenDashboard = await signIn(page);
    test.skip(
      !fixtureCanOpenDashboard,
      "A fixture autenticada precisa concluir o onboarding antes de validar o painel.",
    );

    await page.goto("/painel", { waitUntil: "networkidle" });
    await expect(page.locator("[data-liquid-glass-shell]")).toHaveCount(0);

    const dock = page.locator("[data-mobile-nav]");
    await expect(dock).toBeVisible();
    const dockMaterial = await dock.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        backdropFilter: style.backdropFilter,
        left: rect.left,
        rightGap: window.innerWidth - rect.right,
        bottomGap: window.innerHeight - rect.bottom,
      };
    });
    expect(dockMaterial.backdropFilter).not.toBe("none");
    expect(dockMaterial.left).toBeGreaterThanOrEqual(8);
    expect(dockMaterial.rightGap).toBeGreaterThanOrEqual(8);
    expect(dockMaterial.bottomGap).toBeGreaterThanOrEqual(8);

    const menuButton = dock.getByRole("button", { name: "Mais" });
    await menuButton.click();
    const sheet = page.getByRole("dialog", { name: "Todas as áreas" });
    await expect(sheet).toBeVisible();
    expect(await sheet.evaluate((element) => element.classList.contains("glass"))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(menuButton).toBeFocused();

    await menuButton.click();
    await expect(sheet).toBeVisible();
    await page.getByRole("button", { name: "Fechar menu" }).click();
    await expect(sheet).toHaveCount(0);
    await expect(menuButton).toBeFocused();

    const smallTargets = await dock
      .locator("a, button")
      .evaluateAll((elements) =>
        elements
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          })
          .filter(({ width, height }) => width < 44 || height < 44),
      );
    expect(smallTargets).toEqual([]);
  });

  test("cabeçalho personalizado abre o resumo da operação no mobile", async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("mobile"));
    const fixtureCanOpenDashboard = await signIn(page);
    test.skip(
      !fixtureCanOpenDashboard,
      "A fixture autenticada precisa concluir o onboarding antes de validar o painel.",
    );

    await page.goto("/painel/imoveis/dashboard", { waitUntil: "networkidle" });
    const header = page.locator('[data-dashboard-profile-header="true"]');
    test.skip(
      (await header.count()) === 0,
      "A fixture autenticada precisa pertencer ao workspace imobiliário.",
    );

    await expect(header).toBeVisible();
    await expect(header.getByText("Acione o Tim na sua operação")).toBeVisible();

    const actionTargets = header.locator(
      '[data-dashboard-notification-trigger="true"], a[aria-label="Cadastrar novo imóvel"]',
    );
    await expect(actionTargets).toHaveCount(2);
    const smallActionTargets = await actionTargets.evaluateAll((elements) =>
      elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        })
        .filter(({ width, height }) => width < 44 || height < 44),
    );
    expect(smallActionTargets).toEqual([]);

    const trigger = header.getByRole("button", { name: "Ver resumo da operação" });
    await trigger.click();
    const summary = page.getByRole("dialog", { name: "Resumo da operação" });
    await expect(summary).toBeVisible();
    await expect(summary.getByText("Agora na operação")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(summary).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(summary).toBeVisible();
    await page.locator('[data-liquid-metric-rail="true"]').click({ position: { x: 4, y: 4 } });
    await expect(summary).toHaveCount(0);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasOverflow).toBe(false);
  });
});
