# Canvas and Sidebar Reflection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Subagents are not authorized for this task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neutralizar o excesso de azul do canvas e tornar o reflexo branco da sidebar claramente visivel sem alterar sua transparencia funcional.

**Architecture:** `app/globals.css` continua sendo a fonte unica dos materiais. O canvas troca apenas a pelicula sobre o bitmap; a sidebar reativa apenas `::after` como camada optica branca, enquanto os fallbacks de acessibilidade a ocultam. O E2E existente protege o material compartilhado e os estados de transparencia reduzida.

**Tech Stack:** CSS, Next.js, Playwright.

## Global Constraints

- Preservar o bitmap `public/backgrounds/dashboard-landscape.png` e sua geometria.
- Usar `rgba(9, 10, 14, 0.56)` como pelicula grafite do canvas.
- Manter `--od-glass-fill`, `--od-glass-border` e `--od-glass-panel-blur` da sidebar.
- Reflexo da sidebar somente branco/prateado e concentrado no rodape, sem azul, violeta, neon ou animacao.
- Ocultar o reflexo em `prefers-reduced-transparency: reduce`.
- Nao alterar dock mobile, controles, conteudo ou navegacao.

---

### Task 1: Proteger o novo contrato visual

**Files:**
- Modify: `test/e2e/liquid-glass.spec.ts:108-240`

**Interfaces:**
- Consumes: `.product-workspace`, `.product-nav-glass-shell::after`.
- Produces: contrato observavel para pelicula grafite e reflexo branco da sidebar.

- [x] **Step 1: Atualizar o teste da sidebar**

Ler `display`, `backgroundImage` e `opacity` de `::after`. Esperar `display: block`, um gradiente branco, ausencia de cores azuis no reflexo e `opacity: 0.72`. Preservar as expectativas de fill, borda e blur compartilhados com `Personalizar painel`.

- [x] **Step 2: Atualizar o teste do canvas**

Trocar a expectativa da pelicula atual por `rgba(9, 10, 14, 0.56)` e preservar dimensoes, proporcao, laterais azuis e centro escuro.

- [x] **Step 3: Confirmar RED**

Run: `$env:E2E_BASE_URL='http://127.0.0.1:3000'; npx --no-install playwright test test/e2e/liquid-glass.spec.ts --grep "sidebar usa|paisagem azul"`

Expected: FAIL porque a sidebar ainda oculta `::after` e o canvas ainda usa a pelicula azul-marinho.

### Task 2: Implementar e validar o material

**Files:**
- Modify: `app/globals.css:247-255,527-555,600-642`
- Modify: `test/e2e/liquid-glass.spec.ts`

**Interfaces:**
- Consumes: `--od-glass-sheen`, `.product-nav-glass-shell`, media queries de acessibilidade.
- Produces: canvas neutralizado e reflexo branco confinado a sidebar desktop.

- [x] **Step 1: Neutralizar o canvas**

Substituir os dois stops da pelicula de `.product-workspace` por `rgba(9, 10, 14, 0.56)` sem modificar URL, size, position ou attachment.

- [x] **Step 2: Reativar o reflexo da sidebar**

Manter `::before` oculto e configurar `.product-nav-glass-shell::after` com `display: block`, `radial-gradient(115% 42% at 50% 108%, rgba(255,255,255,.26), rgba(255,255,255,.10) 44%, transparent 74%)`, `opacity: .72` e os limites herdados do chrome. Substituir o highlight superior da sidebar por um inset inferior `0 -1px`.

- [x] **Step 3: Preservar acessibilidade**

Em `prefers-reduced-transparency: reduce`, configurar `.product-nav-glass-shell::after { display: none; }`. Em `prefers-contrast: more`, reduzir a opacidade do reflexo para `.42`.

- [x] **Step 4: Confirmar GREEN focado**

Run: `$env:E2E_BASE_URL='http://127.0.0.1:3000'; npx --no-install playwright test test/e2e/liquid-glass.spec.ts --grep "sidebar usa|paisagem azul"`

Expected: 4 testes aprovados, dois projetos para cada contrato.

- [x] **Step 5: Rodar gates finais**

Run: `$env:E2E_BASE_URL='http://127.0.0.1:3000'; npx --no-install playwright test test/e2e/liquid-glass.spec.ts`

Run: `npm run typecheck`

Run: `git diff --check -- app/globals.css test/e2e/liquid-glass.spec.ts`

Expected: E2E publico aprovado, cenarios autenticados podem ser ignorados sem fixture; typecheck e diff check aprovados.

### Task 3: Corrigir o toggle do fundo no dashboard imobiliario

**Files:**
- Modify: `app/(dashboard)/painel/imoveis/dashboard/page.tsx`
- Modify: `lib/frontend-route-parity.test.ts`

**Interfaces:**
- Consumes: usuario autenticado e `profiles.dashboard_preferences`.
- Produces: a mesma preferencia `showAnimatedBackground` para o layout e para o rotulo do toggle.

- [x] **Step 1: Confirmar a divergencia**

O layout filtra `profiles` com `.eq("id", user.id)`, mas a pagina imobiliaria fazia `.maybeSingle()` sem o filtro. Isso permitia o layout ativar a camada enquanto o botao recebia o default `false`.

- [x] **Step 2: Proteger o escopo e confirmar RED**

Adicionar o contrato de escopo do perfil em `frontend-route-parity.test.ts` e executar o teste focado. Esperado e observado: FAIL sem `.eq("id", user!.id)`.

- [x] **Step 3: Corrigir e confirmar GREEN**

Aplicar `.eq("id", user!.id)` antes de `.maybeSingle()` e executar o teste focado. Esperado e observado: PASS.
