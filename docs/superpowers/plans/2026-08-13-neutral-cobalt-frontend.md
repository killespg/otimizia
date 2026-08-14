# Neutral-Cobalt Frontend Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruct every OtimizIA web surface with the approved neutral graphite foundation, tempered cobalt interaction system, coherent geometry and WCAG 2.2 AA behavior while preserving product logic.

**Architecture:** A platform-neutral TypeScript contract owns semantic tokens and navigation vocabulary; the web adapter exposes those tokens through CSS and focused React primitives. One product shell renders all workspace variants from configuration, while marketing remains a separate composition that consumes only shared brand tokens and primitives.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest 4, Playwright 1.62, Lucide React.

## Global Constraints

- Work only in the functional `otimizia` checkout; `otidesignsystem-main` is reference-only.
- Preserve routes, authorization, Server Actions, data contracts and external integration payloads.
- Preserve the 2026 logo, mark and PWA icon assets.
- Use `#0B0D11`, `#11151A`, `#15191F`, `#1B2027` and `#20262E` as the neutral surface ladder.
- Use `#2F6FCC` for primary action, `#285AA5` for hover, `#4E7FBF` for data, `#91B6E7` for soft accent, `#7DA7E0` for focus and `#18283E` for cobalt tint.
- Use 9px for controls, 11px for inner groups and 15px for primary panels; 999px is limited to true circles, toggles and content-sized status capsules.
- Body text and controls require 4.5:1 contrast; focus and meaningful non-text UI require 3:1.
- Every interactive target is at least 44 by 44 pixels on coarse pointers and narrow screens.
- Core content remains available without JavaScript; motion respects `prefers-reduced-motion`.
- No glass, decorative gradient, ambient particles, neural canvas, WebGL shader, grain or translucent dock remains active.
- Printable/PDF routes use white paper and dark ink as the documented exception.
- Preserve and inspect all pre-existing uncommitted changes; never reset or replace the tree mechanically.
- Native mobile is not implemented here. Share semantic contracts and clean adapter boundaries only.

---

### Task 1: Lock the approved visual contract with failing tests

**Files:**
- Create: `lib/design-system/visual-contract.test.ts`
- Modify: `lib/frontend-route-parity.test.ts`
- Test: `lib/design-system/visual-contract.test.ts`

**Interfaces:**
- Consumes: the approved values in `docs/superpowers/specs/2026-08-13-neutral-cobalt-frontend-design.md`.
- Produces: source-level guards for CSS tokens, radius values, removed decorative backgrounds and shared shell usage.

- [ ] **Step 1: Write the failing token contract test**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("neutral-cobalt visual contract", () => {
  it("publishes the approved semantic palette and geometry", () => {
    const css = read("app/globals.css");
    for (const value of ["#0b0d11", "#11151a", "#15191f", "#1b2027", "#2f6fcc", "#7da7e0", "#18283e"]) {
      expect(css.toLowerCase()).toContain(value);
    }
    expect(css).toContain("--radius-control: 9px");
    expect(css).toContain("--radius-inner: 11px");
    expect(css).toContain("--radius-panel: 15px");
  });

  it("removes decorative canvas layers from active shells", () => {
    const layout = read("app/(dashboard)/painel/layout.tsx");
    const auth = read("app/(auth)/AuthShell.tsx");
    expect(layout).not.toMatch(/AmbientParticles|NeuralBackground|SellerDashboardBackground/);
    expect(auth).not.toMatch(/AmbientParticles|AnimatedShapesBackground/);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm the old palette fails**

Run: `npx vitest run lib/design-system/visual-contract.test.ts`

Expected: FAIL because `app/globals.css` still publishes navy/violet values and the active shells still import animated backgrounds.

- [ ] **Step 3: Replace obsolete parity assertions**

Delete assertions that require purple shaders, ambient particles, old rgba surfaces, per-vertical shell duplication and legacy logo dimensions. Retain assertions for routes, real actions, authorization-sensitive shell selection and 2026 asset usage. Add assertions for `ProductShell`, `PRODUCT_NAVIGATION` and neutral-cobalt tokens.

- [ ] **Step 4: Run the focused parity tests and record the expected red state**

Run: `npx vitest run lib/design-system/visual-contract.test.ts lib/frontend-route-parity.test.ts`

Expected: FAIL only on contracts whose implementation begins in Tasks 2-4.

- [ ] **Step 5: Commit the contract tests with the approved spec and plan**

```powershell
git add -- "lib/design-system/visual-contract.test.ts" "lib/frontend-route-parity.test.ts" "docs/superpowers/specs/2026-08-13-neutral-cobalt-frontend-design.md" "docs/superpowers/plans/2026-08-13-neutral-cobalt-frontend.md"
git commit -m "test: lock neutral cobalt frontend contract"
```

### Task 2: Add platform-neutral tokens and the web adapter

**Files:**
- Create: `lib/design-system/tokens.ts`
- Create: `lib/design-system/tokens.test.ts`
- Modify: `app/globals.css`
- Modify: `DESIGN.md`
- Test: `lib/design-system/tokens.test.ts`

**Interfaces:**
- Produces: `designTokens`, `DesignTokenName`, `intentTokens`, CSS variables `--od-*`, `--radius-control`, `--radius-inner` and `--radius-panel`.

- [ ] **Step 1: Write the failing cross-platform token test**

```ts
import { describe, expect, it } from "vitest";
import { designTokens } from "./tokens";

it("exports the approved platform-neutral contract", () => {
  expect(designTokens.color.canvas).toBe("#0B0D11");
  expect(designTokens.color.actionPrimary).toBe("#2F6FCC");
  expect(designTokens.radius).toEqual({ control: 9, inner: 11, panel: 15, round: 999 });
  expect(designTokens.target.minimum).toBe(44);
});
```

- [ ] **Step 2: Verify the token module is missing**

Run: `npx vitest run lib/design-system/tokens.test.ts`

Expected: FAIL with module resolution error for `./tokens`.

- [ ] **Step 3: Implement the immutable token contract**

```ts
export const designTokens = {
  color: {
    canvas: "#0B0D11", surfaceBase: "#11151A", surfacePrimary: "#15191F",
    surfaceSecondary: "#1B2027", surfaceHover: "#20262E",
    borderSubtle: "#252C35", borderDefault: "#2D3540", borderStrong: "#3B4653",
    textPrimary: "#F5F7FA", textSecondary: "#98A2AF", textTertiary: "#7D8998",
    actionPrimary: "#2F6FCC", actionPrimaryHover: "#285AA5", accent: "#4E7FBF",
    accentSoft: "#91B6E7", focusRing: "#7DA7E0", accentTint: "#18283E",
  },
  radius: { control: 9, inner: 11, panel: 15, round: 999 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 },
  target: { minimum: 44 },
} as const;

export type DesignTokens = typeof designTokens;
```

- [ ] **Step 4: Rebuild the CSS token layer**

Map existing Tailwind aliases to the new semantic values, keep compatibility names such as `--od-bg`, and change every global primitive selector to the approved palette and geometry. Add `color-scheme: dark`, safe-area helpers, tabular metric utility, visible focus ring and a white-paper `@media print` block. Remove purple, navy, glass and oversized radius definitions from the active token layer.

- [ ] **Step 5: Update the canonical design document**

Replace its former canvas, surface, accent and radius values with the exact approved contract. Document the print exception and future-native adapter boundary.

- [ ] **Step 6: Verify tokens and CSS contract**

Run: `npx vitest run lib/design-system/tokens.test.ts lib/design-system/visual-contract.test.ts`

Expected: token assertions PASS; shell-background assertions remain red until Task 4.

- [ ] **Step 7: Commit the foundation**

```powershell
git add -- "lib/design-system/tokens.ts" "lib/design-system/tokens.test.ts" "app/globals.css" "DESIGN.md"
git commit -m "feat: add neutral cobalt design foundation"
```

### Task 3: Build accessible web primitives

**Files:**
- Create: `components/ui/button.tsx`
- Create: `components/ui/form-controls.tsx`
- Create: `components/ui/surface.tsx`
- Create: `components/ui/data-display.tsx`
- Create: `components/ui/feedback.tsx`
- Create: `components/ui/primitives.test.ts`
- Modify: `components/ui/PendingButton.tsx`

**Interfaces:**
- Produces: `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Surface`, `Section`, `Toolbar`, `MetricBand`, `Status`, `EmptyState`, `ErrorState`, `PermissionState` and intent types `primary | secondary | quiet | danger`.

- [ ] **Step 1: Write static-render tests for semantics and variants**

Use `renderToStaticMarkup` with `React.createElement` so the existing `.test.ts` Vitest include pattern can run without adding a DOM library. Assert button type, accessible icon label, invalid field attributes, status text and surface data attributes.

- [ ] **Step 2: Run the primitive test and confirm missing modules**

Run: `npx vitest run components/ui/primitives.test.ts`

Expected: FAIL because the primitive modules do not exist.

- [ ] **Step 3: Implement Button and IconButton**

Use `forwardRef`, native button props and deterministic classes `ui-button`, `ui-button--{intent}`, `ui-button--{size}`. `IconButton` requires an `aria-label` prop and renders a 44px target.

- [ ] **Step 4: Implement form controls**

`Input`, `Textarea` and `Select` accept `label`, `description`, `error` and native props. Generate stable `aria-describedby`, set `aria-invalid` when error exists and keep the visible label in markup.

- [ ] **Step 5: Implement composition, data and feedback primitives**

Render semantic HTML: `section`/`header` for composition, `dl` for MetricBand, text plus icon slot for Status and `role="alert"` only for actionable errors. Keep class names stable for visual contract tests.

- [ ] **Step 6: Adapt PendingButton**

Preserve `useFormStatus`, pending label and icon-only behavior while delegating styling and disabled semantics to `Button`.

- [ ] **Step 7: Verify primitive tests and typecheck**

Run: `npx vitest run components/ui/primitives.test.ts`

Run: `npm run typecheck`

Expected: both PASS.

- [ ] **Step 8: Commit the primitive layer**

```powershell
git add -- "components/ui"
git commit -m "feat: rebuild accessible ui primitives"
```

### Task 4: Replace duplicate workspace shells with one configured shell

**Files:**
- Create: `lib/design-system/navigation.ts`
- Create: `lib/design-system/navigation.test.ts`
- Create: `components/design-system/product-shell.tsx`
- Create: `components/design-system/product-shell-navigation.tsx`
- Create: `components/design-system/product-shell-topbar.tsx`
- Modify: `components/design-system/mobile-app-nav.tsx`
- Modify: `app/(dashboard)/painel/layout.tsx`
- Remove after migration: `components/design-system/{product,legal-product,seller-product,real-estate-product}-navigation.tsx`
- Remove after migration: `components/design-system/{product,legal-product,seller-product,real-estate-product}-topbar.tsx`
- Test: `lib/design-system/navigation.test.ts`

**Interfaces:**
- Produces: `NavigationItem`, `NavigationGroup`, `ShellVariant`, `buildProductNavigation(input)` and `ProductShell`.
- Consumes: permissions, labels, counts and workspace options already computed by `PainelLayout`.

- [ ] **Step 1: Write navigation behavior tests**

Assert that seller, legal, real-estate and generic inputs return only authorized destinations, stable keys and a maximum of four bottom-nav destinations. Assert settings and logout remain reachable.

- [ ] **Step 2: Run tests and confirm the builder is missing**

Run: `npx vitest run lib/design-system/navigation.test.ts`

Expected: FAIL resolving `buildProductNavigation`.

- [ ] **Step 3: Implement the pure navigation builder**

Define stable keys such as `overview`, `contacts`, `pipeline`, `tasks`, `whatsapp`, `calendar`, `assistant`, `team`, `finance`, `settings` and vertical keys. Keep permission filtering in pure TypeScript; keep Lucide rendering in the web adapter.

- [ ] **Step 4: Implement the shared navigation and topbar**

Desktop uses a solid `surface-base` sidebar, cobalt selection rail, label plus icon and a persisted collapsed state. Mobile uses safe-area-aware bottom navigation with one overflow drawer. Topbar search keeps the existing contacts destination and exposes a visible search label to assistive technology.

- [ ] **Step 5: Recompose `PainelLayout`**

Preserve authentication, organization lookup, plan access and vertical permission checks. Replace shell branching with one `ProductShell` configuration. Remove all active ambient/shader/neural imports and markup. Render count-query failures as an explicit shell notice instead of silently presenting them as trusted zero counts.

- [ ] **Step 6: Verify shell and route parity tests**

Run: `npx vitest run lib/design-system/navigation.test.ts lib/design-system/visual-contract.test.ts lib/frontend-route-parity.test.ts`

Expected: PASS for shared shell, permissions, removed animation layers and route preservation.

- [ ] **Step 7: Run the authenticated-layout typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 8: Remove duplicate shell files only after imports are gone**

Run: `rg -n "(Legal|Seller|RealEstate)?Product(Navigation|Topbar)" app components lib`

Expected: no consumers outside migration tests before removal.

- [ ] **Step 9: Commit the shared shell**

```powershell
git add -- "lib/design-system" "components/design-system" "app/(dashboard)/painel/layout.tsx" "lib/frontend-route-parity.test.ts"
git commit -m "feat: unify product shell navigation"
```

### Task 5: Rebuild authentication, onboarding and upgrade surfaces

**Files:**
- Modify: `app/(auth)/AuthShell.tsx`
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/signup/page.tsx`
- Modify: `app/(auth)/forgot-password/page.tsx`
- Modify: `app/(auth)/reset-password/page.tsx`
- Modify: `app/(auth)/convite/page.tsx`
- Modify: `app/(auth)/loading.tsx`
- Modify: `app/onboarding/page.tsx`
- Modify: `app/onboarding/cpf/page.tsx`
- Modify: `app/upgrade/page.tsx`
- Modify: `components/auth/AuthPasswordField.tsx`
- Modify: `components/auth/SocialAuthButtons.tsx`
- Test: `test/e2e/auth-accessibility.spec.ts`

**Interfaces:**
- Consumes: shared controls, logo and neutral-cobalt tokens.
- Preserves: existing form actions, callback destinations, captcha and social authentication.

- [ ] **Step 1: Add failing Playwright accessibility assertions**

For login and signup, assert one main landmark, visible labels, autocomplete values, a keyboard-visible password toggle, no body overflow at 320px and no decorative canvas element.

- [ ] **Step 2: Run the focused browser tests against a clean dev server**

Run: `npx playwright test test/e2e/auth-accessibility.spec.ts --project=chromium`

Expected: FAIL on the old shell/background or missing responsive contract.

- [ ] **Step 3: Rebuild AuthShell and forms**

Use one centered form surface, a concise brand header, solid graphite background and the shared controls. Remove ambient/animated backgrounds. Preserve all input names and Server Action bindings exactly.

- [ ] **Step 4: Rebuild onboarding and upgrade**

Use the same field, action and feedback patterns. Preserve plan checks and onboarding submission behavior. Keep mobile action placement above safe-area insets.

- [ ] **Step 5: Verify browser, unit and type checks**

Run: `npx playwright test test/e2e/auth-accessibility.spec.ts --project=chromium`

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit account surfaces**

```powershell
git add -- "app/(auth)" "app/onboarding" "app/upgrade" "components/auth" "test/e2e/auth-accessibility.spec.ts"
git commit -m "feat: rebuild account surfaces"
```

### Task 6: Recompose shared dashboards and operational routes

**Files:**
- Modify: `app/(dashboard)/painel/_dashboard/GenericDashboard.tsx`
- Modify: `app/(dashboard)/painel/_dashboard/SellerDashboard.tsx`
- Modify: `components/seller/seller-ui.tsx`
- Modify: routes under `app/(dashboard)/painel/{contatos,funil,tarefas,calendario,financeiro,equipe,produtos,pedidos,colecoes,pos-venda,configuracoes,workspaces}`
- Test: `lib/frontend-route-parity.test.ts`
- Test: `test/e2e/product-responsive.spec.ts`

**Interfaces:**
- Consumes: Surface, Toolbar, FilterBar-compatible composition, MetricBand, DataList/Table and feedback primitives.
- Preserves: all action props, form action bindings, links, query params and workspace filters.

- [ ] **Step 1: Extend failing source contracts for operational patterns**

Assert dashboards import MetricBand/Surface, operational list routes expose one toolbar and explicit empty/error state classes, and no touched route contains navy/violet literal colors or arbitrary radii above 15px.

- [ ] **Step 2: Run parity tests and confirm the old compositions fail**

Run: `npx vitest run lib/frontend-route-parity.test.ts`

Expected: FAIL on old metric cards and legacy literals.

- [ ] **Step 3: Recompose dashboards**

Group metrics into bands, use one cobalt emphasis per chart, retain dashboard customization and real action bindings, and remove animated-background controls that no longer have an effect.

- [ ] **Step 4: Recompose operational indexes**

For each listed route, use a page heading, one Toolbar, one data surface and explicit loading/empty/error semantics. Preserve filters and mutations. Convert mobile tables to labelled data rows or an explicitly labelled scroll region.

- [ ] **Step 5: Recompose detail and form routes**

Use Section and Surface instead of nested cards. Keep destructive actions separate and danger-styled. Preserve field names, form actions and returned error messages.

- [ ] **Step 6: Add responsive browser coverage**

At 320px and 390px assert no body overflow, no fixed control covers the last form field, primary actions remain visible and tables expose their mobile adaptation.

- [ ] **Step 7: Verify operational routes**

Run: `npx vitest run lib/frontend-route-parity.test.ts`

Run: `npx playwright test test/e2e/product-responsive.spec.ts --project=chromium`

Run: `npm run typecheck`

Expected: all available checks PASS; authenticated cases without fixtures are reported as skipped rather than inferred.

- [ ] **Step 8: Commit operational reconstruction**

```powershell
git add -- "app/(dashboard)/painel" "components/seller" "test/e2e/product-responsive.spec.ts" "lib/frontend-route-parity.test.ts"
git commit -m "feat: recompose operational product routes"
```

### Task 7: Rebuild the legal vertical on shared primitives

**Files:**
- Modify: routes under `app/(dashboard)/painel/juridico`
- Modify: `components/legal/*.tsx`
- Modify: `components/design-system/legal-dashboard-assistant.tsx`
- Modify: `components/design-system/legal-dashboard-filters.tsx`
- Test: `lib/frontend-route-parity.test.ts`

**Interfaces:**
- Preserves: legal access checks, DataJud behavior, deadlines, documents, signatures, fees and process actions.

- [ ] **Step 1: Add failing legal composition assertions**

Assert legal pages use shared surface/data primitives, retain required action identifiers and do not contain a vertical palette, neural background or unrelated purple literal.

- [ ] **Step 2: Run the legal-focused parity test**

Run: `npx vitest run lib/frontend-route-parity.test.ts -t "legal|juridico|jurídico"`

Expected: FAIL on legacy visual contracts.

- [ ] **Step 3: Recompose dashboard, process, deadline and document surfaces**

Use shared MetricBand, Toolbar, Status and data patterns. Keep all legal status labels and add icons/text where color previously carried meaning. Make the assistant a contextual DetailPanel.

- [ ] **Step 4: Verify legal source contracts and typecheck**

Run: `npx vitest run lib/frontend-route-parity.test.ts -t "legal|juridico|jurídico"`

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the legal vertical**

```powershell
git add -- "app/(dashboard)/painel/juridico" "components/legal" "components/design-system/legal-dashboard-assistant.tsx" "components/design-system/legal-dashboard-filters.tsx"
git commit -m "feat: rebuild legal workspace surfaces"
```

### Task 8: Rebuild the real-estate vertical on shared primitives

**Files:**
- Modify: routes under `app/(dashboard)/painel/imoveis`
- Modify: `components/real-estate/*.tsx`
- Test: `lib/frontend-route-parity.test.ts`

**Interfaces:**
- Preserves: real-estate permissions, property/deal links, maps, visits, collections, matches, offers, commissions and downloads.

- [ ] **Step 1: Add failing real-estate composition assertions**

Assert dashboard metrics use shared primitives, all existing destination/action strings remain present, map/media frames use neutral classes and no property page uses a vertical color theme.

- [ ] **Step 2: Run focused tests and confirm legacy composition fails**

Run: `npx vitest run lib/frontend-route-parity.test.ts -t "real-estate|imobili|imoveis|imóveis"`

Expected: FAIL on old surface/radius contracts.

- [ ] **Step 3: Recompose dashboard and indexes**

Use MetricBand, Toolbar, FilterBar and responsive DataList/Table. Keep the Tim entry, customization, report download and action destinations. Remove background preference controls.

- [ ] **Step 4: Recompose property, collection, match, offer, visit and commission details**

Use neutral media frames for photography/maps and shared form/status patterns. Preserve all action and permission boundaries.

- [ ] **Step 5: Verify real-estate tests and typecheck**

Run: `npx vitest run lib/frontend-route-parity.test.ts -t "real-estate|imobili|imoveis|imóveis"`

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the real-estate vertical**

```powershell
git add -- "app/(dashboard)/painel/imoveis" "components/real-estate" "lib/frontend-route-parity.test.ts"
git commit -m "feat: rebuild real estate workspace surfaces"
```

### Task 9: Rebuild the marketing landing with accessible progressive enhancement

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/landing/*.tsx`
- Modify: `test/e2e/landing-no-js.spec.ts`
- Modify: `test/e2e/landing-responsive.spec.ts`
- Create: `test/e2e/landing-accessibility.spec.ts`

**Interfaces:**
- Consumes: brand tokens, Button and logo only; does not import product-domain components.
- Preserves: real claims, pricing, proposal composer and route destinations.

- [ ] **Step 1: Extend failing no-JavaScript and tab tests**

Assert every FAQ answer is present with JavaScript disabled. Assert tabs own `aria-controls`, panels own `aria-labelledby`, one tab has `tabindex=0`, arrow keys change focus and content remains reachable at 320px.

- [ ] **Step 2: Run landing tests against a clean server**

Run: `npx playwright test test/e2e/landing-no-js.spec.ts test/e2e/landing-responsive.spec.ts test/e2e/landing-accessibility.spec.ts --project=chromium`

Expected: FAIL on FAQ no-JavaScript content, incomplete tab semantics or stale hydration behavior.

- [ ] **Step 3: Recompose landing structure**

Use a typographic product-led hero, solid neutral sections, restrained cobalt action, one real product preview and fewer dividers. Remove decorative animated shapes and repeated uppercase labels. Preserve honest copy and implemented feature boundaries.

- [ ] **Step 4: Fix progressive enhancement**

Render FAQ answer content in HTML and use CSS/JS only to collapse it. Implement complete tab semantics and keyboard behavior, with stacked content as the no-JavaScript/narrow-screen fallback.

- [ ] **Step 5: Verify landing behavior and responsive layout**

Run: `npx playwright test test/e2e/landing-no-js.spec.ts test/e2e/landing-responsive.spec.ts test/e2e/landing-accessibility.spec.ts --project=chromium`

Expected: PASS with JavaScript enabled and disabled at desktop, 390px and 320px.

- [ ] **Step 6: Commit the landing**

```powershell
git add -- "app/page.tsx" "components/landing" "test/e2e/landing-no-js.spec.ts" "test/e2e/landing-responsive.spec.ts" "test/e2e/landing-accessibility.spec.ts"
git commit -m "feat: rebuild accessible marketing landing"
```

### Task 10: Rebuild public legal and printable surfaces

**Files:**
- Modify: `app/termos/page.tsx`
- Modify: `app/privacidade/page.tsx`
- Modify: print/PDF routes under `app/(dashboard)/painel/**/pdf`
- Modify: `components/ui/PrintButton.tsx`
- Test: `test/e2e/public-and-print.spec.ts`

**Interfaces:**
- Consumes: neutral web tokens and light-paper print tokens.
- Preserves: legal copy and generated proposal data.

- [ ] **Step 1: Add failing public/print browser assertions**

Assert terms/privacy have one main landmark and readable measure. Emulate print media for proposal routes and assert white canvas, dark text, hidden navigation and hidden print button.

- [ ] **Step 2: Run focused browser tests**

Run: `npx playwright test test/e2e/public-and-print.spec.ts --project=chromium`

Expected: FAIL on legacy public or print styles.

- [ ] **Step 3: Implement public and print composition**

Use the neutral web shell for legal pages. Add `.print-document` semantics and `@media print` rules for white paper, dark text, neutral borders and cobalt headings. Keep document content and calculations unchanged.

- [ ] **Step 4: Verify public and print routes**

Run: `npx playwright test test/e2e/public-and-print.spec.ts --project=chromium`

Run: `npm run typecheck`

Expected: PASS for routes available without authenticated fixtures; protected print coverage reports its fixture boundary.

- [ ] **Step 5: Commit public and print surfaces**

```powershell
git add -- "app/termos" "app/privacidade" "app/(dashboard)/painel" "components/ui/PrintButton.tsx" "test/e2e/public-and-print.spec.ts"
git commit -m "feat: align public and print surfaces"
```

### Task 11: Remove superseded visuals and harden mobile-ready boundaries

**Files:**
- Remove when unreferenced: `components/design-system/ambient-particles.tsx`
- Remove when unreferenced: `components/design-system/animated-shapes-background.tsx`
- Remove when unreferenced: `components/design-system/neural-background.tsx`
- Remove when unreferenced: `components/design-system/shader-background.tsx`
- Remove when unreferenced: `components/design-system/seller-dashboard-background.tsx`
- Modify: `vitest.config.ts`
- Modify: `playwright.config.ts`
- Modify: `.gitignore`
- Test: `lib/design-system/visual-contract.test.ts`

**Interfaces:**
- Produces: clean test discovery and no active or dead decorative background implementation.

- [ ] **Step 1: Prove background implementations have no consumers**

Run: `rg -n "AmbientParticles|AnimatedShapesBackground|NeuralBackground|ShaderBackground|SellerDashboardBackground" app components lib`

Expected: only the implementation files and removal contract test references remain.

- [ ] **Step 2: Remove unreferenced background modules**

Delete only files proven unreferenced by Step 1. Remove obsolete preference UI that controlled those backgrounds while preserving unrelated dashboard preferences.

- [ ] **Step 3: Fix test discovery hygiene**

Add `.claude/**`, `.superpowers/**` and `otimizia.worktrees/**` to Vitest exclusion. Document required authenticated E2E fixture variables consistently with `.env.example` without adding values.

- [ ] **Step 4: Ignore brainstorm artifacts**

Add `.superpowers/` to `.gitignore` after the approved spec screenshots/mockups are no longer needed as tracked input.

- [ ] **Step 5: Run visual contracts and test listing**

Run: `npx vitest run lib/design-system/visual-contract.test.ts`

Run: `npx vitest list`

Expected: PASS; no tests from nested worktrees or brainstorm artifacts appear.

- [ ] **Step 6: Commit cleanup**

```powershell
git add -- "components/design-system" "vitest.config.ts" "playwright.config.ts" ".env.example" ".gitignore"
git commit -m "chore: remove superseded visual layers"
```

### Task 12: Complete release-grade verification and document the boundary

**Files:**
- Modify only if failures require an in-scope correction: files from Tasks 1-11.
- Record: Obsidian development session through `scripts/obsidian-log.ps1`.

**Interfaces:**
- Produces: fresh evidence for static checks, unit tests, build, anonymous browser flows, responsive/a11y checks and available authenticated/integration flows.

- [ ] **Step 1: Scan for forbidden active visual literals and arbitrary geometry**

Run: `rg -n "#07142d|#2a3751|#8757f0|#a78bfa|glass|backdrop-blur|rounded-\[(?:1[6-9]|[2-9][0-9])px\]" app components --glob "*.tsx" --glob "*.css"`

Expected: no active UI occurrence; comments or explicit migration documentation are reviewed manually.

- [ ] **Step 2: Run formatting and static verification**

Run: `git diff --check`

Run: `npm run typecheck`

Run: `npm run lint`

Expected: all exit 0.

- [ ] **Step 3: Run the full unit suite**

Run: `npm test`

Expected: all checkout unit tests pass without nested worktree duplication.

- [ ] **Step 4: Run integration tests when local Supabase is available**

Run: `npm run test:integration`

Expected: all integration tests pass. If the explicit local-Supabase guard blocks execution, report integration as unverified rather than passed.

- [ ] **Step 5: Run a production build without sharing an active dev `.next` directory**

Stop or isolate the dev server safely, then run: `npm run build`

Expected: exit 0. If an externally owned dev process cannot be stopped safely, use an isolated checkout containing the completed changes.

- [ ] **Step 6: Run browser validation**

Run: `npx playwright test test/e2e/landing-no-js.spec.ts test/e2e/landing-responsive.spec.ts test/e2e/landing-accessibility.spec.ts test/e2e/auth-accessibility.spec.ts test/e2e/product-responsive.spec.ts test/e2e/public-and-print.spec.ts --project=chromium`

Expected: anonymous tests pass; authenticated tests pass when documented fixtures are available or report explicit skips.

- [ ] **Step 7: Perform manual visual checks**

Capture desktop, tablet, 390px and 320px screenshots for landing, login and each available workspace dashboard. Verify focus visibility, contrast, no overflow, correct 2026 logo, coherent 9/11/15 geometry and no obstructed action.

- [ ] **Step 8: Record the required Obsidian session**

Run `scripts/obsidian-log.ps1` once with concise summary, checks, important files, durable decisions and remaining external verification risks. Do not include secrets, `.env` values or customer data.

- [ ] **Step 9: Commit verification fixes and final documentation**

```powershell
git add -- "app" "components" "lib" "test" "docs" "DESIGN.md" "vitest.config.ts" "playwright.config.ts" ".gitignore"
git commit -m "design: complete neutral cobalt frontend reconstruction"
```
