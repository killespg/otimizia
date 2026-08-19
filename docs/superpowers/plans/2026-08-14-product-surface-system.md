# Product Surface System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar um vocabulário consistente de painéis arredondados, grupos internos e controles em todas as abas autenticadas de `/painel`, reduzindo divisores sem alterar comportamento ou autorização.

**Architecture:** As primitivas globais em `components/ui` serão a fonte única de página, cabeçalho, painel de dados, formulário, grupo interno, métricas e status. As rotas serão migradas por domínio, preservando exceções deliberadas para configurações, chat, calendários e kanban. Testes de renderização e contratos estáticos impedirão a volta de superfícies completas quadradas e alvos abaixo de 44 px.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, Vitest, CSS custom properties.

## Global Constraints

- Painéis externos usam `--radius-panel: 15px`.
- Grupos internos usam `--radius-inner: 11px`.
- Controles usam `--radius-control: 9px`.
- Pills usam `--radius-round` somente para status, toggles, avatar e círculos.
- Escala espacial: 4, 8, 12, 16, 24, 32 e 48 px.
- Alvos acionáveis têm no mínimo 44 × 44 px em qualquer ponteiro.
- Azul comunica ação, seleção e foco; verde, âmbar e vermelho comunicam estado.
- Sem glassmorphism, sombra decorativa, cards aninhados ou alteração de dados/permissões.
- Configurações, chat, calendários e kanban mantêm planos contínuos quando isso serve à tarefa.

---

### Task 1: Consolidar primitivas e contratos globais

**Files:**
- Modify: `components/ui/surface.tsx`
- Modify: `components/ui/data-display.tsx`
- Modify: `components/ui/primitives.test.ts`
- Modify: `app/globals.css`
- Create: `components/ui/product-surface-contract.test.ts`

**Interfaces:**
- Consumes: tokens `--radius-panel`, `--radius-inner`, `--radius-control`, `--surface-primary`, `--surface-secondary`.
- Produces: `Page`, `PageHeader`, `DataPanel`, `FormPanel`, `InsetGroup`, `Surface`, `Section`, `Toolbar`, `MetricBand`, `Status`.

- [ ] **Step 1: Escrever testes de renderização que falhem para as novas primitivas**

```ts
const page = renderToStaticMarkup(createElement(Page, null, "Conteúdo"));
const panel = renderToStaticMarkup(createElement(DataPanel, { title: "Fila" }, "Linha"));
const form = renderToStaticMarkup(createElement(FormPanel, { title: "Cadastro" }, "Campos"));
const inset = renderToStaticMarkup(createElement(InsetGroup, null, "Filtros"));

expect(page).toContain('data-ui="page"');
expect(panel).toContain('data-ui="data-panel"');
expect(form).toContain('data-ui="form-panel"');
expect(inset).toContain('data-ui="inset-group"');
```

- [ ] **Step 2: Executar o RED**

Run: `npx vitest run components/ui/primitives.test.ts`

Expected: FAIL porque `Page`, `DataPanel`, `FormPanel` e `InsetGroup` ainda não existem.

- [ ] **Step 3: Implementar as primitivas mínimas**

```tsx
export function Page(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} data-ui="page" className={`ui-page ${props.className ?? ""}`.trim()} />;
}

export function DataPanel({ title, description, actions, children, ...props }: PanelProps) {
  return (
    <section {...props} data-ui="data-panel" className="ui-data-panel">
      <header className="ui-data-panel__header">
        <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
        {actions ? <div className="ui-data-panel__actions">{actions}</div> : null}
      </header>
      <div className="ui-data-panel__body">{children}</div>
    </section>
  );
}
```

Adicionar classes CSS semânticas com raio 15 px para painéis, 11 px para inset e stack de página com 24/32 px. Corrigir `7px`, `5px` e `6px` das primitivas atuais para 8 px, 4 px e 8 px.

- [ ] **Step 4: Adicionar contrato estático das superfícies**

```ts
expect(globals).toContain(".ui-data-panel");
expect(globals).toContain("border-radius: var(--radius-panel)");
expect(globals).toContain(".ui-inset-group");
expect(globals).toContain("border-radius: var(--radius-inner)");
expect(globals).not.toMatch(/\.ui-(?:button|control)[^{]*\{[^}]*min-height:\s*(?:32|36|40)px/s);
```

- [ ] **Step 5: Executar GREEN e lint focado**

Run: `npx vitest run components/ui/primitives.test.ts components/ui/product-surface-contract.test.ts`

Run: `npx eslint components/ui/surface.tsx components/ui/data-display.tsx components/ui/primitives.test.ts components/ui/product-surface-contract.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- components/ui/surface.tsx components/ui/data-display.tsx components/ui/primitives.test.ts components/ui/product-surface-contract.test.ts app/globals.css
git commit -m "feat: standardize product surfaces"
```

### Task 2: Migrar o jurídico e tornar agenda a referência

**Files:**
- Modify: `components/legal/legal-ui.tsx`
- Modify: `components/legal/legal-dashboard.test.ts`
- Modify: `app/(dashboard)/painel/juridico/prazos/page.tsx`
- Modify: `app/(dashboard)/painel/juridico/processos/page.tsx`
- Modify: `app/(dashboard)/painel/juridico/consulta/DatajudSearchForm.tsx`
- Modify: `app/(dashboard)/painel/juridico/documentos/page.tsx`
- Modify: `app/(dashboard)/painel/juridico/movimentacoes/page.tsx`
- Modify: `app/(dashboard)/painel/juridico/processos/[id]/page.tsx`
- Create: `components/legal/legal-surface-contract.test.ts`

**Interfaces:**
- Consumes: primitivas da Task 1.
- Produces: `LegalPage`, `PageHeader`, `MetricStrip` como adaptadores finos das primitivas globais; agenda com uma única superfície cronológica.

- [ ] **Step 1: Escrever contrato jurídico em RED**

```ts
expect(deadlines).toContain("<DataPanel");
expect(deadlines).toContain("<MetricBand");
expect(deadlines).not.toContain('border border-white/[0.09] bg-[#1e1d22]');
expect(deadlines.match(/<DataPanel/g)).toHaveLength(1);
expect(datajud).toContain("<FormPanel");
expect(datajud).toContain("<DataPanel");
expect(primitives).toContain('from "@/components/ui/surface"');
```

- [ ] **Step 2: Executar RED**

Run: `npx vitest run components/legal/legal-dashboard.test.ts components/legal/legal-surface-contract.test.ts`

Expected: FAIL nas superfícies locais quadradas e adaptadores ainda independentes.

- [ ] **Step 3: Migrar adaptadores e agenda**

Usar `Page`, `PageHeader` e `MetricBand`. Renderizar uma única `DataPanel` com grupos cronológicos internos; filas vazias usam uma linha compacta e não um painel próprio. Substituir bordas entre linhas por `od-rows` e hover tonal.

- [ ] **Step 4: Migrar demais abas jurídicas**

DataJud usa `FormPanel`/`DataPanel`; documentos e movimentações usam `Page` com `gap-6`; processos e detalhe preservam tabelas/formulários dentro de painéis externos de 15 px. Controles abaixo de 44 px ganham hit area universal.

- [ ] **Step 5: Executar GREEN, typecheck e lint focado**

Run: `npx vitest run components/legal/legal-dashboard.test.ts components/legal/legal-surface-contract.test.ts`

Run: `npm run typecheck`

Run: `npx eslint components/legal app/'(dashboard)'/painel/juridico`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- components/legal app/(dashboard)/painel/juridico
git commit -m "feat: unify legal workspace surfaces"
```

### Task 3: Migrar financeiro e CRM geral

**Files:**
- Modify: `app/(dashboard)/painel/financeiro/page.tsx`
- Modify: `app/(dashboard)/painel/funil/page.tsx`
- Modify: `app/(dashboard)/painel/funil/Board.tsx`
- Modify: `app/(dashboard)/painel/contatos/ContactsExplorer.tsx`
- Modify: `app/(dashboard)/painel/contatos/[id]/page.tsx`
- Modify: `app/(dashboard)/painel/tarefas/page.tsx`
- Modify: `app/(dashboard)/painel/equipe/page.tsx`
- Modify: `app/(dashboard)/painel/calendario/page.tsx`
- Modify: `app/(dashboard)/painel/metricas/page.tsx`
- Create: `components/ui/crm-surface-contract.test.ts`

**Interfaces:**
- Consumes: `Page`, `PageHeader`, `DataPanel`, `FormPanel`, `InsetGroup`, `MetricBand`.
- Produces: o mesmo tratamento visual para conteúdo equivalente, independentemente do workspace.

- [ ] **Step 1: Escrever contrato CRM em RED**

```ts
for (const source of [finance, pipeline, contacts, tasks, team, calendar, metrics]) {
  expect(source).not.toContain('border border-white/[0.09] bg-[#1e1d22]');
}
expect(pipeline).not.toContain("usesFlatSurface");
expect(tasks).not.toContain("usesFlatSurface");
expect(team).not.toContain("usesFlatSurface");
```

- [ ] **Step 2: Executar RED**

Run: `npx vitest run components/ui/crm-surface-contract.test.ts app/(dashboard)/painel/funil/pipeline-meta.test.ts`

Expected: FAIL por branches visuais `flat` e superfícies quadradas.

- [ ] **Step 3: Migrar financeiro e listas CRM**

Formulário selecionado vira `FormPanel`; tabelas ficam em `DataPanel`. Contatos, tarefas e equipe usam painel externo único e linhas tonais. Remover somente branches de apresentação `flat`, preservando branches de dados, rótulos e permissões.

- [ ] **Step 4: Migrar funil, calendário e métricas**

Kanban e calendário mantêm células/colunas planas dentro de um painel externo. Métricas usam `MetricBand`; controles usam raio 9 px e alvo 44 px.

- [ ] **Step 5: Executar GREEN e gates focados**

Run: `npx vitest run components/ui/crm-surface-contract.test.ts app/(dashboard)/painel/funil/pipeline-meta.test.ts`

Run: `npm run typecheck`

Run: `npx eslint app/'(dashboard)'/painel/financeiro app/'(dashboard)'/painel/funil app/'(dashboard)'/painel/contatos app/'(dashboard)'/painel/tarefas app/'(dashboard)'/painel/equipe app/'(dashboard)'/painel/calendario app/'(dashboard)'/painel/metricas components/ui/crm-surface-contract.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- app/(dashboard)/painel/financeiro app/(dashboard)/painel/funil app/(dashboard)/painel/contatos app/(dashboard)/painel/tarefas app/(dashboard)/painel/equipe app/(dashboard)/painel/calendario app/(dashboard)/painel/metricas components/ui/crm-surface-contract.test.ts
git commit -m "feat: unify CRM workspace surfaces"
```

### Task 4: Migrar operação de vendedor

**Files:**
- Modify: `components/seller/seller-ui.tsx`
- Modify: `components/seller/SellerOperationSettingsForm.tsx`
- Modify: `components/seller/SellerSaleConfirmation.tsx`
- Modify: `app/(dashboard)/painel/produtos/page.tsx`
- Modify: `app/(dashboard)/painel/produtos/[id]/page.tsx`
- Modify: `app/(dashboard)/painel/colecoes/page.tsx`
- Modify: `app/(dashboard)/painel/pedidos/page.tsx`
- Modify: `app/(dashboard)/painel/pedidos/[id]/page.tsx`
- Modify: `app/(dashboard)/painel/pos-venda/page.tsx`
- Modify: `app/(dashboard)/painel/operacao/configuracoes/page.tsx`
- Create: `components/seller/seller-surface-contract.test.ts`

**Interfaces:**
- Consumes: primitivas globais.
- Produces: resumos, listas e formulários do vendedor com o mesmo contrato 15/11/9.

- [ ] **Step 1: Escrever contrato vendedor em RED**

```ts
for (const source of sellerSources) {
  expect(source).not.toContain('border border-white/[0.09] bg-[#1e1d22]');
}
expect(sellerUi).toContain("DataPanel");
expect(settings).toContain("FormPanel");
```

- [ ] **Step 2: Executar RED**

Run: `npx vitest run components/seller/seller-surface-contract.test.ts`

Expected: FAIL nas superfícies quadradas inventariadas.

- [ ] **Step 3: Migrar componentes compartilhados do vendedor**

Atualizar `SellerSummaryStrip`, estados vazios, miniaturas e formulários para primitivas/tokens semânticos. Não adicionar moldura a ícones quando alinhamento e cor bastarem.

- [ ] **Step 4: Migrar rotas do vendedor**

Produtos, coleções, pedidos e pós-venda usam painéis externos; detalhes e formulários internos usam grupos de 11 px. Configuração operacional permanece seção aberta, exceto avisos e grupos interativos.

- [ ] **Step 5: Executar GREEN e gates focados**

Run: `npx vitest run components/seller/seller-surface-contract.test.ts`

Run: `npm run typecheck`

Run: `npx eslint components/seller app/'(dashboard)'/painel/produtos app/'(dashboard)'/painel/colecoes app/'(dashboard)'/painel/pedidos app/'(dashboard)'/painel/pos-venda app/'(dashboard)'/painel/operacao`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- components/seller app/(dashboard)/painel/produtos app/(dashboard)/painel/colecoes app/(dashboard)/painel/pedidos app/(dashboard)/painel/pos-venda app/(dashboard)/painel/operacao
git commit -m "feat: unify seller workspace surfaces"
```

### Task 5: Migrar imobiliário e remover overrides quadrados

**Files:**
- Modify: `app/globals.css`
- Modify: `app/(dashboard)/painel/imoveis/page.tsx`
- Modify: `app/(dashboard)/painel/imoveis/dashboard/page.tsx`
- Modify: `app/(dashboard)/painel/imoveis/mapa/page.tsx`
- Modify: `app/(dashboard)/painel/imoveis/visitas/page.tsx`
- Modify: `app/(dashboard)/painel/imoveis/colecoes/page.tsx`
- Modify: `app/(dashboard)/painel/imoveis/[id]/page.tsx`
- Create: `components/real-estate/real-estate-surface-contract.test.ts`

**Interfaces:**
- Consumes: contrato de painel global.
- Produces: superfícies imobiliárias de 15 px sem arredondar células do mapa, calendário ou tabela.

- [ ] **Step 1: Escrever contrato imobiliário em RED**

```ts
expect(globals).not.toContain(".real-estate-flat-section {\n  border-radius: 0");
expect(globals).not.toMatch(/real-estate-area \.panel\s*\{[^}]*border-radius:\s*var\(--radius-md\)/s);
expect(map).toContain("DataPanel");
```

- [ ] **Step 2: Executar RED**

Run: `npx vitest run components/real-estate/real-estate-surface-contract.test.ts`

Expected: FAIL pelos overrides de 0/11 px.

- [ ] **Step 3: Remover overrides e migrar superfícies externas**

Painéis voltam a 15 px; grupos internos permanecem 11 px. Mapa e grids recortam no contêiner externo, sem raio em cada célula.

- [ ] **Step 4: Executar GREEN e gates focados**

Run: `npx vitest run components/real-estate/real-estate-surface-contract.test.ts`

Run: `npm run typecheck`

Run: `npx eslint app/'(dashboard)'/painel/imoveis components/real-estate/real-estate-surface-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- app/globals.css app/(dashboard)/painel/imoveis components/real-estate/real-estate-surface-contract.test.ts
git commit -m "feat: unify real estate workspace surfaces"
```

### Task 6: Fechar varredura, responsividade e produção

**Files:**
- Modify: `components/ui/product-surface-contract.test.ts`
- Modify: `app/(dashboard)/painel/juridico/**`
- Modify: `app/(dashboard)/painel/financeiro/**`
- Modify: `app/(dashboard)/painel/funil/**`
- Modify: `app/(dashboard)/painel/contatos/**`
- Modify: `app/(dashboard)/painel/tarefas/**`
- Modify: `app/(dashboard)/painel/equipe/**`
- Modify: `app/(dashboard)/painel/calendario/**`
- Modify: `app/(dashboard)/painel/metricas/**`
- Modify: `app/(dashboard)/painel/produtos/**`
- Modify: `app/(dashboard)/painel/colecoes/**`
- Modify: `app/(dashboard)/painel/pedidos/**`
- Modify: `app/(dashboard)/painel/pos-venda/**`
- Modify: `app/(dashboard)/painel/operacao/**`
- Modify: `app/(dashboard)/painel/imoveis/**`
- Modify: `components/legal/**`
- Modify: `components/seller/**`
- Modify: `components/real-estate/**`

**Interfaces:**
- Consumes: todas as migrações anteriores.
- Produces: contrato global fechado e release verificável.

- [ ] **Step 1: Ampliar o contrato final em RED**

O teste percorre `.tsx` sob `app/(dashboard)/painel` e `components`, sinaliza superfícies completas com borda + fundo sem primitiva/raio e mantém allowlist explícita somente para chat, calendário, kanban, tabela e divisores internos.

```ts
expect(squareSurfaces).toEqual([]);
expect(nonSemanticRadiusOverrides).toEqual([]);
expect(sub44InteractiveTargets).toEqual([]);
```

- [ ] **Step 2: Executar RED e corrigir cada ocorrência real**

Run: `npx vitest run components/ui/product-surface-contract.test.ts`

Expected: FAIL listando paths e linhas restantes; corrigir apenas superfícies reais, não divisores/células permitidos.

- [ ] **Step 3: Rodar detector e varreduras mecânicas**

Run: `node C:/Users/kille/.codex/skills/impeccable/scripts/detect.mjs --json --scope layout app components`

Run: `rg -n "gap-\[|p[trblxy]?-\[|m[trblxy]?-\[|z-\[" app components`

Expected: detector sem achados; valores arbitrários restantes documentados como safe-area ou z-index semântico.

- [ ] **Step 4: Validar visualmente rotas representativas**

Desktop e mobile: `/painel/juridico/prazos`, `/painel/juridico/processos`, `/painel/juridico/consulta`, `/painel/financeiro`, `/painel/funil`, `/painel/tarefas`, `/painel/produtos`, `/painel/pedidos`, `/painel/imoveis/mapa`, `/painel/whatsapp`.

Verificar: 15/11/9 px, ausência de cards aninhados, vazios compactos, navegação por teclado, foco visível, alvos 44 px e popovers sem recorte.

- [ ] **Step 5: Executar gates finais**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run lint`

Run: `npm run build`

Run: `git diff --check`

Expected: todos com código 0.

- [ ] **Step 6: Commit final**

```powershell
git add -- components/ui/product-surface-contract.test.ts app components
git commit -m "fix: close product surface consistency gaps"
```

- [ ] **Step 7: Publicar somente após health check e inspeção do diff**

Push da branch atual, deploy Vercel de produção e validação de `/api/health` confirmando o SHA publicado. Nenhuma migração de banco é necessária.
