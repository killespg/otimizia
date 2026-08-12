# Production Base with Rounded Geometry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the visual language currently served in production while retaining the current Liquid Glass branch's rounded geometry and the later reduction of repetitive divider lines.

**Architecture:** Treat production commit `2623e0347b0462bc1289cc07e25840e58ec32d88` as a visual reference, not as a repository rollback target. Keep the current branch's post-production behavior, data, authorization, identity, and accessibility fixes; replace only its Liquid Glass/cinematic presentation with solid production surfaces, then preserve the current radius scale and the `od-band`/`od-rows` separation model. Landing and authenticated product remain separate visual registers even though both consume the same color and radius tokens.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS 4, Vitest, Playwright, Supabase local stack.

## Handoff operacional para outro agente

Esta seção é autocontida e pode ser encaminhada junto com o restante deste
documento. O agente deve ler o plano inteiro antes de editar qualquer arquivo.

### Endereços, referências e estado inicial

| Item | Endereço ou valor |
|---|---|
| Checkout de origem | `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia` |
| Worktree recomendado | `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui` |
| Branch recomendada | `codex/production-rounded-ui` |
| Commit de início do trabalho | `c2a6d5786ba6fd6ebaed3a6728c5cb5ef7ad0fa8` |
| Commit usado somente como referência visual de produção | `2623e0347b0462bc1289cc07e25840e58ec32d88` |
| Plano completo no checkout de origem | `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\docs\superpowers\plans\2026-08-12-production-base-rounded-ui.md` |
| Plano completo dentro do futuro worktree | `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\docs\superpowers\plans\2026-08-12-production-base-rounded-ui.md` |
| Instruções obrigatórias do projeto | `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\AGENTS.md` |
| Contexto do produto | `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\PRODUCT.md` |
| Design system canônico atual | `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\DESIGN.md` |
| Scripts e dependências | `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\package.json` |
| Site em produção | `https://useotimizia.com/` |
| Health que informa ambiente e commit | `https://useotimizia.com/api/health` |
| Configuração local do projeto Vercel | `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.vercel\project.json` |
| Projeto Vercel | `prj_7fbETMmXgCZAexU0vw1DLCdPkCDu` (`otimizia`) |

O endpoint de health informou `environment: production` e commit
`2623e0347b0462bc1289cc07e25840e58ec32d88` em 2026-08-12. O agente deve
verificar novamente o endpoint antes da comparação visual final, porque o
deploy pode mudar depois da redação deste plano.

### Texto pronto para enviar ao agente executor

```text
Implemente integralmente o plano localizado em:
C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\docs\superpowers\plans\2026-08-12-production-base-rounded-ui.md

Objetivo: usar a aparência sólida atualmente publicada em produção, manter a
logo nova de 2026, manter os raios da versão Liquid Glass e reduzir linhas
divisórias repetitivas. Liquid Glass, prisma, blur, refração, grão e a landing
cinematográfica devem sair.

Crie ou reutilize com segurança o worktree:
C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui

Parta exatamente do commit:
c2a6d5786ba6fd6ebaed3a6728c5cb5ef7ad0fa8

Use o commit abaixo apenas como referência visual; não faça reset nem rollback
amplo para ele:
2623e0347b0462bc1289cc07e25840e58ec32d88

Preserve integralmente autorização, RLS, isolamento por organização/workspace,
dados, rotas, ações, avatar, voz, notificações, demos, identidade do Tim,
correções funcionais e paridade entre verticais que entraram depois da produção.

Siga TDD: escreva e execute o teste falhando antes da mudança correspondente.
Faça commits pequenos ao fim de cada tarefa. Execute todas as verificações do
plano. Não aceite testes autenticados pulados como validação. Não publique em
produção; entregue branch, commits, evidências e preview para aprovação.

Antes da resposta final, execute o registro obrigatório do AGENTS.md por meio
de scripts/obsidian-log.ps1 sem incluir segredos ou dados privados.
```

### Preparação segura do worktree

Execute primeiro, no PowerShell:

```powershell
$SourceRepo = 'C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia'
$WorktreeRoot = 'C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui'
$ImplementationBranch = 'codex/production-rounded-ui'
$StartCommit = 'c2a6d5786ba6fd6ebaed3a6728c5cb5ef7ad0fa8'

git -C $SourceRepo status --short --branch
git -C $SourceRepo worktree list --porcelain
git -C $SourceRepo check-ignore -v .worktrees
git -C $SourceRepo show-ref --verify "refs/heads/$ImplementationBranch"
Test-Path -LiteralPath $WorktreeRoot
```

Interpretação obrigatória:

- Se a branch e o diretório não existirem, criar com:

```powershell
git -C $SourceRepo worktree add $WorktreeRoot -b $ImplementationBranch $StartCommit
```

- Se um deles já existir, não apagar, não sobrescrever e não recriar. Conferir
  `git -C $WorktreeRoot status --short --branch` e
  `git -C $WorktreeRoot rev-parse HEAD`. Reutilizar somente se o worktree for o
  caminho indicado, estiver na branch indicada e não contiver trabalho alheio.
- Nunca usar `git reset --hard`, `git checkout -- .`, `git clean -fd` ou remoção
  recursiva para “preparar” o workspace.

Depois de entrar no worktree:

```powershell
Set-Location -LiteralPath $WorktreeRoot
Get-Content -Raw -LiteralPath "$WorktreeRoot\AGENTS.md"
Get-Content -Raw -LiteralPath "$WorktreeRoot\PRODUCT.md"
Get-Content -Raw -LiteralPath "$WorktreeRoot\DESIGN.md"
Get-Content -Raw -LiteralPath "$WorktreeRoot\docs\superpowers\plans\2026-08-12-production-base-rounded-ui.md"
npm ci
npm run typecheck
npm run lint
npm test
```

Se a baseline falhar antes de qualquer edição, o agente deve registrar o erro
exato e investigar a causa. Não deve atribuir uma falha preexistente à mudança
visual nem seguir adiante silenciosamente.

### Inventário absoluto dos arquivos em escopo

Todos os endereços abaixo apontam para o worktree recomendado. O checkout de
origem serve somente para criar o worktree e consultar referências.

#### Criar

- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\lib\production-rounded-ui-contract.test.ts`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\product-navigation-shell.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\test\e2e\production-rounded-ui.spec.ts`

#### Renomear

- De `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\test\e2e\landing-cinematic.spec.ts`
- Para `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\test\e2e\landing-production.spec.ts`

#### Modificar: fundações, documentação e shell

- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\DESIGN.md`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\app\globals.css`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\app\(dashboard)\painel\layout.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\product-nav-groups.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\product-navigation.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\seller-product-navigation.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\legal-product-navigation.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\real-estate-product-navigation.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\mobile-app-nav.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\product-topbar.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\seller-product-topbar.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\legal-product-topbar.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\real-estate-product-topbar.tsx`

#### Modificar: controles, overlays e painel imobiliário

- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\account-settings-button.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\action-drawer.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\real-estate\operation-summary-button.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\real-estate\real-estate-dashboard-header.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\tim\VoicePanel.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\tim\VoiceSheet.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\ui\AnchoredPanel.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\app\(dashboard)\painel\imoveis\dashboard\RealEstateDashboard.tsx`

#### Modificar: redução de linhas nas telas operacionais

- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\app\(dashboard)\painel\configuracoes\page.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\app\(dashboard)\painel\contatos\ContactsExplorer.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\app\(dashboard)\painel\contatos\importar\ContactsCsvImporter.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\app\(dashboard)\painel\financeiro\importar\FinanceCsvImporter.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\app\(dashboard)\painel\funil\relatorio\page.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\app\(dashboard)\painel\imoveis\visitas\page.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\app\(dashboard)\painel\tarefas\page.tsx`

#### Modificar ou restaurar: landing

- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\app\page.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\hero.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\landing-nav.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\mobile-sticky-cta.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\feature-tabs.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\container-scroll-animation.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\dashboard-preview.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\ai-composer.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\pricing.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\FaqAccordion.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\about.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\logo-marquee.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\panel.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\reveal.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\spotlight-card.tsx`

#### Modificar: testes existentes

- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\lib\frontend-route-parity.test.ts`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\lib\real-estate-dashboard-liquid-stage.test.ts`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\test\e2e\landing-responsive.spec.ts`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\test\e2e\landing-no-js.spec.ts`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\test\e2e\critical-flows.spec.ts`

#### Preservar e verificar; modificar somente se a implementação revelar regressão

- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\design-system\logo.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\app\layout.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\app\manifest.ts`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\public\sw.js`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\public\otimizia-logo-2026-dark.png`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\public\otimizia-logo-2026.png`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\public\otimizia-mark-2026-dark.png`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\public\otimizia-mark-2026.png`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\public\otimizia-app-icon-2026.png`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\public\otimizia-app-icon-2026-maskable.png`

#### Remover somente depois de `rg` provar zero referências em runtime

- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\cinematic-scroll-corridor.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\components\landing\dashboard-screenshot.tsx`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\public\backgrounds\liquid-ambient.svg`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\public\backgrounds\dashboard-landscape.webp`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\public\backgrounds\dashboard-landscape-mobile.webp`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\public\landing\painel-imobiliario-mariana.png`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\lib\liquid-glass-contract.test.ts`
- `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\.worktrees\production-rounded-ui\test\e2e\liquid-glass.spec.ts`

### Referências Git que o agente pode consultar sem restaurar em massa

Use comandos pontuais, sempre com o path entre aspas quando contiver
parênteses:

```powershell
git show '2623e03:app/globals.css'
git show '2623e03:app/page.tsx'
git show '2623e03:components/design-system/product-navigation.tsx'
git show '2623e03:components/design-system/mobile-app-nav.tsx'
git show '2623e03:app/(dashboard)/painel/layout.tsx'
git show '2623e03:app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx'
git show '2623e03:components/landing/hero.tsx'
git show '2623e03:components/landing/landing-nav.tsx'
git show '2623e03:components/landing/dashboard-preview.tsx'
git show '2623e03:components/landing/logo-marquee.tsx'
git show '2623e03:components/landing/panel.tsx'
git show '2623e03:components/landing/reveal.tsx'
git show '2623e03:components/landing/spotlight-card.tsx'
```

Os commits pós-produção que devem ser estudados para preservar a redução de
linhas são:

```text
e882788  tira superfícies cinzas e réguas duplicadas
2e81342  troca régua por separação no material
5c3e96e  alinha raios e separação por papel do componente
2e52b99  mantém a faixa de métricas aberta
5baa83f  remove régua por item de filas
d440d1c  simplifica Configurações e remove ajustes inertes
8fc568c  usa faixas alternadas no corpo de tabelas
```

### Resultado que o agente deve entregar

O handoff só está completo quando vier acompanhado de:

1. Caminho do worktree e nome da branch usados.
2. Lista de commits produzidos, um por tarefa ou unidade revisável.
3. Resumo dos arquivos criados, modificados, renomeados e removidos.
4. Saída final de `npm run typecheck`, `npm run lint`, `npm test`,
   `npm run build` e `git diff --check`.
5. Resultado dos E2E desktop e mobile, declarando explicitamente quantos testes
   passaram, falharam e foram pulados.
6. Evidência visual nas larguras `390×844`, `768×1024`, `1440×900` e
   `1728×1117` para a landing, login/signup e as quatro verticais do painel.
7. Confirmação de que a logo nova aparece na landing, autenticação, sidebar,
   PWA e notificações.
8. Confirmação de que autorização, RLS, organização/workspace e dados não foram
   alterados pela restauração visual.
9. URL do preview, se um preview tiver sido autorizado e criado. Não inventar
   ou presumir uma URL antes de a plataforma retorná-la.
10. Registro Obsidian criado conforme
    `C:\Users\kille\Documents\TROCA DE DESIGN SYSTEM OtimizIA\otimizia\AGENTS.md`.

Não fazer deploy de produção, merge ou remoção do worktree sem autorização
explícita do usuário.

## Global Constraints

- Visual baseline: production health endpoint reported commit `2623e0347b0462bc1289cc07e25840e58ec32d88` on 2026-08-12.
- Never run a broad `git checkout 2623e03 -- .`, `git reset`, or revert of all commits after production. That would discard functional work unrelated to the visual direction.
- Preserve the behavior introduced after production, especially money parsing, voice-call cancellation, profile avatar, notification/operation summary data, demo accounts, WhatsApp demo media, multi-vertical shell parity, database grants, and the approved OtimizIA/Tim identity.
- The new OtimizIA logo is an explicit exception to the production visual baseline. Keep the current 2026 wordmark, symbol, PWA icons, proportions, and transparent-image implementation everywhere; never restore the older production logo assets or their blend-mode workaround.
- Canonical identity assets remain `public/otimizia-logo-2026-dark.png`, `public/otimizia-logo-2026.png`, `public/otimizia-mark-2026-dark.png`, `public/otimizia-mark-2026.png`, `public/otimizia-app-icon-2026.png`, and `public/otimizia-app-icon-2026-maskable.png`.
- Preserve the useful line-reduction work from commits `e882788`, `2e81342`, `5c3e96e`, `2e52b99`, `5baa83f`, `d440d1c`, and `8fc568c`.
- Restore the production palette exactly: `#151419` canvas, `#2a292f` primary surface, `#1f1e24` muted surface, `#3a3840` resting border, `#515058` hover border, `#f5f4f7` primary text, `#b2b0b7` secondary text, `#928f98` tertiary text, and `#0b0a0f` sidebar.
- Keep the current radius scale exactly: `12px`, `16px`, `20px`, `24px`, `28px`, `32px`, and `36px` for `--radius-sm` through `--radius-4xl`; `999px` remains restricted to pills, round icons, avatars, and the mobile navigation indicator.
- “Fewer lines” means: keep borders for inputs, focus, panel perimeters, table headers, calendars, kanban columns, and genuine state boundaries; remove per-row rules, duplicate adjoining borders, decorative section rules, and borders used only to compensate for weak spacing.
- Lists use spacing on mobile and `od-rows` alternating fill from `sm` upward. Related metrics and filters use a single `od-band` surface. Settings sections stay open under `.settings-hub`, except the danger zone.
- No active runtime Liquid Glass: no backdrop blur, refraction, grain, glass sheen, distortion filter, glass-only data attributes, cinematic light fields, or elevated translucent dock.
- Do not reintroduce wide decorative shadows. A component may use either a quiet perimeter border or a short functional shadow, not both.
- Inter remains the product and landing typeface. Violet remains restricted to action, selection, and focus. Body text must meet WCAG AA and interactive targets remain at least `44px` square.
- Keep `components/landing` isolated from `components/design-system`; marketing components do not become central product primitives.
- A production deployment is outside this plan's automatic execution. Finish with a preview build and explicit approval before any production release.

## File Structure

### Create

- `lib/production-rounded-ui-contract.test.ts` — source-level contract for palette, radii, solid materials, and allowed separators.
- `components/design-system/product-navigation-shell.tsx` — shared solid desktop sidebar and current mobile navigation handoff, using current routes and permissions.
- `test/e2e/production-rounded-ui.spec.ts` — computed-style and interaction checks for authenticated desktop/mobile surfaces.

### Rename

- `test/e2e/landing-cinematic.spec.ts` → `test/e2e/landing-production.spec.ts` — keep behavioral coverage while replacing cinematic assertions.

### Modify

- `DESIGN.md` — make production-base/rounded/low-divider direction canonical and remove Liquid Glass as an active system rule.
- `app/globals.css` — restore production tokens and solid components; retain the current radius scale and low-divider primitives.
- `app/(dashboard)/painel/layout.tsx` — restore the production background/shell composition while retaining current data queries and props.
- `components/design-system/product-nav-groups.tsx` — retain navigation types/group behavior; remove the two-level Liquid Glass shell implementation.
- `components/design-system/product-navigation.tsx`
- `components/design-system/seller-product-navigation.tsx`
- `components/design-system/legal-product-navigation.tsx`
- `components/design-system/real-estate-product-navigation.tsx` — send each vertical's current routes, permissions, badges, avatar, and workspace data into the shared production-style shell.
- `components/design-system/mobile-app-nav.tsx` — restore a solid bottom bar visual while retaining current menu, focus management, VoiceSheet, and route feedback.
- `components/design-system/product-topbar.tsx`
- `components/design-system/seller-product-topbar.tsx`
- `components/design-system/legal-product-topbar.tsx`
- `components/design-system/real-estate-product-topbar.tsx` — remove glass-only wrappers while preserving account, notification, summary, and fullscreen behaviors.
- `components/design-system/account-settings-button.tsx`
- `components/design-system/action-drawer.tsx`
- `components/real-estate/operation-summary-button.tsx`
- `components/real-estate/real-estate-dashboard-header.tsx`
- `components/tim/VoicePanel.tsx`
- `components/tim/VoiceSheet.tsx`
- `components/ui/AnchoredPanel.tsx` — migrate overlays and controls to solid panel primitives.
- `app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx` — remove liquid-stage presentation without removing the current dashboard data and actions.
- `app/(dashboard)/painel/configuracoes/page.tsx`
- `app/(dashboard)/painel/contatos/ContactsExplorer.tsx`
- `app/(dashboard)/painel/contatos/importar/ContactsCsvImporter.tsx`
- `app/(dashboard)/painel/financeiro/importar/FinanceCsvImporter.tsx`
- `app/(dashboard)/painel/funil/relatorio/page.tsx`
- `app/(dashboard)/painel/imoveis/visitas/page.tsx`
- `app/(dashboard)/painel/tarefas/page.tsx` — preserve and normalize the low-divider patterns.
- `app/page.tsx`
- `components/landing/hero.tsx`
- `components/landing/landing-nav.tsx`
- `components/landing/mobile-sticky-cta.tsx`
- `components/landing/feature-tabs.tsx`
- `components/landing/container-scroll-animation.tsx`
- `components/landing/dashboard-preview.tsx`
- `components/landing/ai-composer.tsx`
- `components/landing/pricing.tsx`
- `components/landing/FaqAccordion.tsx`
- `components/landing/about.tsx` — restore the production landing composition and apply rounded/low-divider treatment.
- `test/e2e/landing-responsive.spec.ts`
- `test/e2e/landing-no-js.spec.ts`
- `test/e2e/critical-flows.spec.ts`
- `lib/frontend-route-parity.test.ts` — replace Liquid Glass structure assertions with production-rounded shell contracts while preserving route and domain behavior checks.

### Restore from the production commit, then reconcile current accessibility fixes

- `components/landing/logo-marquee.tsx`
- `components/landing/panel.tsx`
- `components/landing/reveal.tsx`
- `components/landing/spotlight-card.tsx`

### Remove only after `rg` proves zero runtime references

- `components/landing/cinematic-scroll-corridor.tsx`
- `components/landing/dashboard-screenshot.tsx`
- `public/backgrounds/liquid-ambient.svg`
- `public/backgrounds/dashboard-landscape.webp`
- `public/backgrounds/dashboard-landscape-mobile.webp`
- `public/landing/painel-imobiliario-mariana.png`
- `lib/liquid-glass-contract.test.ts`
- `test/e2e/liquid-glass.spec.ts`

### Verify and preserve without changing unless a regression is found

- `components/design-system/logo.tsx` — keep the new 2026 wordmark/symbol sources and `1280 / 277` wordmark ratio.
- `app/layout.tsx` — keep the new 2026 favicon and Apple touch icon.
- `app/manifest.ts` — keep the new regular and maskable 2026 PWA icons.
- `public/sw.js` — keep the new 2026 notification icon and badge.

---

### Task 1: Lock the Hybrid Direction in Tests and Documentation

**Files:**

- Create: `lib/production-rounded-ui-contract.test.ts`
- Modify: `DESIGN.md`
- Test: `lib/production-rounded-ui-contract.test.ts`

**Interfaces:**

- Consumes: `app/globals.css` and the active runtime source tree.
- Produces: one executable contract that later tasks use as the visual migration gate.

- [ ] **Step 1: Add a failing source contract for the approved palette, radii, and line primitives**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("production base with rounded geometry", () => {
  it("uses the production palette and the current radius scale", () => {
    const css = read("app/globals.css");
    for (const token of [
      "--od-bg: #151419",
      "--od-surface: #2a292f",
      "--od-muted-surface: #1f1e24",
      "--od-border: #3a3840",
      "--od-border-hover: #515058",
      "--od-text: #f5f4f7",
      "--od-text-2: #b2b0b7",
      "--od-text-3: #928f98",
      "--od-sidebar: #0b0a0f",
      "--radius-sm: 12px",
      "--radius-md: 16px",
      "--radius-lg: 20px",
      "--radius-xl: 24px",
      "--radius-2xl: 28px",
      "--radius-3xl: 32px",
      "--radius-4xl: 36px",
    ]) expect(css).toContain(token);
  });

  it("keeps low-divider structure without active glass materials", () => {
    const css = read("app/globals.css");
    expect(css).toContain(".od-band");
    expect(css).toContain(".od-rows > *:nth-child(even)");
    expect(css).toContain(".settings-hub [data-settings-card]");
    expect(css).not.toMatch(/--od-glass-|backdrop-filter|od-glass-distortion/);
  });

  it("keeps the new OtimizIA identity instead of restoring production artwork", () => {
    const logo = read("components/design-system/logo.tsx");
    const layout = read("app/layout.tsx");
    const manifest = read("app/manifest.ts");
    const serviceWorker = read("public/sw.js");

    expect(logo).toContain("const WORDMARK_RATIO = 1280 / 277");
    expect(logo).toContain('src="/otimizia-logo-2026-dark.png"');
    expect(logo).toContain('src="/otimizia-mark-2026-dark.png"');
    expect(logo).not.toMatch(/className=\{[^}]*mix-blend-screen/);
    expect(layout).toContain('icon: "/otimizia-app-icon-2026.png"');
    expect(manifest).toContain('src: "/otimizia-app-icon-2026.png"');
    expect(manifest).toContain('src: "/otimizia-app-icon-2026-maskable.png"');
    expect(serviceWorker).toContain('icon: "/otimizia-app-icon-2026.png"');
    expect(serviceWorker).toContain('badge: "/otimizia-mark-2026.png"');
  });
});
```

- [ ] **Step 2: Run the new contract and verify it fails against the current Liquid Glass implementation**

Run: `npm test -- lib/production-rounded-ui-contract.test.ts`

Expected: FAIL on the production palette assertions and the active `--od-glass-*` / `backdrop-filter` assertions.

- [ ] **Step 3: Rewrite the canonical design direction in `DESIGN.md`**

Replace the active Liquid Glass material sections with these durable rules:

```markdown
## Direção visual: base de produção, geometria suave

O produto usa as superfícies sólidas e a hierarquia visual do commit de
produção `2623e0347b0462bc1289cc07e25840e58ec32d88`. A experiência Liquid
Glass foi encerrada; não é uma camada ativa do produto nem da landing.

O que permanece do experimento é somente a geometria: raios de 12 a 36 px,
com 999 px reservado a pílulas, avatares e círculos reais.

Linhas têm função, não decoração. Controles, perímetros de painel, cabeçalhos
de tabela, calendários e kanban podem usar borda. Listas comuns não recebem
uma régua por item; usam espaço no mobile e alternância sutil via `.od-rows`
no desktop. Métricas e filtros relacionados usam uma única faixa `.od-band`.
```

Also replace current canvas/surface values in the document with the exact production palette listed in Global Constraints and retain the existing sections about multi-vertical parity, avatar, real authorization, empty states, and `44px` targets.

Add an identity rule stating that the 2026 logo supersedes the production artwork: the visual rollback must not change `LogoWordmark`, `LogoMark`, manifest icons, install icons, notification icons, or their current asset paths.

- [ ] **Step 4: Run the contract again and confirm that documentation alone does not make it pass**

Run: `npm test -- lib/production-rounded-ui-contract.test.ts`

Expected: FAIL for `app/globals.css`; this proves later implementation tasks, not documentation text, close the contract.

- [ ] **Step 5: Commit the direction and failing contract**

```powershell
git add DESIGN.md lib/production-rounded-ui-contract.test.ts
git commit -m "test(ui): define production base with rounded geometry"
```

---

### Task 2: Restore Production Foundations and Keep the Rounded Scale

**Files:**

- Modify: `app/globals.css`
- Test: `lib/production-rounded-ui-contract.test.ts`

**Interfaces:**

- Consumes: palette/radius contract from Task 1.
- Produces: solid `panel`, `panel-soft`, `card`, `field`, `btn`, `btn-secondary`, `btn-soft`, `od-band`, and `od-rows` primitives for all later tasks.

- [ ] **Step 1: Restore the production color tokens without copying the old radius tokens**

In `:root`, restore:

```css
--od-bg: #151419;
--od-surface: #2a292f;
--od-muted-surface: #1f1e24;
--od-border: #3a3840;
--od-border-hover: #515058;
--od-text: #f5f4f7;
--od-text-2: #b2b0b7;
--od-text-3: #928f98;
--od-accent: #8757f0;
--od-accent-hover: #a78bfa;
--od-accent-tint: #241c38;
--od-sidebar: #0b0a0f;
--od-sidebar-active: rgba(255, 255, 255, 0.07);
```

Delete `--od-content-*`, `--od-glass-*`, the landscape canvas variables, and all CSS distortion/grain/reflection tokens. Keep the radius values from Global Constraints unchanged.

- [ ] **Step 2: Rebuild solid component primitives with the rounded geometry**

Use these base rules as the target contract:

```css
.panel,
.card,
.card-quiet,
.panel-soft,
.assistant-sheet,
.voice-panel,
.dashboard-customize-panel,
.mobile-create-menu {
  border: 1px solid var(--od-border);
  border-radius: var(--radius-md);
  background: var(--od-surface);
  box-shadow: none;
}

.panel-soft,
.card-quiet { background: var(--od-muted-surface); }

.od-band {
  border: 0;
  border-radius: var(--radius-md);
  background: var(--od-muted-surface);
  box-shadow: none;
}

@media (min-width: 640px) {
  .od-rows > *:nth-child(even) { background: rgba(255, 255, 255, 0.025); }
}
```

Inputs use `var(--radius-sm)`, cards/panels use `var(--radius-md)`, feature/marketing stages may use `var(--radius-lg)`, and drawers/sheets use `var(--radius-xl)`. Do not apply `--radius-2xl` through `--radius-4xl` to dense operational cards.

- [ ] **Step 3: Remove active Liquid Glass and cinematic CSS blocks**

Delete selectors and declarations rooted at:

```text
.od-chrome
.liquid-glass-control
.liquid-glass-dock
.product-nav-glass-shell
.liquid-glass-scrollbar
.landing-liquid-*
.landing-cinematic-*
[data-liquid-*]
```

Also remove `backdrop-filter`, `-webkit-backdrop-filter`, `filter: url(#od-glass-distortion)`, glass pseudo-elements, reflection gradients, and transparency-specific media fallbacks. Retain `prefers-reduced-motion`, contrast, focus, touch-target, and no-JS rules that are not glass-specific.

- [ ] **Step 4: Run the foundation contract**

Run: `npm test -- lib/production-rounded-ui-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Run CSS-dependent unit contracts to expose remaining runtime references**

Run: `npm test -- lib/frontend-route-parity.test.ts lib/liquid-glass-contract.test.ts`

Expected: `frontend-route-parity` reports only assertions tied to the old shell/material; `liquid-glass-contract` fails and remains scheduled for replacement in Task 6.

- [ ] **Step 6: Commit the foundational theme**

```powershell
git add app/globals.css
git commit -m "style(ui): restore production surfaces with rounded geometry"
```

---

### Task 3: Restore the Production Product Shell Without Losing Current Behavior

**Files:**

- Create: `components/design-system/product-navigation-shell.tsx`
- Modify: `app/(dashboard)/painel/layout.tsx`
- Modify: `components/design-system/product-nav-groups.tsx`
- Modify: `components/design-system/product-navigation.tsx`
- Modify: `components/design-system/seller-product-navigation.tsx`
- Modify: `components/design-system/legal-product-navigation.tsx`
- Modify: `components/design-system/real-estate-product-navigation.tsx`
- Modify: `components/design-system/mobile-app-nav.tsx`
- Modify: `components/design-system/product-topbar.tsx`
- Modify: `components/design-system/seller-product-topbar.tsx`
- Modify: `components/design-system/legal-product-topbar.tsx`
- Modify: `components/design-system/real-estate-product-topbar.tsx`
- Test: `lib/frontend-route-parity.test.ts`
- Test: `components/design-system/product-navigation-shell.tsx` through server-rendered markup in `lib/production-rounded-ui-contract.test.ts`

**Interfaces:**

- Consumes: `NavGroup`, `NavItem`, current workspace switcher data, badges, avatar URL, logout action, mobile quick actions, and notification/operation summary props.
- Produces: `ProductNavigationShell(props)` used by all four vertical navigation adapters.

- [ ] **Step 1: Add a failing markup contract for a single production-style desktop sidebar**

Extend `lib/production-rounded-ui-contract.test.ts` with server-rendered assertions:

```ts
expect(html.match(/<aside/g)).toHaveLength(1);
expect(html).toContain('data-product-sidebar="solid"');
expect(html).toContain('data-mobile-nav');
expect(html).not.toContain('data-liquid-glass-shell');
expect(html).not.toContain('liquid-glass-dock');
expect(html).not.toContain('product-nav-glass-shell');
```

Run: `npm test -- lib/production-rounded-ui-contract.test.ts`

Expected: FAIL because `ProductNavigationShell` does not exist and the active source still emits glass markers.

- [ ] **Step 2: Implement the shared solid sidebar using production structure and current data**

Create `ProductNavigationShell` with this public interface:

```ts
export type ProductNavigationShellProps = {
  namespace: string;
  groups: NavGroup[];
  logoHref: string;
  workspaceLabel: string;
  organizationName: string;
  displayName: string;
  avatarUrl?: string | null;
  workspaceOptions?: Array<{ value: string; label: string }>;
  workspaceKey?: string;
  onLogout: () => void | Promise<void>;
  desktopAriaLabel: string;
  mobileTabs: [NavItem, NavItem, NavItem];
  mobileTimHref: string;
  mobileGroups: NavGroup[];
  mobileQuickActions?: Array<{ href: string; label: string; icon: NavIcon }>;
  mobileAriaLabel: string;
};
```

Base the desktop DOM on `git show 2623e03:components/design-system/product-navigation.tsx`: one collapsible `aside`, solid `--od-sidebar`, one navigation column, one footer, and no detail pane/resizer. Keep `WorkspaceSwitcher`, `UserAvatar`, current badges, route prefetch, collapsed-state persistence, and real logout behavior.

Use the current `LogoWordmark` in the expanded sidebar and `LogoMark` in the collapsed sidebar. Copy the production shell geometry only; do not copy its old image paths, dimensions, blend modes, or logo markup.

- [ ] **Step 3: Convert all four vertical adapters to the shared shell**

Keep every current route and permission branch. Only replace `TwoLevelNav` calls with `ProductNavigationShell`; do not copy production route arrays over current arrays. Preserve:

```text
generic: legal and real-estate permission-gated groups
seller: products, orders, after-sales, reports, and enabled module rules
legal: finance visibility and workspace switching
real estate: properties, map, visits, collections, commissions, contacts, funnel, and team
```

- [ ] **Step 4: Restore the solid mobile bottom bar while retaining VoiceSheet and focus restoration**

Use the production fixed-bar structure (`border-t`, `bg-od-sidebar`, five equal slots) as the visual reference. Keep the current Tim voice action behavior, but render it as the central ordinary tab/action: no floating offset, gradient orb, glow, ring cutout, or glass dock. Keep `Escape`, focus return, menu dialog semantics, `aria-expanded`, safe-area padding, and `44px` targets.

- [ ] **Step 5: Remove glass-only wrappers from all topbars**

Topbars return to solid/transparent production composition with at most one bottom boundary. Keep current `AccountSettingsButton`, `OperationSummaryButton`, notification counts, fullscreen control, avatar, and search behavior. Replace `liquid-glass-control` with `btn-soft`, `btn-secondary`, `field`, or a simple icon button according to the control's role.

- [ ] **Step 6: Reconcile `app/(dashboard)/painel/layout.tsx` with production composition**

Restore production's base canvas and background stacking without reverting current server data work. Keep all current queries for avatar, notification preferences, overdue tasks, operation summary, membership, plan access, and workspace options. Remove only Liquid-Glass-specific canvas/image wrappers.

- [ ] **Step 7: Update route-parity assertions to the new shell contract**

Replace assertions for `TwoLevelNav`, `data-liquid-glass-shell`, resizer, detail pane, and liquid scrollbar with:

```ts
expect(sharedNavigation).toContain("ProductNavigationShell");
expect(shell).toContain('data-product-sidebar="solid"');
expect(shell).toContain("WorkspaceSwitcher");
expect(shell).toContain("UserAvatar");
expect(shell).not.toMatch(/liquid-glass|data-liquid/);
```

Keep every route, authorization, dashboard action, avatar asset, and cross-vertical assertion that does not prescribe glass presentation.

- [ ] **Step 8: Run shell tests**

Run: `npm test -- lib/production-rounded-ui-contract.test.ts lib/frontend-route-parity.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit the product shell restoration**

```powershell
git add 'app/(dashboard)/painel/layout.tsx' components/design-system lib/frontend-route-parity.test.ts lib/production-rounded-ui-contract.test.ts
git commit -m "refactor(shell): restore solid production navigation"
```

---

### Task 4: Migrate Overlays, Controls, and the Real-Estate Dashboard Off Glass

**Files:**

- Modify: `components/design-system/account-settings-button.tsx`
- Modify: `components/design-system/action-drawer.tsx`
- Modify: `components/real-estate/operation-summary-button.tsx`
- Modify: `components/real-estate/real-estate-dashboard-header.tsx`
- Modify: `components/tim/VoicePanel.tsx`
- Modify: `components/tim/VoiceSheet.tsx`
- Modify: `components/ui/AnchoredPanel.tsx`
- Modify: `app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx`
- Test: `lib/production-rounded-ui-contract.test.ts`
- Test: `lib/real-estate-dashboard-liquid-stage.test.ts` renamed in-place by content to test the solid dashboard contract.

**Interfaces:**

- Consumes: solid panel/control primitives from Task 2 and current domain actions/data.
- Produces: solid drawers, menus, voice panels, quick settings, operation summary, and real-estate dashboard surfaces.

- [ ] **Step 1: Extend the source contract across active runtime files**

Add this file list to `lib/production-rounded-ui-contract.test.ts` and assert the joined source does not match `/liquid-glass|data-liquid|od-chrome|product-nav-glass|landing-cinematic/`:

```ts
const runtimeFiles = [
  "components/design-system/account-settings-button.tsx",
  "components/design-system/action-drawer.tsx",
  "components/real-estate/operation-summary-button.tsx",
  "components/real-estate/real-estate-dashboard-header.tsx",
  "components/tim/VoicePanel.tsx",
  "components/tim/VoiceSheet.tsx",
  "components/ui/AnchoredPanel.tsx",
  "app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx",
];
```

Run: `npm test -- lib/production-rounded-ui-contract.test.ts`

Expected: FAIL with current glass class/data-marker references.

- [ ] **Step 2: Map glass names to role-based solid primitives**

Apply this mapping consistently:

```text
glass / glass-soft overlay -> panel / panel-soft plus modal positioning
liquid-glass-control search -> field
liquid-glass-control action -> btn-soft or icon-button
liquid-glass-control--tinted -> btn
od-chrome wrapper -> semantic header/aside with bg-od-sidebar or bg-od-surface
data-liquid-stage -> data-dashboard-surface="solid"
data-liquid-metric-rail -> data-metric-band="solid"
```

Do not change action handlers, form actions, Supabase calls, routes, focus return, or dialog semantics.

- [ ] **Step 3: Restore the real-estate dashboard's production hierarchy with current data**

Use `git show '2623e03:app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx'` only as a presentation reference. Keep current metrics, current operation summary, current topbar account controls, current filters, report download, Tim CTA, and all current empty states. Render metrics in one `od-band`, render actionable modules as `panel`, and render repeated rows with `od-rows`; remove translucent rails, prism reflections, floating cells, and hover lifts.

- [ ] **Step 4: Rewrite the dashboard material test around solid surfaces**

Keep the existing data/action assertions, but replace Liquid Glass assertions with:

```ts
expect(dashboard).toContain('data-dashboard-surface="solid"');
expect(dashboard).toContain('data-metric-band="solid"');
expect(dashboard).toContain("od-band");
expect(dashboard).not.toMatch(/data-liquid|liquid-glass|backdrop-blur/);
```

Rename the `describe` string and test titles so the file no longer claims Liquid Glass is required. A later cleanup may rename the filename after all imports/references are confirmed absent.

- [ ] **Step 5: Run focused component contracts**

Run: `npm test -- lib/production-rounded-ui-contract.test.ts lib/real-estate-dashboard-liquid-stage.test.ts lib/frontend-route-parity.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the material migration**

```powershell
git add components/design-system components/real-estate components/tim components/ui 'app/(dashboard)/painel/imoveis/dashboard' lib
git commit -m "refactor(ui): replace glass chrome with solid surfaces"
```

---

### Task 5: Normalize “Fewer Lines” Across Operational Screens

**Files:**

- Modify: `app/globals.css`
- Modify: `app/(dashboard)/painel/configuracoes/page.tsx`
- Modify: `app/(dashboard)/painel/contatos/ContactsExplorer.tsx`
- Modify: `app/(dashboard)/painel/contatos/importar/ContactsCsvImporter.tsx`
- Modify: `app/(dashboard)/painel/financeiro/importar/FinanceCsvImporter.tsx`
- Modify: `app/(dashboard)/painel/funil/relatorio/page.tsx`
- Modify: `app/(dashboard)/painel/imoveis/visitas/page.tsx`
- Modify: `app/(dashboard)/painel/tarefas/page.tsx`
- Test: `lib/frontend-route-parity.test.ts`
- Test: `lib/production-rounded-ui-contract.test.ts`

**Interfaces:**

- Consumes: `od-band`, `od-rows`, `settings-hub`, `panel`, and `panel-soft`.
- Produces: repeatable separator rules that other routes can adopt without new visual primitives.

- [ ] **Step 1: Add source assertions for the approved low-divider primitives**

Assert:

```ts
expect(settings).toContain("settings-hub");
expect(settings).toContain("settings-danger");
expect(contacts).toContain("od-rows");
expect(contactsImport).toContain('<tbody className="od-rows">');
expect(financeImport).toContain('<tbody className="od-rows">');
expect(report).toContain('<tbody className="od-rows">');
expect(visits).toContain("od-rows");
expect(tasks).toContain("od-rows");
```

Run: `npm test -- lib/frontend-route-parity.test.ts lib/production-rounded-ui-contract.test.ts`

Expected: FAIL only for routes that still use per-row rules.

- [ ] **Step 2: Apply the line budget by component role**

Use this exact decision table:

| Component role | Boundary |
|---|---|
| Input/select/textarea | one full border |
| Standalone actionable panel | one perimeter border |
| Repeated list row | no border; spacing on mobile, `od-rows` fill on desktop |
| Table | one header-bottom border; `od-rows` body |
| Metric/filter group | one `od-band`, no child perimeters |
| Settings section | open, no perimeter; danger zone gets tinted `settings-danger` surface |
| Calendar/Kanban grid | structural grid lines retained |
| Empty/error state | surface only when it contains an action; otherwise spacing and text |

Remove `divide-y`, `border-b ... last:border-b-0`, and paired `border-t`/`border-b` patterns only where the table says the boundary is redundant. Do not remove focus rings or semantic state borders.

- [ ] **Step 3: Preserve variant behavior instead of flattening all workspaces**

Where a file has generic, seller, legal, or real-estate branches, keep the branch and change only its separator strategy. Do not make a generic route depend on a real-estate-only class. Keep the current authorization and workspace-key conditions unchanged.

- [ ] **Step 4: Run the line contracts and relevant domain tests**

Run: `npm test -- lib/frontend-route-parity.test.ts lib/production-rounded-ui-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the low-divider sweep**

```powershell
git add app/globals.css 'app/(dashboard)/painel' lib/frontend-route-parity.test.ts lib/production-rounded-ui-contract.test.ts
git commit -m "style(product): reduce repetitive divider lines"
```

---

### Task 6: Restore the Production Landing Composition with Rounded, Quieter Surfaces

**Files:**

- Modify: `app/page.tsx`
- Restore/Modify: `components/landing/logo-marquee.tsx`
- Restore/Modify: `components/landing/panel.tsx`
- Restore/Modify: `components/landing/reveal.tsx`
- Restore/Modify: `components/landing/spotlight-card.tsx`
- Modify: `components/landing/hero.tsx`
- Modify: `components/landing/landing-nav.tsx`
- Modify: `components/landing/mobile-sticky-cta.tsx`
- Modify: `components/landing/feature-tabs.tsx`
- Modify: `components/landing/container-scroll-animation.tsx`
- Modify: `components/landing/dashboard-preview.tsx`
- Modify: `components/landing/ai-composer.tsx`
- Modify: `components/landing/pricing.tsx`
- Modify: `components/landing/FaqAccordion.tsx`
- Modify: `components/landing/about.tsx`
- Modify: `app/globals.css`
- Test: `test/e2e/landing-production.spec.ts`
- Test: `test/e2e/landing-responsive.spec.ts`
- Test: `test/e2e/landing-no-js.spec.ts`

**Interfaces:**

- Consumes: the production landing files from commit `2623e03`, current approved identity assets, current accessibility/no-JS fixes, and solid rounded CSS primitives.
- Produces: the production information architecture and interactive demo without cinematic/Liquid Glass treatment.

- [ ] **Step 1: Rename the cinematic spec and turn its first assertions into a failing production-layout contract**

Run:

```powershell
git mv test/e2e/landing-cinematic.spec.ts test/e2e/landing-production.spec.ts
```

Replace cinematic/prism/material assertions with these visible outcomes:

```ts
await expect(page.getByRole("heading", { name: /A IA atende seu WhatsApp/i })).toBeVisible();
await expect(page.getByText("Feito para quem trabalha sozinho e para equipes inteiras")).toBeVisible();
await expect(page.getByRole("heading", { name: /O que muda de profissão/i })).toBeVisible();
await expect(page.getByRole("heading", { name: /Um painel só/i })).toBeVisible();
await expect(page.locator('[data-dashboard-preview="interactive"]')).toBeVisible();
await expect(page.locator('[data-landing-cinematic]')).toHaveCount(0);
await expect(page.locator('[data-prisma-panel-frame]')).toHaveCount(0);
```

Run: `npx playwright test test/e2e/landing-production.spec.ts --project=desktop-chromium`

Expected: FAIL on the production heading/composition and the absence of current cinematic markers.

- [ ] **Step 2: Restore the production page order without restoring production bugs**

Rebuild `app/page.tsx` from the production order:

```text
LandingNav
Hero
audience/logo marquee
profession FeatureTabs
interactive DashboardPreview
Tim spotlight + AiComposer
Pricing
FAQ
About
final CTA
footer
```

Use `git show 2623e03:app/page.tsx` and the four deleted production components as source references. Retain the current approved logo assets, current FAQ copy corrections, semantic tabs, keyboard behavior, mobile menu dialog, no-JS content visibility, and all `44px` targets.

The landing navigation and footer must render the current `LogoWordmark`; mobile/compact brand marks must use the current `LogoMark`. The production commit supplies layout and information architecture only, never its older artwork.

- [ ] **Step 3: Apply the requested rounding without reviving glass**

Use `var(--radius-md)` for standard landing panels, `var(--radius-lg)` for the interactive dashboard frame and major marketing stages, `var(--radius-sm)` for controls, and full pills only for intentional CTA/tag shapes. No backdrop filter, translucent stage, prism frame, colored outer glow, or animated cinematic light.

- [ ] **Step 4: Reduce landing lines while retaining section rhythm**

Remove `border-t` from every generic `Section`. Separate chapters through spacing and the production `raised` background alternation. Keep one border above the footer and a perimeter around a real interactive panel. FAQ and comparison rows use `lp-rows`/alternating fill instead of a rule per row. The final CTA uses one surface, not a bordered card inside another section.

- [ ] **Step 5: Restore the interactive dashboard preview**

Use `DashboardPreview`, not the static `DashboardScreenshot`. Add `data-dashboard-preview="interactive"` to its root. Keep its workspace switcher, screen controls, keyboard reachability, and responsive overflow. Remove the static screenshot/prism/laptop opening path from `ContainerScroll`.

- [ ] **Step 6: Run the landing suites in both projects**

Run:

```powershell
npx playwright test test/e2e/landing-production.spec.ts test/e2e/landing-responsive.spec.ts test/e2e/landing-no-js.spec.ts --project=desktop-chromium
npx playwright test test/e2e/landing-production.spec.ts test/e2e/landing-responsive.spec.ts test/e2e/landing-no-js.spec.ts --project=mobile-chromium
```

Expected: PASS with no horizontal overflow, no-JS content visible, functional menu/tabs/FAQ, interactive dashboard reachable, and no cinematic/prism markers.

- [ ] **Step 7: Commit the landing restoration**

```powershell
git add app/page.tsx app/globals.css components/landing test/e2e/landing-production.spec.ts test/e2e/landing-responsive.spec.ts test/e2e/landing-no-js.spec.ts
git commit -m "refactor(landing): restore production layout with rounded surfaces"
```

---

### Task 7: Retire Liquid Glass Artifacts and Replace the E2E Contract

**Files:**

- Create: `test/e2e/production-rounded-ui.spec.ts`
- Remove: `lib/liquid-glass-contract.test.ts`
- Remove: `test/e2e/liquid-glass.spec.ts`
- Remove: `components/landing/cinematic-scroll-corridor.tsx`
- Remove: `components/landing/dashboard-screenshot.tsx`
- Remove: `public/backgrounds/liquid-ambient.svg`
- Remove: `public/backgrounds/dashboard-landscape.webp`
- Remove: `public/backgrounds/dashboard-landscape-mobile.webp`
- Remove: `public/landing/painel-imobiliario-mariana.png`
- Modify: `test/e2e/critical-flows.spec.ts`
- Modify: `lib/production-rounded-ui-contract.test.ts`

**Interfaces:**

- Consumes: completed product and landing migrations.
- Produces: a positive production-rounded UI contract and zero active Liquid Glass artifacts.

- [ ] **Step 1: Prove every removal target has zero runtime references**

Run:

```powershell
rg -n --glob '!docs/**' --glob '!node_modules/**' "cinematic-scroll-corridor|dashboard-screenshot|liquid-ambient|dashboard-landscape|painel-imobiliario-mariana|liquid-glass|landing-cinematic|landing-liquid|data-liquid|od-chrome|od-glass-distortion|backdrop-filter" .
```

Expected: matches only in the two obsolete Liquid Glass test files or comments/docs scheduled for removal/update. If a runtime match remains, migrate it in Task 3, 4, or 6 before deleting anything.

- [ ] **Step 2: Remove only the now-unreferenced files**

Use `apply_patch` for text files and explicit `Remove-Item -LiteralPath` only for the verified binary assets listed above. Do not remove current logo/Tim assets or any file outside the explicit list.

- [ ] **Step 3: Add computed-style E2E coverage for the new direction**

In `test/e2e/production-rounded-ui.spec.ts`, authenticate with the existing E2E fixtures and assert on at least one panel, one input, one sidebar, one list, and the mobile nav:

```ts
const style = await locator.evaluate((element) => {
  const css = getComputedStyle(element);
  return {
    backgroundColor: css.backgroundColor,
    borderRadius: css.borderRadius,
    backdropFilter: css.backdropFilter,
    boxShadow: css.boxShadow,
  };
});
expect(style.backdropFilter).toBe("none");
expect(parseFloat(style.borderRadius)).toBeGreaterThanOrEqual(12);
```

Also verify that opening the mobile menu and VoiceSheet traps focus, closes with `Escape`, returns focus to the trigger, and does not alter route authorization.

- [ ] **Step 4: Preserve critical-flow behavior while changing visual selectors**

Update `critical-flows.spec.ts` only where it names removed Liquid Glass markers or floating dock geometry. Keep login, restricted-user permissions, task/contact flows, mobile touch targets, and privacy assertions unchanged.

- [ ] **Step 5: Run the replacement E2E and unit contracts**

Run:

```powershell
npm test -- lib/production-rounded-ui-contract.test.ts lib/frontend-route-parity.test.ts
npx playwright test test/e2e/production-rounded-ui.spec.ts test/e2e/critical-flows.spec.ts --project=desktop-chromium
npx playwright test test/e2e/production-rounded-ui.spec.ts test/e2e/critical-flows.spec.ts --project=mobile-chromium
```

Expected: PASS. Authenticated tests must execute; a skipped suite caused by missing E2E fixtures is not acceptance.

- [ ] **Step 6: Commit the cleanup and replacement tests**

```powershell
git add -A
git commit -m "test(ui): retire liquid glass contracts"
```

---

### Task 8: Cross-Vertical Visual QA and Release Gate

**Files:**

- Modify only if QA finds a defect: files already named in Tasks 2–7.
- Test: full Vitest and Playwright suites.

**Interfaces:**

- Consumes: completed hybrid UI.
- Produces: evidence that the visual change preserved behavior and is safe for a preview release.

- [ ] **Step 1: Start the local dependencies without accepting skipped authenticated coverage**

Run:

```powershell
docker version
npx --no-install supabase start
```

Expected: Docker responds and Supabase reports local services ready. If Supabase is already running, reuse it.

- [ ] **Step 2: Run static and unit verification**

Run:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 3: Run the complete E2E suite on desktop and mobile**

Run:

```powershell
npm run test:e2e -- --project=desktop-chromium
npm run test:e2e -- --project=mobile-chromium
```

Expected: all landing and authenticated flows pass. Confirm the output does not report skipped authenticated projects or missing fixtures.

- [ ] **Step 4: Inspect the required route matrix at production-relevant widths**

Check these surfaces at `390×844`, `768×1024`, `1440×900`, and `1728×1117`:

```text
/
/login
/signup
/painel (generic)
/painel (autonomous_seller)
/painel/juridico
/painel/imoveis/dashboard
/painel/contatos
/painel/funil
/painel/tarefas
/painel/whatsapp
/painel/configuracoes
```

For each surface, verify: production palette, rounded geometry, no translucent/glass layer, no repetitive row rules, no nested cards, no overflow, visible focus, `44px` targets, and honest empty/loading/error states.

Also verify that the new wordmark appears in the landing navigation/footer, authentication shell, and expanded product sidebar; the new symbol appears in collapsed/mobile placements; install metadata and notifications resolve to the 2026 app icon/mark assets without a visible rectangular background.

- [ ] **Step 5: Run a final zero-glass and separator audit**

Run:

```powershell
rg -n --glob '!docs/superpowers/**' --glob '!node_modules/**' "liquid-glass|landing-cinematic|landing-liquid|data-liquid|od-chrome|od-glass-distortion|backdrop-filter" app components lib test public
rg -n "divide-y|border-b .*last:border-b-0|border-t .*border-b" 'app/(dashboard)/painel' components
```

Expected: the first command has no active-runtime hits. Review every result from the second command against the allowed line budget; calendars, kanban grids, table headers, focus/state, and true section boundaries may remain.

- [ ] **Step 6: Create a preview-only handoff**

Push the implementation branch and create a preview deployment/PR. Compare the preview with the live production site side by side, confirming that the composition and density read as production while the corners and separator strategy reflect the approved hybrid. Do not deploy to production until the user explicitly approves the preview.

- [ ] **Step 7: Commit any QA-only corrections**

```powershell
git add -A
git commit -m "fix(ui): close production rounded visual QA"
```

Skip this commit only when Step 4 and Step 5 require no source changes.

## Self-Review Result

- Spec coverage: production baseline, new logo exception, current rounding, reduced lines, product/landing separation, functional preservation, responsive behavior, accessibility, and preview gate are each mapped to an implementation task.
- Placeholder scan: no deferred placeholders or undefined interfaces remain.
- Type consistency: every navigation task uses `ProductNavigationShellProps`, `NavGroup`, `NavItem`, and `NavIcon`; later tasks do not rename those interfaces.
- Scope boundary: this plan changes visual presentation and tests only. It explicitly preserves current authorization, data, integrations, migrations, billing, and domain behavior.
