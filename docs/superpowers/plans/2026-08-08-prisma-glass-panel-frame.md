# Prisma Glass Panel Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover completamente o notebook da seção `#painel` e apresentar o print real em uma moldura Prisma Glass estática, nítida e responsiva.

**Architecture:** `DashboardScreenshot` passa a ser uma figura autônoma com moldura de vidro, viewport rolável e legenda acessível. `LaptopOpeningScreen` e todo o estado de scroll/3D são eliminados; o título e o painel voltam ao fluxo normal do documento. A regressão E2E mede ausência do notebook, geometria entre título e moldura, nitidez e overflow em `390x844` e `660x694`.

**Tech Stack:** React 19, Next.js 16, TypeScript, CSS, Playwright, Vitest.

## Global Constraints

- O print continua sendo `/landing/painel-imobiliario-mariana.png`, servido com `unoptimized`.
- Nenhum elemento pode sugerir notebook, tablet, monitor ou janela de navegador.
- Não usar `scale`, `rotate`, `translate`, `matrix3d`, scroll-scrub ou cena sticky no frame ou no print.
- O topo da moldura deve ficar pelo menos `20px` abaixo do fim do título em `390x844` e `660x694`.
- O azul da logo é a luz dominante; violeta aparece apenas como apoio.
- O mobile pode rolar o print horizontalmente sem criar overflow na página.
- A geometria SSR, sem JavaScript e com movimento reduzido deve ser igual à versão hidratada.
- A alteração fica restrita a `components/landing`; não promover a experiência para `components/design-system`.

---

## File structure

- `components/landing/dashboard-screenshot.tsx`: passa a possuir toda a estrutura semântica da Prisma Glass e o print real.
- `components/landing/laptop-opening-screen.tsx`: removido, pois não terá consumidores.
- `components/landing/container-scroll-animation.tsx`: mantém a composição título + palco, mas remove comentários e classes que descrevem sticky/3D.
- `app/globals.css`: remove o hardware antigo e define somente a moldura, o brilho e o viewport responsivo.
- `test/e2e/landing-cinematic.spec.ts`: substitui os contratos do notebook pelos contratos Prisma Glass e pelos dois viewports de regressão.
- `docs/superpowers/specs/2026-08-07-cinematic-liquid-glass-landing-design.md`: atualiza a descrição vigente da seção de produto.
- `docs/superpowers/plans/2026-08-07-physical-laptop-opening.md`: recebe aviso de que o plano foi substituído.

---

### Task 1: Substituir o notebook pela Prisma Glass

**Files:**

- Modify: `test/e2e/landing-cinematic.spec.ts:79-443`
- Modify: `components/landing/dashboard-screenshot.tsx:1-39`
- Delete: `components/landing/laptop-opening-screen.tsx`
- Modify: `components/landing/container-scroll-animation.tsx:1-50`
- Modify: `app/globals.css:1657-1827, 1906-1909, 1960-1963`

**Interfaces:**

- Consumes: `DashboardScreenshot(): JSX.Element` e o asset `/landing/painel-imobiliario-mariana.png`.
- Produces: seletores `data-prisma-panel-frame`, `data-dashboard-screenshot-viewport` e `data-dashboard-screenshot`; remove todos os seletores `data-laptop-*`.

- [ ] **Step 1: Substituir os testes do notebook por contratos Prisma Glass**

Remover os testes “abre o notebook fisicamente”, “mantém o painel e a dobradiça fixos”, “mantém o notebook aberto” e “enquadra o print em uma moldura reconhecível de notebook”. Manter os testes do asset original, iluminação e no-JS. Adicionar:

```ts
test("substitui o notebook pela moldura Prisma Glass estática", async ({
  page,
}) => {
  await page.goto("/#painel", { waitUntil: "networkidle" });

  const frame = page.locator('[data-prisma-panel-frame="true"]');
  const screenshot = frame.locator('[data-dashboard-screenshot="true"]');

  await expect(frame).toBeVisible();
  await expect(screenshot).toBeVisible();
  await expect(page.locator('[data-laptop-frame="true"]')).toHaveCount(0);
  await expect(page.locator('[data-laptop-hardware="true"]')).toHaveCount(0);
  await expect(page.locator('[data-laptop-cover="true"]')).toHaveCount(0);
  await expect(page.locator('[data-laptop-base="true"]')).toHaveCount(0);
  await expect(page.locator('[data-laptop-hinge="true"]')).toHaveCount(0);

  const rendering = await Promise.all(
    [frame, screenshot].map((locator) =>
      locator.evaluate((element) => ({
        transform: getComputedStyle(element).transform,
        willChange: getComputedStyle(element).willChange,
      })),
    ),
  );

  expect(rendering).toEqual([
    { transform: "none", willChange: "auto" },
    { transform: "none", willChange: "auto" },
  ]);
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
    } else {
      expect(
        geometry!.panelScrollWidth - geometry!.panelClientWidth,
      ).toBeLessThanOrEqual(1);
    }
  }
});
```

- [ ] **Step 2: Rodar os testes e confirmar a falha correta**

Run:

```powershell
$env:E2E_BASE_URL='http://localhost:3000'
npx --no-install playwright test test/e2e/landing-cinematic.spec.ts --grep "Prisma Glass"
```

Expected: FAIL porque `data-prisma-panel-frame` não existe e os seletores `data-laptop-*` ainda estão presentes.

- [ ] **Step 3: Tornar `DashboardScreenshot` uma figura Prisma Glass**

Substituir o conteúdo de `components/landing/dashboard-screenshot.tsx` por:

```tsx
import Image from "next/image";

const ALT_TEXT =
  "Painel imobiliário da OtimizIA com carteira, visitas, vitrines e comissões";

export function DashboardScreenshot() {
  return (
    <figure
      data-prisma-panel-frame="true"
      className="landing-prisma-panel-frame"
    >
      <div
        data-dashboard-screenshot-viewport="true"
        className="landing-prisma-panel-viewport"
        aria-label="Prévia navegável do painel OtimizIA"
        tabIndex={0}
      >
        <Image
          data-dashboard-screenshot="true"
          src="/landing/painel-imobiliario-mariana.png"
          width={1894}
          height={886}
          alt={ALT_TEXT}
          unoptimized
          className="landing-prisma-panel-image"
        />
      </div>

      <span
        aria-hidden="true"
        className="landing-prisma-panel-drag-hint sm:hidden"
      >
        Arraste para explorar
      </span>

      <figcaption className="sr-only">
        Visão real do painel usado por uma corretora de imóveis na OtimizIA.
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 4: Remover o controlador de notebook e normalizar o contêiner**

Excluir `components/landing/laptop-opening-screen.tsx`. Em `container-scroll-animation.tsx`, manter a interface pública, mas substituir o comentário por:

```ts
/**
 * Mantém o título e a prova real do produto no mesmo capítulo da landing.
 * A geometria permanece no fluxo normal para o título nunca disputar espaço
 * com a moldura do produto.
 */
```

Remover `landing-panel-heading` do `className` do título e usar:

```tsx
className="relative z-[1] mx-auto max-w-[720px] text-center"
```

No wrapper externo que contém título e palco, manter o único `id="painel"` e usar `scroll-mt-[calc(6rem+env(safe-area-inset-top))]`. No palco, trocar a margem por `mt-8 sm:mt-10 lg:mt-12`, preservando `data-landing-stage="panel"` e larguras máximas; o palco não recebe `id` nem `scroll-mt`.

- [ ] **Step 5: Substituir o CSS do hardware pela moldura de vidro**

Remover `.landing-panel-heading` e todas as regras `.landing-laptop-*`. Adicionar no mesmo bloco da landing:

```css
.landing-prisma-panel-frame {
  position: relative;
  width: calc(100% - clamp(12px, 2vw, 24px));
  margin-inline: auto;
  padding: clamp(6px, 0.8vw, 10px);
  overflow: hidden;
  border: 1px solid rgb(var(--landing-logo-blue) / 0.52);
  border-radius: clamp(18px, 2vw, 22px);
  background:
    linear-gradient(145deg, rgb(var(--landing-logo-blue) / 0.2), rgba(47, 67, 124, 0.08)),
    rgba(5, 11, 26, 0.52);
  box-shadow:
    0 28px 80px rgb(var(--landing-logo-blue) / 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
  backdrop-filter: blur(18px) saturate(135%);
}

.landing-prisma-panel-frame::before {
  content: "";
  position: absolute;
  z-index: 2;
  top: -1px;
  right: 15%;
  left: 15%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgb(var(--landing-logo-blue) / 0.94),
    rgb(var(--landing-logo-purple) / 0.72),
    transparent
  );
  filter: blur(1px);
  pointer-events: none;
}

.landing-prisma-panel-viewport {
  position: relative;
  overflow: hidden;
  border-radius: calc(clamp(18px, 2vw, 22px) - 7px);
  outline: 1px solid rgba(145, 169, 255, 0.14);
  outline-offset: -1px;
  background: #030817;
  scrollbar-color: rgba(145, 169, 255, 0.55) transparent;
  scrollbar-width: thin;
}

.landing-prisma-panel-image {
  display: block;
  width: 100%;
  height: auto;
  max-width: none;
}

.landing-prisma-panel-drag-hint {
  position: absolute;
  bottom: 18px;
  left: 50%;
  z-index: 3;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.76);
  background: rgba(7, 17, 38, 0.8);
  font-size: 11px;
  font-weight: 600;
  transform: translateX(-50%);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  pointer-events: none;
}

@media (max-width: 639px) {
  .landing-prisma-panel-viewport {
    height: clamp(220px, 46vw, 310px);
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
  }

  .landing-prisma-panel-image {
    width: 780px;
  }
}
```

O `translateX(-50%)` permitido no hint não afeta o frame nem o print e não é vinculado ao scroll.

- [ ] **Step 6: Rodar os testes focados até ficarem verdes**

Run:

```powershell
$env:E2E_BASE_URL='http://localhost:3000'
npx --no-install playwright test test/e2e/landing-cinematic.spec.ts --grep "Prisma Glass"
```

Expected: PASS no teste estrutural e no teste mobile de `390x844`/`660x694`.

- [ ] **Step 7: Rodar a regressão da landing**

Run:

```powershell
$env:E2E_BASE_URL='http://localhost:3000'
npx --no-install playwright test test/e2e/landing-cinematic.spec.ts test/e2e/landing-responsive.spec.ts test/e2e/landing-no-js.spec.ts
npm run typecheck
npx --no-install eslint components/landing/dashboard-screenshot.tsx components/landing/container-scroll-animation.tsx test/e2e/landing-cinematic.spec.ts
npm test
git diff --check
```

Expected: todos os comandos encerram com código `0`; os únicos skips são os cenários deliberadamente restritos ao outro projeto de viewport.

- [ ] **Step 8: Commit da implementação**

```powershell
git add -- app/globals.css components/landing/dashboard-screenshot.tsx components/landing/container-scroll-animation.tsx components/landing/laptop-opening-screen.tsx test/e2e/landing-cinematic.spec.ts
git commit -m "feat(landing): troca notebook por prisma glass"
```

---

### Task 2: Alinhar documentação e validar visualmente

**Files:**

- Modify: `docs/superpowers/specs/2026-08-07-cinematic-liquid-glass-landing-design.md:48-63`
- Modify: `docs/superpowers/plans/2026-08-07-physical-laptop-opening.md:1-12`

**Interfaces:**

- Consumes: implementação validada de `data-prisma-panel-frame`.
- Produces: documentação vigente sem instruções conflitantes sobre notebook ou 3D.

- [ ] **Step 1: Atualizar o design cinematográfico vigente**

Substituir os bullets do notebook por um bloco que registre:

```markdown
- O print real ocupa uma moldura Prisma Glass panorâmica, sem imitar notebook, tablet, monitor ou navegador.
- A moldura usa azul da logo como luz dominante e violeta apenas no brilho secundário da borda.
- Título, moldura e print permanecem no fluxo normal, sem sticky, scroll-scrub, perspectiva ou transformação 3D.
- Em mobile, somente o viewport interno do print pode rolar horizontalmente; a página nunca ganha overflow.
```

- [ ] **Step 2: Marcar o plano físico como substituído**

Depois do título de `2026-08-07-physical-laptop-opening.md`, adicionar:

```markdown
> **Superseded on 2026-08-08:** A direção de notebook foi removida após validação visual do usuário. A implementação vigente está em `2026-08-08-prisma-glass-panel-frame.md`.
```

- [ ] **Step 3: Validar a página real no servidor local**

No navegador local, conferir em `http://localhost:3000/#painel`:

- `390x844`: título inteiro, gap mínimo de `20px`, frame sem corte lateral e viewport interno rolável;
- `660x694`: título e frame sem sobreposição, print ajustado à largura;
- desktop: print integral, borda superior azul/roxa e ausência completa de hardware;
- console: nenhum erro novo.

- [ ] **Step 4: Commit da documentação**

```powershell
git add -- docs/superpowers/specs/2026-08-07-cinematic-liquid-glass-landing-design.md docs/superpowers/plans/2026-08-07-physical-laptop-opening.md
git commit -m "docs(landing): substitui direção de notebook"
```

- [ ] **Step 5: Registrar a sessão no Obsidian**

Run from the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/obsidian-log.ps1 `
  -Mode session `
  -Actor Codex `
  -Summary "Substituída a moldura de notebook pela Prisma Glass estática na landing." `
  -Tests "Playwright landing, typecheck, ESLint, Vitest e validação visual local." `
  -Files "components/landing/dashboard-screenshot.tsx; app/globals.css; test/e2e/landing-cinematic.spec.ts" `
  -Decisions "Sem hardware, sticky ou 3D; print estático em vidro panorâmico." `
  -Risks "Registrar apenas verificações realmente concluídas."
```

Expected: `recorded session:<id>`.
