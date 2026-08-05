# Sidebar Control Glass Parity Implementation Plan

> **For agentic workers:** Implement inline in the current session. Subagents are not authorized for this task.

**Goal:** Fazer a sidebar desktop usar o mesmo material claro do controle `Personalizar painel`, sem alterar sua estrutura nem clarear outros overlays.

**Architecture:** A regra continua centralizada em `app/globals.css`. O shell de navegacao mantem `.od-chrome` para semantica e fallbacks, mas `.product-nav-glass-shell` neutraliza as camadas pseudo-elemento do chrome denso e participa da mesma regra visual de `.liquid-glass-control`.

**Tech Stack:** Next.js, TypeScript, CSS, Playwright.

## Global Constraints

- Preservar a paisagem e os cards atuais.
- Nao alterar drawers, modais, topbar ou dock mobile.
- Manter borda branca a 26%, preenchimento branco a 7,5%, blur de 16 px e highlight curto.
- Respeitar os fallbacks existentes de transparencia e contraste.

---

### Task 1: Igualar o material da sidebar ao controle

**Files:**
- Modify: `test/e2e/liquid-glass.spec.ts`
- Modify: `app/globals.css`
- Modify: `DESIGN.md`
- Modify: `docs/superpowers/specs/2026-08-04-apple-liquid-glass-painel-design.md`

**Interfaces:**
- Consumes: `.od-chrome`, `.product-nav-glass-shell`, `.liquid-glass-control`.
- Produces: paridade visual computada entre sidebar e controle, sem pseudo-camada fumê na sidebar.

- [x] **Step 1: Escrever o teste que compara o material computado**

Adicionar uma sidebar real com `od-chrome product-nav-glass-shell` ao fixture e comparar `backgroundColor`, `backgroundImage`, `borderColor`, `backdropFilter` e `boxShadow` com `.liquid-glass-control`; verificar que `::before` e `::after` estao desativados.

- [x] **Step 2: Executar o teste e confirmar RED**

Run: `npx --no-install playwright test test/e2e/liquid-glass.spec.ts --grep "sidebar usa o mesmo vidro" --project=desktop-chromium`

Expected: FAIL porque o shell ainda usa o blur de chrome e a camada fumê `--od-glass-chrome-bg`.

- [x] **Step 3: Aplicar a menor regra CSS**

Incluir `.product-nav-glass-shell` na regra visual de `.liquid-glass-control` e desativar apenas seus pseudo-elementos `::before` e `::after`.

- [x] **Step 4: Confirmar GREEN e regressao completa**

Executar o teste focado, a suite Liquid Glass completa, `npm run typecheck`, `npm run lint`, `npm test` e `git diff --check`.
