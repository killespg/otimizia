# Physical Laptop Opening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o notebook parecer fechado e abrir pela dobradiça conforme o scroll revela a seção `#painel`, sem deslocar ou rasterizar o print.

**Architecture:** `LaptopOpeningScreen` continua sendo o único controlador de movimento. A figura cria uma cena sticky de `100svh`, um marcador de `45svh` que mede a abertura e uma cauda de `64svh` que mantém o estado aberto ancorado antes da saída. O hardware é posicionado de forma absoluta dentro desse palco, com a base em uma coordenada responsiva da viewport; um segundo progresso de entrada mantém o hardware invisível até o palco chegar ao ponto sticky. O print e sua moldura ficam em um plano estático, sem transformação. Uma tampa grafite separada, sempre à frente do print, gira em `rotateX`, cresce discretamente em largura e desaparece ao concluir a abertura. A âncora `#painel` pertence ao palco e nem o contêiner do hardware nem o print recebem transformação.

**Tech Stack:** React 19, Next.js, Framer Motion, CSS, Playwright.

## Global Constraints

- A base, o print e sua moldura devem permanecer parados durante todo o movimento.
- O contêiner do hardware e o painel não podem receber `transform`; somente a tampa grafite gira e muda discretamente de largura.
- O estado aberto precisa permanecer ancorado por pelo menos `8svh` antes de o notebook sair da seção.
- Em viewport compacta, topo, base, altura e largura do painel não podem variar entre o primeiro quadro fechado visível e o quadro intermediário da abertura.
- Antes de o palco sticky travar, a opacidade do hardware deve permanecer abaixo de `0.05`; ao travar, deve superar `0.95` antes da tampa abrir.
- O estado fechado deve estar visível dentro da viewport quando o progresso da animação é zero.
- O título da seção deve permanecer visível acima da tampa fechada, sem um viewport vazio entre navegação e notebook.
- A tampa começa quase horizontal e termina vertical, acompanhando o progresso do scroll.
- A perspectiva não pode ampliar o plano além de 105% da largura da moldura.
- O exterior grafite com a logo OtimizIA deve aparecer no estado fechado e revelar o print durante a abertura.
- O painel não pode manter `transform` ou `will-change: transform` em nenhum estado; a tampa animada é removida ao terminar a abertura.
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
const closedCover = await cover.evaluate((element) => ({
  layoutHeight: element.clientHeight,
  renderedHeight: element.getBoundingClientRect().height,
  transform: getComputedStyle(element).transform,
}));

expect(closed.transform).toBe("none");
expect(closed.renderedHeight).toBeCloseTo(closed.layoutHeight);
expect(closed.renderedWidth).toBeCloseTo(closed.layoutWidth);
expect(closedCover.transform).toContain("matrix3d");
expect(closedCover.renderedHeight).toBeLessThan(closedCover.layoutHeight * 0.2);
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
  [0, 0.62, 0.92, 1],
  [1, 1, 0.55, 0],
);
const panelOpacity = useTransform(scrollYProgress, [0, 0.08, 0.5], [0, 0, 1]);
```

Aplicar `rotateX` e `scaleX` somente em `data-laptop-cover`, com `transformOrigin: "bottom center"`. A perspectiva deve existir somente no trilho pai. O painel permanece como irmão estático da tampa e recebe apenas opacidade, nunca transformação. O elemento `data-laptop-frame` contém uma cena sticky de `100svh`, seguida por uma cauda de `64svh`; um marcador absoluto de `45svh` mede o progresso sem depender da altura do hardware. A tampa usa `z-index` superior ao painel, e a base fica acima de ambos na linha da dobradiça.

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
