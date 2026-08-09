# Remove Landing Caption Pills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover integralmente os três balões decorativos de legenda da landing, inclusive seus textos, sem deixar margens vazias.

**Architecture:** A mudança permanece restrita à landing. Os nós JSX dos kickers serão apagados, as margens que dependiam deles serão zeradas e o CSS morto será removido; contratos Playwright protegerão o resultado com e sem JavaScript.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, CSS global da landing, Playwright, Vitest.

## Global Constraints

- Remover `CRM com WhatsApp e IA para quem vende`, `Hoje` do capítulo do painel e `Seu próximo negócio` junto com seus balões.
- Não converter o conteúdo removido em texto solto, eyebrow ou outro componente.
- Preservar os rótulos sem balão `Hoje`, `Tim` e `Negócios` dentro das três placas narrativas.
- Preservar a ordem semântica, a renderização sem JavaScript e a ausência de overflow horizontal.
- Manter a alteração dentro de `components/landing`, `app/page.tsx`, CSS da landing e testes da landing.

---

### Task 1: Remover os kickers e recompor o ritmo vertical

**Files:**

- Modify: `components/landing/hero.tsx:31-38`
- Modify: `app/page.tsx:100-112`
- Modify: `app/page.tsx:156-169`
- Modify: `app/globals.css:1483-1494`
- Modify: `app/globals.css:1781-1783`
- Test: `test/e2e/landing-cinematic.spec.ts`
- Test: `test/e2e/landing-no-js.spec.ts`

**Interfaces:**

- Consumes: classes existentes `landing-cinematic-hero`, `landing-cinematic-final-cta` e `data-landing-panel-heading="true"`.
- Produces: landing sem elementos `.landing-cinematic-kicker`, com títulos do hero e CTA final iniciando em `margin-top: 0px`.

- [ ] **Step 1: Escrever o contrato Playwright que falha com os balões atuais**

Adicionar a `test/e2e/landing-cinematic.spec.ts`:

```ts
test("remove os balões decorativos e o texto contido neles", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.locator(".landing-cinematic-kicker")).toHaveCount(0);
  await expect(page.getByText("CRM com WhatsApp e IA para quem vende", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Seu próximo negócio", { exact: true })).toHaveCount(0);

  const margins = await page.evaluate(() => ({
    heroTitle: getComputedStyle(document.querySelector(".landing-cinematic-hero h1")!).marginTop,
    finalTitle: getComputedStyle(document.querySelector(".landing-cinematic-final-cta h2")!).marginTop,
  }));

  expect(margins).toEqual({ heroTitle: "0px", finalTitle: "0px" });
});
```

Adicionar ao teste existente de `test/e2e/landing-no-js.spec.ts`, após confirmar a landing:

```ts
await expect(page.locator(".landing-cinematic-kicker")).toHaveCount(0);
```

- [ ] **Step 2: Rodar o teste focado e registrar o RED**

Run:

```powershell
npx --no-install playwright test test/e2e/landing-cinematic.spec.ts test/e2e/landing-no-js.spec.ts --grep "balões decorativos|sem JavaScript"
```

Expected: FAIL porque existem três `.landing-cinematic-kicker` e os títulos do hero/CTA ainda têm margem superior.

- [ ] **Step 3: Remover o JSX e as margens dependentes**

Em `components/landing/hero.tsx`, apagar o kicker e remover `mt-6` do título:

```tsx
<div className="landing-cinematic-hero-copy">
  <h1 className="lp-h1 max-w-[13ch]">
```

Manter `PLATES` e `.landing-cinematic-plate-label` sem alterações.

Em `app/page.tsx`, remover o `<p className="landing-cinematic-kicker mb-5">Hoje</p>` do `titleComponent`. Na CTA final, remover o kicker e deixar:

```tsx
<h2 className="lp-h2 mx-auto max-w-[20ch] text-od-text">
```

- [ ] **Step 4: Remover o CSS sem consumidores**

Apagar integralmente de `app/globals.css` os blocos `.landing-cinematic-kicker` e `.landing-cinematic-final-cta .landing-cinematic-kicker`.

- [ ] **Step 5: Rodar o GREEN focado**

Run:

```powershell
npx --no-install playwright test test/e2e/landing-cinematic.spec.ts test/e2e/landing-no-js.spec.ts --grep "balões decorativos|sem JavaScript"
```

Expected: PASS nos projetos desktop e mobile, com apenas skips deliberados definidos pela configuração.

- [ ] **Step 6: Rodar a regressão completa da landing e checks estáticos**

Run:

```powershell
npx --no-install playwright test test/e2e/landing-cinematic.spec.ts test/e2e/landing-responsive.spec.ts test/e2e/landing-no-js.spec.ts
npm run typecheck
npx --no-install eslint components/landing/hero.tsx app/page.tsx test/e2e/landing-cinematic.spec.ts test/e2e/landing-no-js.spec.ts
npm test
git diff --check
```

Expected: Playwright, typecheck, ESLint, 43 arquivos/427 testes Vitest e diff check passam.

- [ ] **Step 7: Validar visualmente e commitar**

Conferir `http://localhost:3000/` em desktop e `390x844`: hero sem balão, painel sem `Hoje`, CTA final sem kicker e sem vazios onde eles existiam. Depois:

```powershell
git add -- components/landing/hero.tsx app/page.tsx app/globals.css test/e2e/landing-cinematic.spec.ts test/e2e/landing-no-js.spec.ts
git commit -m "refactor(landing): remove balões de legenda"
```
