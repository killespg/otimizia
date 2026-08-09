# Landing Background-Driven Glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer toda superfície passiva da landing refletir a iluminação ampla do canvas, eliminando glows, sombras e gradientes coloridos próprios sem enfraquecer ações, contraste ou fallbacks.

**Architecture:** A landing passa a declarar um pequeno conjunto de tokens locais de material em `.landing-cinematic-page`. Placas, stages, Prisma, navegação e CTA móvel consomem o mesmo preenchimento passivo, borda, reflexão e filtro; componentes internos marcam superfícies passivas com atributos de teste. O canvas continua sendo a única camada emissiva, enquanto fallbacks removem reflexão e blur sem criar um segundo painel no Prisma.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, CSS nativo (`backdrop-filter`, media queries), Playwright e Vitest.

## Global Constraints

- Escopo estrito em `components/landing`, CSS da landing em `app/globals.css`, seus testes E2E e a documentação canônica; não alterar `components/design-system`.
- Azul e roxo decorativos só podem nascer em `.landing-cinematic-page::before`, `.landing-cinematic-light--blue` e `.landing-cinematic-light--purple`.
- Preenchimento passivo tem alfa máximo de 30%; reflexão branca, 8%; borda, 20%.
- Não usar sombra externa azul/roxa, gradiente radial colorido local nem recipiente passivo com azul sólido.
- Azul sólido permanece em botão primário, aba selecionada e indicadores reais de foco/seleção.
- O print `painel-imobiliario-mariana` e sua fidelidade não mudam.
- Sem novas dependências, sem alteração de copy, estrutura ou animação.
- Texto normal mantém contraste mínimo de 4,5:1; texto grande, 3:1; alvo de toque continua com pelo menos 44px.
- A landing continua funcional sem JavaScript, sem overflow em 390px e com fallbacks opacos sem blur.

## File Structure

- Modify: `app/globals.css` — tokens e implementação do material passivo, Prisma, navegação e fallbacks.
- Modify: `components/landing/ai-composer.tsx` — mensagens demonstrativas passam de recipientes azuis para superfícies passivas identificáveis.
- Modify: `components/landing/feature-tabs.tsx` — ícones passivos deixam de usar recipientes azuis sólidos; tab selecionada continua sólida.
- Modify: `test/e2e/landing-cinematic.spec.ts` — contratos semânticos de emissão, baixa opacidade, exceções e fallbacks.
- Verify: `test/e2e/landing-no-js.spec.ts` — conteúdo, Prisma e estrutura continuam visíveis sem JavaScript.
- Verify: `test/e2e/landing-responsive.spec.ts` — mobile, menu e alvos de toque não regridem.
- Modify: `DESIGN.md` — decisão durável da landing: canvas emissivo e foreground passivo.

---

### Task 1: Unificar o material óptico das superfícies principais

**Files:**
- Modify: `test/e2e/landing-cinematic.spec.ts:519-616`
- Modify: `app/globals.css:1429-1793`

**Interfaces:**
- Consumes: seletores atuais `.landing-cinematic-page`, `.landing-cinematic-plate`, `.landing-cinematic-stage`, `.landing-prisma-panel-frame`, `header.landing-cinematic-nav` e `.landing-cinematic-mobile-cta`.
- Produces: tokens CSS `--landing-glass-fill`, `--landing-glass-fill-quiet`, `--landing-glass-border`, `--landing-glass-border-top`, `--landing-glass-reflection` e `--landing-glass-filter`, usados por todas as superfícies passivas da landing.

- [ ] **Step 1: Reescrever o contrato de iluminação para detectar emissão local**

Substituir o corpo do teste `deixa a iluminação do canvas atravessar os volumes de vidro` por uma inspeção semântica. Manter as asserções existentes de camada ambiente e cobertura, e acrescentar os limites de alfa e a busca por azul/roxo em `backgroundImage` e `boxShadow`:

```ts
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
  lightCoverage: primaryLight.getBoundingClientRect().width / window.innerWidth,
  surfaces,
};
```

Fora de `page.evaluate`, exigir:

```ts
expect(material.ambientLayer).not.toBe("none");
expect(material.lightCoverage).toBeGreaterThan(1.1);
expect(Math.max(...material.surfaces.map((surface) => surface.alpha))).toBeLessThanOrEqual(0.3);
expect(material.surfaces.filter((surface) => surface.hasColoredEmission)).toEqual([]);
expect(
  material.surfaces.filter((surface) => !surface.backdropFilter.includes("blur")),
).toEqual([]);
```

- [ ] **Step 2: Rodar o contrato e confirmar RED**

Run:

```powershell
npx --no-install playwright test test/e2e/landing-cinematic.spec.ts --grep "iluminação do canvas" --project=desktop-chromium
```

Expected: FAIL porque stages atuais chegam a alfa `0.52`, a placa do Tim tem gradiente roxo, o stage tem radial azul e o Prisma tem sombra azul externa.

- [ ] **Step 3: Declarar os tokens locais e migrar placas/stages**

Em `.landing-cinematic-page`, acrescentar:

```css
--landing-glass-fill: rgba(6, 12, 27, 0.22);
--landing-glass-fill-quiet: rgba(6, 12, 27, 0.28);
--landing-glass-border: rgba(255, 255, 255, 0.12);
--landing-glass-border-top: rgba(255, 255, 255, 0.19);
--landing-glass-reflection: linear-gradient(148deg, rgba(255, 255, 255, 0.08), transparent 38%);
--landing-glass-filter: blur(18px) saturate(125%);
```

Aplicar o material às placas:

```css
.landing-cinematic-plate {
  border-color: var(--landing-glass-border);
  border-top-color: var(--landing-glass-border-top);
  background: var(--landing-glass-fill);
  -webkit-backdrop-filter: var(--landing-glass-filter);
  backdrop-filter: var(--landing-glass-filter);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.landing-cinematic-plate::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--landing-glass-reflection);
  pointer-events: none;
}

.landing-cinematic-plate::after { display: none; }
.landing-cinematic-plate--tim { background: var(--landing-glass-fill); }
.landing-cinematic-plate-icon { background: rgba(255, 255, 255, 0.05); }
```

Aplicar o mesmo contrato aos stages:

```css
.landing-cinematic-stage {
  border-color: var(--landing-glass-border);
  border-top-color: var(--landing-glass-border-top);
  border-left-color: rgba(255, 255, 255, 0.15);
  background: var(--landing-glass-fill);
  -webkit-backdrop-filter: var(--landing-glass-filter);
  backdrop-filter: var(--landing-glass-filter);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.landing-cinematic-stage::after {
  background: var(--od-glass-grain), var(--landing-glass-reflection);
  background-blend-mode: overlay, normal;
}

.landing-cinematic-stage--quiet { background: var(--landing-glass-fill-quiet); }
.landing-cinematic-final-cta { background: var(--landing-glass-fill); }
```

Preservar `.landing-cinematic-panel-stage` transparente, sem filtro, borda ou pseudo-elemento.

- [ ] **Step 4: Migrar Prisma, navegação, CTA móvel e controle segmentado**

Trocar os blocos atuais pelos materiais passivos:

```css
.landing-prisma-panel-frame {
  border-color: rgba(255, 255, 255, 0.15);
  border-top-color: rgba(255, 255, 255, 0.2);
  background: rgba(6, 12, 27, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  -webkit-backdrop-filter: blur(14px) saturate(125%);
  backdrop-filter: blur(14px) saturate(125%);
}

.landing-prisma-panel-frame::before {
  display: none;
  filter: none;
}

.landing-prisma-panel-drag-hint {
  background: rgba(6, 12, 27, 0.28);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
  backdrop-filter: blur(12px) saturate(120%);
}

header.landing-cinematic-nav,
.landing-cinematic-mobile-cta {
  border-color: var(--landing-glass-border);
  border-top-color: var(--landing-glass-border-top);
  background: var(--landing-glass-fill);
  -webkit-backdrop-filter: var(--landing-glass-filter);
  backdrop-filter: var(--landing-glass-filter);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.landing-cinematic-segmented { background: rgba(255, 255, 255, 0.04); }
```

O `::before` do Prisma fica removido. A reflexão vem somente da borda, do preenchimento baixo e do blur aplicados ao frame; nenhuma camada pode cobrir o print.

- [ ] **Step 5: Rodar o teste focado e confirmar GREEN**

Run:

```powershell
npx --no-install playwright test test/e2e/landing-cinematic.spec.ts --grep "iluminação do canvas|azul da logo" --project=desktop-chromium
```

Expected: 2 passed. O canvas continua azul dominante com roxo de apoio; nenhuma superfície passiva contém emissão colorida e todas ficam abaixo de alfa 0,30.

- [ ] **Step 6: Commitar o material compartilhado**

```powershell
git add app/globals.css test/e2e/landing-cinematic.spec.ts
git commit -m "refactor(landing): move iluminacao para o canvas"
```

---

### Task 2: Neutralizar recipientes semânticos internos

**Files:**
- Modify: `test/e2e/landing-cinematic.spec.ts`
- Modify: `components/landing/ai-composer.tsx:18-31`
- Modify: `components/landing/feature-tabs.tsx:197-285`

**Interfaces:**
- Consumes: `--od-accent` como cor de glifo/texto e a exceção já existente `bg-od-accent` para tab selecionada e `.btn`.
- Produces: atributo `data-landing-passive-surface` com valores `user-message`, `tim-reply`, `feature-icon` e `tim-icon`, usado pelo contrato Playwright.

- [ ] **Step 1: Escrever o contrato das exceções azuis**

Adicionar após o teste de material principal:

```ts
test("reserva azul sólido para ação, seleção e foco", async ({ page }) => {
  await page.goto("/#recursos", { waitUntil: "networkidle" });

  const passive = page.locator("[data-landing-passive-surface]");
  await expect(passive).not.toHaveCount(0);

  const passivePaint = await passive.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      const channels = style.backgroundColor.match(/[\d.]+/g)?.map(Number) ?? [];
      return {
        name: element.getAttribute("data-landing-passive-surface"),
        alpha: channels.length === 4 ? channels[3] : 1,
        boxShadow: style.boxShadow,
      };
    }),
  );

  expect(passivePaint.every((surface) => surface.alpha <= 0.08)).toBe(true);
  expect(passivePaint.every((surface) => surface.boxShadow === "none")).toBe(true);

  const solidActions = await Promise.all([
    page.locator("#hero-cta").evaluate((element) => getComputedStyle(element).backgroundColor),
    page.locator('[role="tab"][aria-selected="true"]').evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ]);
  expect(solidActions).toEqual(["rgb(77, 113, 255)", "rgb(77, 113, 255)"]);
});
```

- [ ] **Step 2: Rodar o novo contrato e confirmar RED**

Run:

```powershell
npx --no-install playwright test test/e2e/landing-cinematic.spec.ts --grep "reserva azul sólido" --project=desktop-chromium
```

Expected: FAIL porque os atributos ainda não existem e a mensagem do usuário e o ícone do Tim ainda usam `bg-od-accent` sólido.

- [ ] **Step 3: Marcar e neutralizar as mensagens do Tim**

Em `components/landing/ai-composer.tsx`, substituir as classes das duas mensagens:

```tsx
<p
  data-landing-passive-surface="user-message"
  className="ml-auto w-fit max-w-[85%] rounded-lg border border-od-accent/20 bg-white/[0.055] px-3.5 py-2 text-[13px] text-od-text"
>
  Cadastra a Carla e abre uma negociação
</p>

<p
  data-landing-passive-surface="tim-reply"
  className="rounded-lg bg-white/[0.05] px-3.5 py-2 text-[13px] leading-relaxed text-od-text-2"
>
  Prontinho — cadastrei a Carla e abri uma negociação nova em Qualificação.
</p>
```

Não alterar botões de envio, anexar ou comandos.

- [ ] **Step 4: Neutralizar recipientes de ícones passivos**

Em `FeatureRow`, usar:

```tsx
<span
  data-landing-passive-surface="feature-icon"
  className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.05] text-od-accent-hover"
>
```

No destaque do Tim, usar:

```tsx
<span
  data-landing-passive-surface="tim-icon"
  className="grid size-11 shrink-0 place-items-center rounded-full bg-white/[0.05] text-od-accent-hover"
>
  <Bot className="size-5" strokeWidth={2} />
</span>
```

Manter exatamente `selected ? "bg-od-accent text-white" : ...` no controle segmentado.

- [ ] **Step 5: Confirmar GREEN e ausência de regressão de tabs**

Run:

```powershell
npx --no-install playwright test test/e2e/landing-cinematic.spec.ts --grep "reserva azul sólido|corredor cinematográfico" --project=desktop-chromium
```

Expected: 2 passed. Superfícies passivas têm alfa máximo de 0,08 e ações continuam `rgb(77, 113, 255)`.

- [ ] **Step 6: Commitar as superfícies internas**

```powershell
git add components/landing/ai-composer.tsx components/landing/feature-tabs.tsx test/e2e/landing-cinematic.spec.ts
git commit -m "refactor(landing): neutraliza superficies passivas"
```

---

### Task 3: Fechar fallbacks, acessibilidade, documentação e validação visual

**Files:**
- Modify: `test/e2e/landing-cinematic.spec.ts:215-374`
- Modify: `app/globals.css:1860-1925`
- Modify: `DESIGN.md` na seção `## Material: liquid glass`
- Verify: `test/e2e/landing-no-js.spec.ts`
- Verify: `test/e2e/landing-responsive.spec.ts`

**Interfaces:**
- Consumes: tokens e superfícies passivas das Tasks 1 e 2.
- Produces: fallbacks sem imagem, blur ou sombra; registro canônico da regra de iluminação da landing.

- [ ] **Step 1: Ampliar o contrato de fallback**

No teste `preserva a Prisma Glass nos fallbacks de transparência`, ampliar a coleção computada para stage comum, plate, header, CTA móvel, panel stage, frame e hint. `renderingOf` passa a retornar:

```ts
function renderingOf(element: HTMLElement) {
  const style = getComputedStyle(element);
  return {
    backgroundColor: style.backgroundColor,
    backgroundImage: style.backgroundImage,
    backdropFilter: style.backdropFilter,
    boxShadow: style.boxShadow,
  };
}
```

Resolver os elementos de forma explícita e falhar se qualquer contrato sumir:

```ts
const elements = {
  stage: document.querySelector<HTMLElement>('[data-landing-stage="tim"]'),
  plate: document.querySelector<HTMLElement>("[data-cinematic-plate]"),
  navigation: document.querySelector<HTMLElement>("header.landing-cinematic-nav"),
  mobileCta: document.querySelector<HTMLElement>(".landing-cinematic-mobile-cta"),
  panelStage: document.querySelector<HTMLElement>(".landing-cinematic-panel-stage"),
  frame: document.querySelector<HTMLElement>(".landing-prisma-panel-frame"),
  hint: document.querySelector<HTMLElement>(".landing-prisma-panel-drag-hint"),
};
if (Object.values(elements).some((element) => !element)) {
  throw new Error("Superfície de fallback ausente");
}
const rendered = Object.fromEntries(
  Object.entries(elements).map(([name, element]) => [name, renderingOf(element!)]),
);
```

No mesmo `page.evaluate`, medir o pior texto secundário demonstrativo sobre o fallback sólido:

```ts
function parseColor(value: string) {
  const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return {
    red: channels[0] ?? 0,
    green: channels[1] ?? 0,
    blue: channels[2] ?? 0,
    alpha: channels[3] ?? 1,
  };
}

function luminance({ red, green, blue }: ReturnType<typeof parseColor>) {
  const linear = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function composite(foreground: ReturnType<typeof parseColor>) {
  const background = { red: 16, green: 26, blue: 50, alpha: 1 };
  return {
    red: foreground.red * foreground.alpha + background.red * (1 - foreground.alpha),
    green: foreground.green * foreground.alpha + background.green * (1 - foreground.alpha),
    blue: foreground.blue * foreground.alpha + background.blue * (1 - foreground.alpha),
    alpha: 1,
  };
}

const secondaryText = document.querySelector<HTMLElement>(
  '[data-landing-stage="tim"] .text-od-text-2',
);
if (!secondaryText) throw new Error("Texto secundário do Tim ausente");
const foreground = composite(parseColor(getComputedStyle(secondaryText).color));
const foregroundLuminance = luminance(foreground);
const backgroundLuminance = luminance({ red: 16, green: 26, blue: 50, alpha: 1 });
const bodyContrast =
  (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
  (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);

return { ...rendered, bodyContrast };
```

Exigir no modo `prefers-reduced-transparency: reduce`:

```ts
const opaquePassive = ["stage", "plate", "navigation", "mobileCta", "frame"];
for (const name of opaquePassive) {
  expect(fallbackRendering![name]).toEqual({
    backgroundColor: "rgb(16, 26, 50)",
    backgroundImage: "none",
    backdropFilter: "none",
    boxShadow: "none",
  });
}
expect(fallbackRendering!.panelStage).toEqual({
  backgroundColor: "rgba(0, 0, 0, 0)",
  backgroundImage: "none",
  backdropFilter: "none",
  boxShadow: "none",
});
expect(fallbackRendering!.hint).toEqual({
  backgroundColor: "rgb(7, 17, 38)",
  backgroundImage: "none",
  backdropFilter: "none",
  boxShadow: "none",
});
expect(fallbackRendering!.bodyContrast).toBeGreaterThanOrEqual(4.5);
```

Estender também o coletor CSSOM para exigir `backgroundImageIsNone`, `backdropFilter: "none"` e `boxShadow: "none"` nas duas condições de fallback.

- [ ] **Step 2: Confirmar RED do fallback completo**

Run:

```powershell
npx --no-install playwright test test/e2e/landing-cinematic.spec.ts --grep "fallbacks de transparência" --project=desktop-chromium
```

Expected: FAIL porque as regras atuais preservam o inset `box-shadow` e não removem explicitamente todas as imagens/pseudo-reflexões.

- [ ] **Step 3: Tornar os dois fallbacks totalmente passivos**

Em ambos os blocos — `@supports not (...)` e `@media (prefers-reduced-transparency: reduce)` — usar:

```css
.landing-cinematic-stage,
.landing-cinematic-plate,
.landing-cinematic-mobile-cta,
header.landing-cinematic-nav,
.landing-prisma-panel-frame {
  background: #101a32;
  background-image: none;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

.landing-cinematic-panel-stage {
  background: transparent;
  background-image: none;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

.landing-prisma-panel-drag-hint {
  background: #071126;
  background-image: none;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

.landing-cinematic-stage::after,
.landing-cinematic-plate::before,
.landing-prisma-panel-frame::before {
  display: none;
}
```

No `prefers-contrast: more`, incluir `.landing-prisma-panel-frame` no grupo de borda reforçada e manter a regra existente que esconde as luzes decorativas para maximizar contraste.

- [ ] **Step 4: Registrar a regra no DESIGN.md**

Acrescentar ao fim de `## Material: liquid glass`:

```markdown
### Landing: canvas emissivo, vidro passivo

Na landing, azul e roxo decorativos nascem somente no canvas
(`.landing-cinematic-page::before` e `.landing-cinematic-light-*`). Placas,
stages, Prisma, navegação e CTA móvel usam preenchimento marinho de até 30%,
reflexo branco de até 8% e nenhuma sombra colorida externa. Azul sólido fica
restrito a ação, seleção e foco; o marketing não altera os componentes centrais
do produto.
```

- [ ] **Step 5: Confirmar GREEN focado e estressar o contrato óptico**

Run:

```powershell
npx --no-install playwright test test/e2e/landing-cinematic.spec.ts --grep "iluminação do canvas|azul sólido|fallbacks de transparência" --repeat-each=5
```

Expected: 30 passed entre os dois projetos (3 contratos × 2 projetos × 5 repetições); nenhuma repetição falha.

- [ ] **Step 6: Rodar a regressão completa da landing**

Run:

```powershell
npx --no-install playwright test test/e2e/landing-cinematic.spec.ts test/e2e/landing-no-js.spec.ts test/e2e/landing-responsive.spec.ts
```

Expected: todos os testes executados passam; somente skips condicionais desktop/mobile já declarados são aceitos. Confirmar explicitamente a contagem no relatório, sem converter skip novo em sucesso.

- [ ] **Step 7: Rodar gates não visuais**

Run:

```powershell
npm run typecheck
npx --no-install eslint app/globals.css components/landing/ai-composer.tsx components/landing/feature-tabs.tsx test/e2e/landing-cinematic.spec.ts
npm test -- --run
git diff --check
```

Expected:

- TypeScript: exit 0;
- ESLint: exit 0; se o CSS for ignorado pela configuração, registrar o aviso e rodar também sem `app/globals.css` para provar os arquivos TypeScript;
- Vitest: 43 arquivos e 427 testes passam, ou a nova contagem exata caso a suíte tenha mudado legitimamente;
- `git diff --check`: sem saída.

- [ ] **Step 8: Validar visualmente em três viewports**

No navegador local, recarregar `http://localhost:3000/` e inspecionar:

- 1440x900: hero, Prisma, profissões, preços, FAQ, sobre e CTA final;
- 660x694: título do painel e frame sem corte ou painel duplo;
- 390x844: placas, scroll interno do Prisma, menu e CTA fixo sem overflow.

Critérios visuais:

- os campos azuis/roxos continuam amplos e atrás do conteúdo;
- nenhum card tem halo próprio;
- reflexos de placas diferentes apontam para a mesma cena luminosa;
- Prisma não tem sombra azul e o print continua nítido;
- CTA primário e tab selecionada continuam claramente azuis;
- nenhum erro novo no console.

- [ ] **Step 9: Registrar uma única sessão no Obsidian**

Run from repository root, substituindo apenas as contagens pelos resultados reais:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/obsidian-log.ps1 `
  -Mode session `
  -Actor Codex `
  -Summary "Landing passou a usar iluminacao exclusiva no canvas e vidro passivo no primeiro plano." `
  -Tests "Playwright focado e regressao da landing passaram; typecheck, ESLint, Vitest e diff check passaram." `
  -Files "app/globals.css; components/landing/ai-composer.tsx; components/landing/feature-tabs.tsx; test/e2e/landing-cinematic.spec.ts; DESIGN.md" `
  -Decisions "Azul solido restrito a acoes, selecao e foco; superficies passivas sem glow colorido proprio." `
  -Risks "Registrar qualquer limite de validacao visual, skip ou ambiente externo que permanecer."
```

Não incluir `.env`, credenciais, dados privados ou saída bruta dos comandos.

- [ ] **Step 10: Commitar fallbacks e documentação**

```powershell
git add app/globals.css test/e2e/landing-cinematic.spec.ts DESIGN.md
git commit -m "fix(landing): endurece fallbacks do vidro passivo"
```

- [ ] **Step 11: Verificar o estado final**

Run:

```powershell
git status --short
git log -3 --oneline
git diff HEAD~3 HEAD --check
```

Expected: worktree limpo; três commits desta implementação visíveis; nenhum erro de whitespace.

## Final Acceptance Checklist

- [ ] O canvas é a única fonte decorativa azul/roxa.
- [ ] Todas as superfícies passivas têm alfa máximo de 30% no modo normal.
- [ ] Nenhuma superfície passiva tem sombra externa colorida.
- [ ] Prisma não cria halo nem painel duplo e preserva foco/scroll/fidelidade.
- [ ] Azul sólido existe somente em ação, seleção e foco.
- [ ] Fallbacks são opacos, sem blur, imagem ou sombra.
- [ ] Contraste, no-JS, mobile 390px e alvos de toque permanecem cobertos.
- [ ] `DESIGN.md` e o registro único do Obsidian refletem a decisão final.
