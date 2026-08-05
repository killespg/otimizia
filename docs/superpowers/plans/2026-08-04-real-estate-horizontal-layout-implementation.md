# Real Estate Horizontal Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar o dashboard imobiliário com KPIs horizontais, indicadores em largura total e sidebar desktop permanentemente expandida.

**Architecture:** A composição permanece em `RealEstateDashboard`, mas métricas e indicadores deixam de compartilhar uma grid lateral. A navegação desktop compartilhada passa de rail + painel selecionável para um único volume persistente que renderiza todos os grupos; a navegação mobile permanece isolada em `MobileAppNav`.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, Playwright.

## Global Constraints

- Preservar dados, links, ações, autorização e navegação mobile existentes.
- Manter dark mode, transparência, Liquid Glass e o reflexo inferior atual da sidebar.
- Não introduzir rolagem horizontal; alvos interativos continuam com no mínimo 44 px.
- O painel de indicadores deve ser mais denso que a faixa de métricas.

---

### Task 1: Contratos do novo layout

**Files:**
- Modify: `lib/real-estate-dashboard-liquid-stage.test.ts`
- Modify: `lib/frontend-route-parity.test.ts`

**Interfaces:**
- Consumes: marcações HTML renderizadas por `RealEstateDashboard` e strings-fonte de `TwoLevelNav`.
- Produces: contratos `data-liquid-metrics-layout="horizontal"`, `data-liquid-indicators-surface="dense"` e `data-product-nav-expanded="true"`.

- [x] **Step 1: Escrever o teste de ordem e topologia**

Adicionar asserções que comprovem a ordem `Pergunte ao Tim` < métricas < `Área de trabalho` < indicadores, quatro métricas e os novos marcadores de layout.

- [x] **Step 2: Escrever o contrato da sidebar fixa**

Validar que o componente compartilhado contém `data-product-nav-expanded="true"`, renderiza `categories.map` no painel e não contém `Ocultar detalhes` nem `Redimensionar menu lateral`.

- [x] **Step 3: Executar os testes e confirmar RED**

Run: `npm test -- lib/real-estate-dashboard-liquid-stage.test.ts lib/frontend-route-parity.test.ts`

Expected: falha pela ausência dos novos marcadores e pela presença dos controles recolhíveis.

### Task 2: Faixa horizontal e indicadores amplos

**Files:**
- Modify: `app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx`
- Modify: `app/globals.css`
- Test: `lib/real-estate-dashboard-liquid-stage.test.ts`

**Interfaces:**
- Consumes: `DashboardMetric[]` e propriedades atuais de `RealEstateCommercialIndicators`.
- Produces: faixa responsiva de quatro KPIs e superfície densa de indicadores em largura total.

- [x] **Step 1: Reordenar os blocos no componente**

Renderizar `RealEstateMetrics` logo após a busca do Tim. Manter título/filtros depois dela e renderizar `RealEstateCommercialIndicators` diretamente abaixo, sem grid lateral.

- [x] **Step 2: Tornar as métricas horizontais**

Usar `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` e células com altura consistente, preservando vidro, hover, foco, ícone, rótulo, valor e nota.

- [x] **Step 3: Densificar o vidro dos indicadores**

Adicionar a classe `real-estate-indicators-glass` com preenchimento escuro translúcido e blur, reaproveitando borda, raio e sombras do sistema. Manter os três grupos sem cartões aninhados.

- [x] **Step 4: Executar o teste do dashboard e confirmar GREEN**

Run: `npm test -- lib/real-estate-dashboard-liquid-stage.test.ts`

Expected: PASS.

### Task 3: Sidebar desktop permanentemente expandida

**Files:**
- Modify: `components/design-system/product-nav-groups.tsx`
- Modify: `test/e2e/liquid-glass.spec.ts`
- Test: `lib/frontend-route-parity.test.ts`

**Interfaces:**
- Consumes: `groups: NavGroup[]`, `submenu`, informações da organização e ações de conta.
- Produces: um único `aside` desktop com todos os grupos, enquanto `MobileAppNav` mantém sua API e comportamento.

- [x] **Step 1: Remover estado recolhível e redimensionável**

Excluir chaves de `localStorage`, estados, efeitos e manipuladores associados a ocultação, seleção de grupo e largura variável.

- [x] **Step 2: Renderizar navegação completa**

No mesmo volume de vidro, renderizar cabeçalho da organização, itens âncora e cada categoria com ícone + rótulo + todos os itens. Manter submenu da visão geral, badges, configurações, logout e avatar.

- [x] **Step 3: Fixar dimensões responsivas do desktop**

Usar largura estável de aproximadamente 288 px em `md+`, altura de viewport e rolagem interna do corpo de navegação.

- [x] **Step 4: Atualizar o E2E do shell**

Trocar o contrato de dois `aside` + recolhimento por um `aside`, marcador expandido, categorias visíveis e largura estável.

- [x] **Step 5: Executar testes e confirmar GREEN**

Run: `npm test -- lib/frontend-route-parity.test.ts`

Expected: PASS.

### Task 4: Refinamento visual premium

**Files:**
- Modify: `app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx`
- Modify: `components/design-system/product-nav-groups.tsx`
- Modify: `app/globals.css`
- Test: `lib/real-estate-dashboard-liquid-stage.test.ts`
- Test: `test/e2e/liquid-glass.spec.ts`

**Interfaces:**
- Consumes: métricas e totais financeiros reais já calculados no dashboard.
- Produces: sparklines decorativos, progressos semânticos, ícones duotone simulados e profundidade de vidro.

- [x] **Step 1: Escrever e observar os contratos RED**

Validar quatro sparklines, quatro valores em gradiente, quatro cards com lift, três progressos e dois pontos de glow.

- [x] **Step 2: Implementar micrográficos e progresso real**

Renderizar SVGs `aria-hidden` e calcular percentuais com `progressPercent`, limitando o resultado entre 0 e 100.

- [x] **Step 3: Aplicar glow, duotone e profundidade**

Concentrar violeta em Tim, Novo imóvel, progresso e ícones ativos; preservar o reflexo inferior da sidebar e neutralizar a contaminação azul da sidebar e dos KPIs com películas grafite translúcidas.

- [x] **Step 4: Confirmar GREEN**

Run: `npm test -- lib/real-estate-dashboard-liquid-stage.test.ts`

Expected: 2 testes passam.

### Task 5: Verificação integrada e registro

**Files:**
- Modify: `08 Equipe/Registro automatico de desenvolvimento.md` via `scripts/obsidian-log.ps1`

**Interfaces:**
- Consumes: implementação concluída.
- Produces: evidência de testes e registro de desenvolvimento sem segredos.

- [ ] **Step 1: Executar validação estática e unitária**

Run: `npm test && npm run typecheck && npm run lint`

Expected: todos os testes executados passam, typecheck e lint retornam código 0.

- [ ] **Step 2: Executar E2E Liquid Glass**

Run: `npx playwright test test/e2e/liquid-glass.spec.ts`

Expected: cenários públicos passam; cenários autenticados só podem ser aceitos como validados quando as fixtures estão configuradas.

- [ ] **Step 3: Revisar escopo do diff**

Run: `git diff --check -- app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx components/design-system/product-nav-groups.tsx app/globals.css lib/real-estate-dashboard-liquid-stage.test.ts lib/frontend-route-parity.test.ts test/e2e/liquid-glass.spec.ts`

Expected: sem erros de whitespace e sem alterações funcionais fora do layout.

- [ ] **Step 4: Registrar a sessão no Obsidian**

Executar `scripts/obsidian-log.ps1` com resumo, testes, arquivos, decisões e riscos concisos, sem dados sensíveis.

### Task 6: Correções visuais pontuais dos indicadores

**Files:**
- Modify: `app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx`
- Test: `lib/real-estate-dashboard-liquid-stage.test.ts`

**Interfaces:**
- Consumes: valores e percentuais reais já renderizados pelo dashboard.
- Produces: trilhos financeiros visíveis com 6 px e gradiente branco → cinza nos quatro KPIs.

- [x] **Step 1: Criar e observar contratos RED**

Exigir `h-1.5 w-full bg-white/10` nos três progressos e `bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent` nos quatro valores principais.

- [x] **Step 2: Aplicar a mudança mínima**

Trocar somente as classes do trilho e do texto, preservando `aria-valuenow`, largura proporcional e toda a composição do dashboard.

- [x] **Step 3: Confirmar GREEN e regressões**

Run: `npm test -- lib/real-estate-dashboard-liquid-stage.test.ts && npm test && npm run typecheck && npm run lint`

Expected: teste direcionado, suíte completa, TypeScript e ESLint passam sem erros.

### Task 7: Ajuste de largura da sidebar expandida

**Files:**
- Modify: `components/design-system/product-nav-groups.tsx`
- Test: `lib/product-nav-groups.test.ts`
- Test: `lib/liquid-glass-contract.test.ts`
- Test: `lib/frontend-route-parity.test.ts`
- Test: `test/e2e/liquid-glass.spec.ts`

**Interfaces:**
- Consumes: `namespace` já fornecido pelas quatro verticais.
- Produces: largura desktop persistida entre 256 e 360 px, com valor inicial e reset em 288 px.

- [x] **Step 1: Criar e observar contratos RED**

Exigir o separador acessível, limites ARIA, atalhos de teclado e comportamento de ajuste sem reintroduzir o recolhimento da navegação.

- [x] **Step 2: Implementar ajuste acessível e persistente**

Adicionar arraste por ponteiro, `ArrowLeft`, `ArrowRight`, `Home`, `End`, duplo clique para reset e persistência isolada por `namespace`.

- [x] **Step 3: Confirmar GREEN e regressões**

Run: `npm test -- lib/product-nav-groups.test.ts lib/liquid-glass-contract.test.ts && npm test && npm run typecheck && npm run lint`

Expected: contratos direcionados e suíte completa passam; o E2E confirma os limites sem overflow horizontal.

### Task 8: Separar redimensionador e scrollbar

**Files:**
- Modify: `components/design-system/product-nav-groups.tsx`
- Test: `lib/product-nav-groups.test.ts`
- Test: `test/e2e/liquid-glass.spec.ts`

- [x] **Step 1: Reproduzir a sobreposição em RED**

Exigir que a área rolável e o separador de largura sejam irmãos flexíveis, sem posicionar o separador sobre a scrollbar.

- [x] **Step 2: Reservar faixa própria para o ajuste**

Tornar o conteúdo da sidebar `flex-1 min-w-0` e manter um trilho de 12 px, não rolável, em toda a borda direita.

- [x] **Step 3: Validar gesto e regressões**

Confirmar o contrato de estrutura, o gesto de ponteiro no E2E e a suíte completa do projeto.

### Task 9: Scrollbar Liquid Glass da sidebar

**Files:**
- Modify: `components/design-system/product-nav-groups.tsx`
- Modify: `app/globals.css`
- Test: `lib/liquid-glass-contract.test.ts`

- [x] **Step 1: Criar e observar contrato RED**

Exigir uma classe isolada na área rolável e regras para thumb arredondado, trilho estável e cores translúcidas.

- [x] **Step 2: Aplicar material no thumb**

Manter o comportamento de rolagem, remover os botões de seta, usar trilho invisível, thumb de 10 px com raio total, brilho interno e hover mais claro.

- [x] **Step 3: Validar sem contaminar outras rolagens**

Confirmar que o seletor fica restrito à navegação desktop e não altera a scrollbar da página.

### Task 10: Remover setas nativas no Chromium

**Files:**
- Modify: `app/globals.css`
- Test: `test/e2e/liquid-glass.spec.ts`

- [x] **Step 1: Reproduzir a precedência incorreta em RED**

Confirmar no Chromium que `scrollbar-width: thin` permanece ativo e impede os pseudo-elementos WebKit de controlar os botões.

- [x] **Step 2: Isolar os fallbacks por engine**

Deixar Chrome/Safari no caminho WebKit e aplicar `scrollbar-width`/`scrollbar-color` somente quando `::-webkit-scrollbar` não existir.

- [x] **Step 3: Confirmar o comportamento real**

Exigir no navegador `scrollbar-width: auto`, botão com `display: none` e altura calculada em 0 px.
