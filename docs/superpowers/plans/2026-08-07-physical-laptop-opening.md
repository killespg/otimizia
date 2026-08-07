# Physical Laptop Opening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o notebook começar fisicamente fechado e abrir pela dobradiça conforme o scroll revela a seção `#painel`.

**Architecture:** `LaptopOpeningScreen` continua sendo o único controlador de movimento. A figura cria uma cena sticky com a altura natural do hardware e uma cauda de `45svh` que mede o curso do scroll; dentro dela, um trilho estático fornece perspectiva longa para a tampa animada, o print e a face externa grafite. O título da seção também fica sticky no espaço superior, e a tampa volta a um `div` sem transformação quando chega ao estado aberto.

**Tech Stack:** React 19, Next.js, Framer Motion, CSS, Playwright.

## Global Constraints

- A base do notebook deve permanecer parada durante todo o movimento.
- O estado fechado deve estar visível dentro da viewport quando o progresso da animação é zero.
- O título da seção deve permanecer visível acima da tampa fechada, sem um viewport vazio entre navegação e notebook.
- A tampa começa quase horizontal e termina vertical, acompanhando o progresso do scroll.
- A perspectiva não pode ampliar o plano além de 105% da largura da moldura.
- O exterior grafite com a logo OtimizIA deve aparecer no estado fechado e revelar o print durante a abertura.
- O estado aberto não pode manter `transform` ou `will-change: transform`.
- `prefers-reduced-motion` e SSR devem entregar o notebook aberto e estático.
- A página não pode ganhar rolagem horizontal em desktop ou mobile.

---

### Task 1: Tampa física guiada pelo scroll

**Files:**

- Modify: `test/e2e/landing-cinematic.spec.ts`
- Modify: `components/landing/laptop-opening-screen.tsx`
- Modify: `components/landing/dashboard-screenshot.tsx`
- Modify: `app/globals.css`

**Interfaces:**

- Consumes: `LaptopOpeningScreen({ children, caption }: { children: ReactNode; caption: string })` e o `Image` existente do painel.
- Produces: seletores `data-laptop-opening-screen`, `data-laptop-cover`, `data-laptop-hinge` e os estados fechado, intermediário e aberto vinculados ao scroll.

- [x] **Step 1: Escrever o teste E2E que exige uma tampa realmente fechada**

```ts
const cover = page.locator('[data-laptop-cover="true"]');
const hinge = page.locator('[data-laptop-hinge="true"]');

await expect(cover).toBeVisible();
await expect(hinge).toBeVisible();

const closed = await screen.evaluate((element) => ({
  layoutHeight: element.clientHeight,
  layoutWidth: element.clientWidth,
  renderedHeight: element.getBoundingClientRect().height,
  renderedWidth: element.getBoundingClientRect().width,
  transform: getComputedStyle(element).transform,
}));

expect(closed.transform).not.toBe("none");
expect(closed.transform).toContain("matrix3d");
expect(closed.renderedHeight).toBeLessThan(closed.layoutHeight * 0.2);
expect(closed.renderedWidth).toBeLessThanOrEqual(closed.layoutWidth * 1.05);
```

- [x] **Step 2: Rodar o teste e confirmar a falha correta**

Run: `$env:E2E_BASE_URL='http://localhost:3000'; npx.cmd playwright test test/e2e/landing-cinematic.spec.ts --grep "abre o notebook fisicamente"`

Expected: FAIL porque a animação atual usa matriz 2D e não possui `data-laptop-cover` nem `data-laptop-hinge`.

- [x] **Step 3: Implementar a tampa, a face externa e a dobradiça**

Em `LaptopOpeningScreen`, mapear o progresso para:

```ts
const rotateX = useTransform(scrollYProgress, [0, 0.45, 1], [-86, -54, 0]);
const scaleX = useTransform(scrollYProgress, [0, 0.55, 1], [0.88, 0.95, 1]);
const coverOpacity = useTransform(
  scrollYProgress,
  [0, 0.12, 0.34],
  [1, 0.72, 0],
);
```

Aplicar `rotateX` e `scaleX` na mesma tampa com `transformOrigin: "bottom center"`. A perspectiva deve existir somente no trilho pai. O elemento `data-laptop-frame` deve conter uma cena sticky com `padding-top` entre `92px` e `112px`, seguida por uma cauda real de `45svh`; um marcador absoluto de mesma altura mede o progresso sem depender da altura do hardware. Renderizar a face externa dentro da tampa, nunca como plano absoluto separado do notebook. `LaptopOpeningScreen` também passa a possuir a base e a dobradiça para manter todo o hardware dentro da mesma cena sticky.

- [x] **Step 4: Rodar o teste focado até ficar verde**

Run: `$env:E2E_BASE_URL='http://localhost:3000'; npx.cmd playwright test test/e2e/landing-cinematic.spec.ts --grep "abre o notebook fisicamente"`

Expected: PASS em `desktop-chromium` e `mobile-chromium`.

- [x] **Step 5: Validar a sequência visual e limitar a perspectiva**

No navegador local, capturar os estados fechado, intermediário e aberto. Confirmar que a base não se move, a tampa não atravessa o título, a largura renderizada fica em até 105% do layout e o estado aberto termina com `transform: none` e `will-change: auto`.

- [x] **Step 6: Rodar a regressão completa da landing**

Run: `$env:E2E_BASE_URL='http://localhost:3000'; npx.cmd playwright test test/e2e/landing-cinematic.spec.ts`

Run: `npm.cmd run typecheck`

Run: `npx.cmd eslint components/landing/dashboard-screenshot.tsx components/landing/laptop-opening-screen.tsx test/e2e/landing-cinematic.spec.ts`

Expected: todos os comandos encerram com código 0.

- [x] **Step 7: Commit da implementação**

```powershell
git add -- app/globals.css components/landing/dashboard-screenshot.tsx components/landing/laptop-opening-screen.tsx test/e2e/landing-cinematic.spec.ts
git commit -m "feat(landing): abre notebook fisicamente no scroll"
```
