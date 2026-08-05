# Liquid Glass Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a landing pública em uma experiência Liquid Glass contínua e premium sem alterar copy, rotas ou comportamento funcional.

**Architecture:** `app/page.tsx` continua compondo os módulos de `components/landing`, mas deixa de alternar faixas sólidas e passa a fornecer um canvas contínuo. Classes CSS isoladas sob `.landing-liquid-page` implementam fundo, vidro, fallbacks e acessibilidade; cada módulo interativo recebe no máximo um stage de vidro, mantendo textos editoriais abertos.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Vitest e Playwright.

## Global Constraints

- Preservar conteúdo, preços, rotas, autenticação, links e comportamento das ações atuais.
- Manter `components/landing` separado de `components/design-system` e não alterar o material das telas autenticadas.
- Usar Inter, `#8757f0` como acento principal e `#6f315f` apenas como reflexão ambiente.
- Não usar texto em gradiente, card por recurso ou vidro sobre vidro.
- Manter alvos interativos de no mínimo 44 × 44 px e ausência de overflow em 390 px.
- Implementar fallbacks para `prefers-reduced-transparency`, `prefers-contrast` e `prefers-reduced-motion`.

---

### Task 1: Contrato visual da landing

**Files:**
- Create: `lib/landing-liquid-glass.test.ts`
- Modify: `test/e2e/landing-responsive.spec.ts`

**Interfaces:**
- Consumes: fonte de `app/page.tsx`, componentes em `components/landing` e regras de `app/globals.css`.
- Produces: marcadores `data-landing-liquid-canvas="true"`, `data-landing-glass-stage` e contrato público de material computado.

- [ ] **Step 1: Escrever os testes unitários RED**

Criar testes separados chamados `usa canvas contínuo e chrome flutuante`, `agrupa módulos em stages Liquid Glass` e `oferece fallbacks acessíveis`. Eles exigem o canvas, o chrome da landing, pelo menos seis stages, CTAs Liquid Glass e os três fallbacks de acessibilidade:

```ts
expect(pageSource).toContain('data-landing-liquid-canvas="true"');
expect(pageSource.match(/data-landing-glass-stage/g)?.length).toBeGreaterThanOrEqual(6);
expect(navSource).toContain('className="landing-liquid-nav"');
expect(heroSource).toContain("liquid-glass-control--tinted");
expect(css).toContain(".landing-liquid-page");
expect(css).toContain(".landing-liquid-stage");
expect(css).toContain("prefers-reduced-transparency");
expect(css).toContain("prefers-contrast");
expect(css).toContain("prefers-reduced-motion");
```

- [ ] **Step 2: Estender o E2E público**

Além do teste móvel existente, validar que o canvas e a navegação estão visíveis e que pelo menos um stage possui `backdrop-filter` diferente de `none` quando o navegador oferece suporte.

- [ ] **Step 3: Executar os testes e confirmar RED**

Run: `npm test -- lib/landing-liquid-glass.test.ts`

Expected: FAIL pela ausência dos marcadores e classes exclusivos da landing.

### Task 2: Canvas, navegação e hero

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/landing/landing-nav.tsx`
- Modify: `components/landing/hero.tsx`
- Modify: `components/landing/mobile-sticky-cta.tsx`
- Modify: `app/globals.css`
- Test: `lib/landing-liquid-glass.test.ts`

**Interfaces:**
- Consumes: tokens `--od-glass-*`, `LandingNav`, `Hero`, `MobileStickyCta` e estrutura `Section` existente.
- Produces: canvas contínuo, navegação flutuante e CTAs tingidos sem alterar destinos.

- [ ] **Step 1: Implementar o canvas isolado**

Adicionar `data-landing-liquid-canvas="true"` e `.landing-liquid-page` à raiz. Trocar o root de cada `Section` por `.landing-liquid-section`, removendo alternância de fundo e borda superior. Criar luzes ambientes em pseudo-elementos ou elementos `aria-hidden` com violeta e ameixa.

- [ ] **Step 2: Materializar a navegação**

Passar `className="landing-liquid-nav"` ao `NavBar` e adicionar CSS com largura contida, afastamento da viewport, blur de 24 px, saturação, borda branca assimétrica, sheen e fallback opaco.

- [ ] **Step 3: Refinar hero e CTAs**

Remover a borda e fundo sólido do hero, manter o título aberto e trocar o CTA por:

```tsx
className="liquid-glass-control liquid-glass-control--tinted inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white"
```

Aplicar o mesmo contrato visual ao CTA móvel, preservando visibilidade, safe area e `tabIndex`.

- [ ] **Step 4: Confirmar GREEN de canvas e chrome**

Run: `npm test -- lib/landing-liquid-glass.test.ts -t "usa canvas contínuo e chrome flutuante"`

Expected: PASS para canvas, navegação e CTA; os testes de stages e fallbacks permanecem como próximos ciclos RED independentes.

### Task 3: Stages de conteúdo e módulos interativos

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/landing/feature-tabs.tsx`
- Modify: `components/landing/container-scroll-animation.tsx`
- Modify: `components/landing/spotlight-card.tsx`
- Modify: `components/landing/ai-composer.tsx`
- Modify: `components/landing/pricing.tsx`
- Modify: `components/landing/FaqAccordion.tsx`
- Modify: `components/landing/about.tsx`
- Modify: `app/globals.css`
- Test: `lib/landing-liquid-glass.test.ts`

**Interfaces:**
- Consumes: `.landing-liquid-stage` e `.landing-liquid-stage--soft` da Task 2.
- Produces: volumes únicos para prova social, profissões, preview, Tim, preço, FAQ, comparação e CTA final.

- [ ] **Step 1: Criar o material dos stages**

Definir `.landing-liquid-stage` com posição relativa, isolamento, fundo branco de 7,5%, `backdrop-filter: blur(24px) saturate(155%)`, borda iluminada, sombra contida e sheen em `::after`. A variação `--soft` usa preenchimento de 5,5% e blur de 18 px.

- [ ] **Step 2: Agrupar profissões e prova social**

Envolver a faixa de logos em stage suave. Tornar o tablist um controle Liquid Glass e envolver todo o conteúdo selecionado em um único stage, preservando `.map()`, papéis ARIA e linhas internas.

- [ ] **Step 3: Transformar o preview na peça central**

Aplicar `landing-liquid-stage` somente na moldura externa animada de `ContainerScroll`. Manter `DashboardPreview` sobre superfície de conteúdo sem `backdrop-filter`, evitando vidro sobre vidro.

- [ ] **Step 4: Unificar Tim, preço, FAQ e comparação**

Aplicar um stage ao conjunto `SpotlightCard + AiComposer`; um stage ao preço; um ao FAQ; um stage suave à comparação `About`; e um stage focal ao CTA final. Remover divisórias externas de seção, mantendo apenas separadores internos necessários.

- [ ] **Step 5: Confirmar GREEN**

Run: `npm test -- lib/landing-liquid-glass.test.ts`

Expected: PASS com todos os stages, canvas, navegação e CTAs detectados.

### Task 4: Responsividade, acessibilidade e navegador

**Files:**
- Modify: `app/globals.css`
- Modify: `test/e2e/landing-responsive.spec.ts`
- Test: `lib/landing-liquid-glass.test.ts`

**Interfaces:**
- Consumes: página pública `/` e classes de material concluídas.
- Produces: fallbacks de transparência/contraste/movimento e evidência de geometria mobile.

- [ ] **Step 1: Adicionar fallbacks direcionados**

Em `prefers-reduced-transparency`, remover pseudo-elementos refrativos e usar `rgba(21,19,27,.97)`. Em `prefers-contrast: more`, reforçar bordas para branco a 72%. Em `prefers-reduced-motion`, desativar transições decorativas do canvas e stages.

- [ ] **Step 2: Executar teste E2E mobile**

Run: `$env:E2E_BASE_URL='http://localhost:3000'; npx playwright test test/e2e/landing-responsive.spec.ts --project=mobile-chromium`

Expected: PASS sem overflow, com menu, tabs, targets de 44 px e material visível.

- [ ] **Step 3: Executar teste E2E desktop**

Run: `$env:E2E_BASE_URL='http://localhost:3000'; npx playwright test test/e2e/landing-responsive.spec.ts --project=chromium`

Expected: o cenário específico de desktop passa; o cenário exclusivamente mobile é ignorado pelo `test.skip` existente.

### Task 5: Verificação integrada e registro

**Files:**
- Modify: `08 Equipe/Registro automatico de desenvolvimento.md` via `scripts/obsidian-log.ps1`

**Interfaces:**
- Consumes: implementação e testes concluídos.
- Produces: evidência atual e registro de desenvolvimento sem segredos.

- [ ] **Step 1: Executar validação completa**

Run: `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`.

Expected: todos retornam código 0; qualquer limitação externa é relatada literalmente.

- [ ] **Step 2: Revisar escopo e whitespace**

Run: `git diff --check -- app/page.tsx app/globals.css components/landing lib/landing-liquid-glass.test.ts test/e2e/landing-responsive.spec.ts`

Expected: nenhuma alteração funcional fora da landing e nenhum erro de whitespace.

- [ ] **Step 3: Registrar a sessão**

Executar `scripts/obsidian-log.ps1` uma vez com resumo, testes, arquivos, decisões e riscos, sem segredos ou dados de clientes.
