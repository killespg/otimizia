# Real Estate Liquid Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Execute inline; subagents are not authorized for this task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar a direcao C, Palco aberto, no dashboard imobiliario sem alterar dados, links, filtros, acoes ou permissoes.

**Architecture:** `RealEstateDashboard.tsx` continua sendo o compositor do dashboard. A grade atual vira uma area analitica com um rail Liquid Glass e indicadores sem superficie; `CommissionPanel` e `TargetsPanel` ganham uma variante `tray` para compartilhar um unico volume de vidro no dashboard sem quebrar a pagina dedicada de comissoes.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Tailwind CSS, Vitest e Playwright.

## Global Constraints

- Preservar a assinatura e todas as props de `RealEstateDashboard`.
- Preservar valores, notas, links, filtros, formularios, server actions e permissoes.
- Remover linhas estruturais do dashboard, mantendo apenas bordas perimetrais de vidro e foco.
- Usar no maximo dois grandes volumes de vidro no conteudo: rail de metricas e bandeja contextual.
- Desktop: rail vertical e indicadores em tres colunas; tablet: rail horizontal; mobile: rail 2 x 2 e grupos empilhados.
- Nao modificar outras verticais nem o comportamento independente de `/painel/imoveis/comissoes`.

---

### Task 1: Proteger o contrato visual e funcional

**Files:**
- Create: `lib/real-estate-dashboard-liquid-stage.test.ts`
- Modify: `lib/frontend-route-parity.test.ts`

**Interfaces:**
- Consumes: `RealEstateDashboard(props)`.
- Produces: contrato observavel `data-liquid-stage`, `data-liquid-metric-rail`, `data-liquid-indicators`, `data-liquid-context-tray`, quatro metricas e tres grupos.

- [x] **Step 1: Escrever o teste de renderizacao real**

Renderizar `RealEstateDashboard` com listas vazias e dados literais. Verificar os quatro marcadores, quatro metricas, tres grupos, links de imoveis/visitas/colecoes/comissoes, `Pergunte ao Tim`, `Personalizar painel` e ausencia de `data-dashboard-card`, `divide-x`, `divide-y` e `border-y`.

- [x] **Step 2: Atualizar o detector de paridade**

Trocar a expectativa `xl:grid-cols-4` pelos quatro marcadores do Palco aberto e manter as expectativas de acoes, filtros, downloads e links.

- [x] **Step 3: Confirmar RED**

Run: `npx --no-install vitest run lib/real-estate-dashboard-liquid-stage.test.ts lib/frontend-route-parity.test.ts`

Expected: FAIL porque os marcadores e a nova estrutura ainda nao existem.

### Task 2: Implementar o Palco aberto

**Files:**
- Modify: `app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx`

**Interfaces:**
- Consumes: `metrics`, indicadores calculados, `CommissionPanel`, `TargetsPanel`.
- Produces: `CommissionPanelProps.variant?: "panel" | "tray"` e `TargetsPanelProps.variant?: "panel" | "tray"`, com default `panel`.

- [x] **Step 1: Abrir cabecalho e Tim no canvas**

Remover `border-b` do cabecalho e substituir a faixa `border-y` do Tim por uma capsula `liquid-glass-control` compacta.

- [x] **Step 2: Compor a area analitica**

Criar `data-liquid-stage="real-estate"`; colocar `RealEstateMetrics` e `RealEstateCommercialIndicators` em `xl:grid-cols-[minmax(13rem,15rem)_minmax(0,1fr)]`.

- [x] **Step 3: Transformar metricas em rail**

Renderizar `data-liquid-metric-rail` com `glass relative`, grade 2 x 2 antes de `xl` e coluna unica no desktop. Cada link recebe `data-liquid-metric`, fundo branco sutil, raio e hover, sem bordas internas.

- [x] **Step 4: Abrir indicadores no canvas**

Renderizar `data-liquid-indicators` sem `.panel`; usar tres grupos com `data-indicator-group`, `gap` e links arredondados em hover, sem `divide-*` ou bordas.

- [x] **Step 5: Unir comissoes e metas**

Criar um unico `data-liquid-context-tray` com `glass relative`; passar `variant="tray"` aos dois paineis. A variante tray remove painel e divisores, usando espacamento e fundos internos sutis; a variante default preserva a pagina dedicada.

- [x] **Step 6: Remover o ultimo card auxiliar**

Renderizar `PublicPagePanel` diretamente no canvas, sem `.panel`, mantendo controles e links.

- [x] **Step 7: Confirmar GREEN focado**

Run: `npx --no-install vitest run lib/real-estate-dashboard-liquid-stage.test.ts lib/frontend-route-parity.test.ts`

Expected: PASS.

### Task 3: Validar o produto

**Files:**
- Modify: `docs/superpowers/plans/2026-08-04-real-estate-liquid-stage-implementation.md`

**Interfaces:**
- Consumes: dashboard implementado.
- Produces: evidencia de regressao e limites explicitos.

- [x] **Step 1: Rodar Liquid Glass E2E**

Run: `$env:E2E_BASE_URL='http://127.0.0.1:3000'; npx --no-install playwright test test/e2e/liquid-glass.spec.ts`

- [x] **Step 2: Rodar gates locais**

Run: `npm run typecheck`, `npm run lint`, `npm test` e `git diff --check`.

- [x] **Step 3: Verificar servidor e registrar a sessao**

Confirmar HTTP 200 em `/painel` ou `/login`, manter o dev ligado e executar `scripts/obsidian-log.ps1` sem dados sensiveis.
