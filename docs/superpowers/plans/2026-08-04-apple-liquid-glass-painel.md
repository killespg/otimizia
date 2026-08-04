# Apple Liquid Glass Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply an Apple-faithful Liquid Glass functional layer to the shared `/painel` shell while keeping CRM content stable, legible, and behaviorally unchanged.

**Architecture:** Split visual materials by semantic role. A single regular-glass layer owns persistent navigation, floating controls, popovers, and the mobile dock; panels, tables, forms, and metric bands use stable content materials without blur or refraction. Keep the existing navigation and topbar component contracts so every vertical receives the new shell without duplicating product behavior.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, CSS custom properties, Framer Motion, Vitest, Playwright.

## Global Constraints

- Apply the shared shell to every `/painel` vertical; use the real-estate dashboard as the first visual reference.
- Preserve routes, server actions, form names, permissions, workspace isolation, integrations, data semantics, and current copy.
- Liquid Glass belongs to navigation and interactive controls, not `.panel`, `.card`, tables, forms, or metric cells.
- Use the regular glass variant only; do not introduce clear glass or mix variants.
- Tint only primary action, selection, and focus with violet; preserve semantic success, warning, and danger colors.
- Keep touch targets at least 44 x 44 px and preserve keyboard focus, Escape handling, and focus return.
- Provide reduced-motion, increased-contrast, reduced-transparency, no-`backdrop-filter`, and solid-select fallbacks.
- Limit SVG refraction to the persistent chrome group and one active transient overlay; never attach it to repeated content surfaces.
- Preserve unrelated dirty-worktree changes. The target files were already modified before this plan, so do not create implementation commits that would absorb pre-existing user work; use scoped diffs and verification checkpoints instead.
- Keep `components/landing` independent from product Liquid Glass semantics.

---

### Task 1: Define and enforce semantic material roles

**Files:**
- Create: `lib/liquid-glass-contract.test.ts`
- Modify: `app/globals.css`
- Modify: `DESIGN.md`

**Interfaces:**
- Consumes: Existing tokens `--od-surface`, `--od-muted-surface`, `.panel`, `.glass`, and `.od-chrome`.
- Produces: `--od-content-surface`, `--od-content-surface-muted`, `--od-content-border`, `--od-glass-border`, `.liquid-glass-control`, and explicit accessibility fallbacks used by later tasks.

- [ ] **Step 1: Write the failing material-contract test**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("liquid glass material contract", () => {
  it("keeps content surfaces out of the Liquid Glass layer", () => {
    const contentRule = css.match(/\.panel,\s*\.card,\s*\.card-quiet,\s*\.panel-soft\s*\{[\s\S]*?\}/)?.[0] ?? "";
    expect(contentRule).toContain("background: var(--od-content-surface)");
    expect(contentRule).not.toContain("backdrop-filter");
    expect(contentRule).not.toContain("--od-glass-sheen");
    expect(contentRule).not.toContain("filter: url(");
  });

  it("reserves adaptive glass for chrome and controls", () => {
    expect(css).toContain("--od-glass-border:");
    expect(css).toContain(".liquid-glass-control");
    expect(css).toContain("filter: url(#od-glass-distortion)");
    expect(css).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(css).toContain("@media (prefers-contrast: more)");
  });
});
```

- [ ] **Step 2: Run the test and verify the intended red state**

Run: `npx.cmd vitest run lib/liquid-glass-contract.test.ts`

Expected: FAIL because content panels still contain glass grain, sheen, and `backdrop-filter`, and the new semantic tokens do not exist.

- [ ] **Step 3: Replace global all-surface glass with semantic tokens**

Add stable content tokens beside the current glass tokens:

```css
--od-content-surface: rgba(25, 24, 30, 0.88);
--od-content-surface-muted: rgba(31, 30, 37, 0.76);
--od-content-border: rgba(255, 255, 255, 0.11);
--od-glass-border: rgba(255, 255, 255, 0.32);
--od-glass-control-bg: rgba(255, 255, 255, 0.085);
--od-glass-control-bg-hover: rgba(255, 255, 255, 0.13);
```

Map `--od-surface`, `--od-muted-surface`, and `--od-border` to the stable content tokens so existing content utilities inherit the safe default. Rewrite the content rule to have no glass effects:

```css
.panel,
.card,
.card-quiet,
.panel-soft {
  border: 1px solid var(--od-content-border);
  border-radius: var(--radius-lg);
  background: var(--od-content-surface);
  box-shadow: 0 14px 38px -30px rgba(0, 0, 0, 0.82);
}

.panel-soft,
.card-quiet { background: var(--od-content-surface-muted); }
```

Delete the selector that implicitly adds `backdrop-filter` and sheen to every `bg-od-surface`, `bg-od-muted-surface`, `bg-surface`, and `bg-surface-2` utility.

- [ ] **Step 4: Add the shared functional-control material and accessibility fallbacks**

```css
.liquid-glass-control {
  position: relative;
  isolation: isolate;
  border: 1px solid var(--od-glass-border);
  border-radius: 999px;
  background: var(--od-glass-control-bg);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.42), 0 12px 30px -22px rgba(0,0,0,.9);
  backdrop-filter: blur(18px) saturate(145%);
  transition: background-color 180ms cubic-bezier(.16,1,.3,1), border-color 180ms cubic-bezier(.16,1,.3,1), transform 140ms cubic-bezier(.16,1,.3,1);
}

.liquid-glass-control:hover { background: var(--od-glass-control-bg-hover); }
.liquid-glass-control:active { transform: scale(.975); }
.liquid-glass-control--tinted { background: color-mix(in oklab, var(--od-accent) 76%, transparent); color: white; }

@media (prefers-reduced-transparency: reduce) {
  .od-chrome, .glass, .liquid-glass-control { backdrop-filter: none; background: var(--od-surface-solid); }
}

@media (prefers-contrast: more) {
  .od-chrome, .glass, .liquid-glass-control { border-color: rgba(255,255,255,.72); }
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .od-chrome, .glass, .liquid-glass-control { background: var(--od-surface-solid); }
}
```

- [ ] **Step 5: Rewrite the Liquid Glass section in `DESIGN.md`**

State that `.panel` and direct surface utilities are content materials, `.od-chrome` is persistent regular glass, `.glass` is transient regular glass, and nested glass is prohibited. Remove the prior decision that made glass the default material for the entire site.

- [ ] **Step 6: Run the focused test and CSS diff check**

Run: `npx.cmd vitest run lib/liquid-glass-contract.test.ts`

Expected: PASS.

Run: `git diff --check -- app/globals.css DESIGN.md lib/liquid-glass-contract.test.ts`

Expected: exit 0. Do not commit these dirty overlapping files.

---

### Task 2: Merge the desktop navigation into one glass group

**Files:**
- Modify: `lib/liquid-glass-contract.test.ts`
- Modify: `components/design-system/product-nav-groups.tsx`
- Modify: `app/globals.css`
- Modify: `lib/frontend-route-parity.test.ts`

**Interfaces:**
- Consumes: `TwoLevelNav` props and localStorage keys exactly as they exist.
- Produces: one `[data-liquid-glass-shell]` regular-glass container around the rail and optional detail panel; rail/detail remain semantic `aside` elements.

- [ ] **Step 1: Extend the contract test for a single desktop glass surface**

```ts
const nav = readFileSync(
  resolve(process.cwd(), "components/design-system/product-nav-groups.tsx"),
  "utf8",
);

it("uses one desktop glass group instead of nested glass asides", () => {
  expect(nav).toContain("data-liquid-glass-shell");
  expect(nav.match(/od-chrome/g)).toHaveLength(1);
  expect(nav).not.toContain('<aside className="od-chrome');
  expect(nav).toContain('aria-label="Redimensionar menu lateral"');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx.cmd vitest run lib/liquid-glass-contract.test.ts`

Expected: FAIL because rail and detail are separate `.od-chrome` asides and no shell marker exists.

- [ ] **Step 3: Wrap rail and detail in one persistent glass group**

Reshape only the returned desktop markup:

```tsx
<div
  data-liquid-glass-shell
  className="od-chrome product-nav-glass-shell sticky top-3 z-50 hidden h-[calc(100dvh-1.5rem)] shrink-0 overflow-hidden md:flex"
>
  <aside className="flex h-full w-16 shrink-0 flex-col items-center gap-1 border-r border-white/[0.10] p-2.5" aria-label={railAriaLabel}>
    {/* existing rail content unchanged */}
  </aside>
  {!detailHidden ? (
    <aside className="relative flex h-full shrink-0 flex-col" style={{ width: detailWidth }} aria-label={detailAriaLabel}>
      {/* existing detail content and resize button unchanged */}
    </aside>
  ) : null}
</div>
```

Keep `toggleDetail`, `startResize`, `WorkspaceSwitcher`, route matching, submenu behavior, pending logout, and localStorage keys unchanged.

- [ ] **Step 4: Add shell geometry and containment CSS**

```css
.product-nav-glass-shell {
  margin-left: 12px;
  border-color: var(--od-glass-border);
  border-radius: 28px;
  contain: paint;
}

.product-nav-glass-shell::before,
.product-nav-glass-shell::after { border-radius: inherit; }
```

Ensure `.product-workspace` aligns children at the start and `.product-content` keeps `min-width: 0`.

- [ ] **Step 5: Replace obsolete seller-navigation string assertions with shared-contract assertions**

In `lib/frontend-route-parity.test.ts`, assert that `seller-product-navigation.tsx` delegates to `TwoLevelNav`, while the resize label, `WorkspaceSwitcher`, shell marker, and localStorage persistence live in `product-nav-groups.tsx`. Do not assert obsolete class strings from the pre-shared navigation implementation.

- [ ] **Step 6: Verify desktop shell tests**

Run: `npx.cmd vitest run lib/liquid-glass-contract.test.ts lib/frontend-route-parity.test.ts`

Expected: the Liquid Glass and seller navigation cases pass. Any remaining parity failures must be enumerated before Task 5; do not weaken unrelated behavioral assertions.

Run: `git diff --check -- components/design-system/product-nav-groups.tsx app/globals.css lib/frontend-route-parity.test.ts lib/liquid-glass-contract.test.ts`

Expected: exit 0. Do not commit overlapping dirty files.

---

### Task 3: Convert topbars into compact floating control groups

**Files:**
- Modify: `lib/liquid-glass-contract.test.ts`
- Modify: `components/design-system/product-topbar.tsx`
- Modify: `components/design-system/seller-product-topbar.tsx`
- Modify: `components/design-system/legal-product-topbar.tsx`
- Modify: `components/design-system/real-estate-product-topbar.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: Existing topbar props, search destinations, fullscreen behavior, notification counts, and accessible names.
- Produces: `[data-liquid-glass-search]` and `[data-liquid-glass-actions]` groups; the header itself remains transparent.

- [ ] **Step 1: Add failing topbar structure tests**

```ts
const topbars = [
  "product-topbar.tsx",
  "seller-product-topbar.tsx",
  "legal-product-topbar.tsx",
  "real-estate-product-topbar.tsx",
].map((file) => readFileSync(resolve(process.cwd(), "components/design-system", file), "utf8"));

it("keeps the topbar transparent and groups floating controls", () => {
  for (const topbar of topbars) {
    expect(topbar).not.toContain('<header className="od-chrome');
    expect(topbar).toContain("data-liquid-glass-actions");
    expect(topbar).toContain("liquid-glass-control");
  }
  for (const topbar of topbars) {
    expect(topbar).toContain("data-liquid-glass-search");
  }
});
```

- [ ] **Step 2: Run the test and verify it fails on current topbars**

Run: `npx.cmd vitest run lib/liquid-glass-contract.test.ts`

Expected: FAIL because each header owns `.od-chrome` and controls are not grouped semantically.

- [ ] **Step 3: Make headers transparent and glass only the controls**

For each topbar, preserve its search handler and links while using this structure:

```tsx
<header className="sticky top-0 z-40 flex min-h-16 items-center gap-3 px-4 py-2 md:px-8">
  <div className="flex min-w-0 items-center md:hidden">{/* existing logo */}</div>
  <form
    data-liquid-glass-search
    onSubmit={search}
    role="search"
    className="liquid-glass-control hidden min-w-0 max-w-96 flex-1 items-center gap-2 px-3 md:flex"
  >
    {/* existing icon and input */}
  </form>
  <div data-liquid-glass-actions className="liquid-glass-control ml-auto flex shrink-0 items-center gap-0.5 p-1">
    {/* existing links, buttons, badges, and avatar */}
  </div>
</header>
```

Keep every `aria-label`, notification badge, search target, fullscreen handler, and initials link.

- [ ] **Step 4: Add group-specific CSS without glass nesting**

Buttons inside `[data-liquid-glass-actions]` remain transparent and receive hover tint; they must not also carry `.liquid-glass-control`. The search input remains borderless inside its single glass parent.

- [ ] **Step 5: Verify topbar contracts, typecheck, and lint**

Run: `npx.cmd vitest run lib/liquid-glass-contract.test.ts`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: PASS.

Run: `npx.cmd eslint components/design-system/product-topbar.tsx components/design-system/seller-product-topbar.tsx components/design-system/legal-product-topbar.tsx components/design-system/real-estate-product-topbar.tsx`

Expected: exit 0. Do not commit overlapping dirty files.

---

### Task 4: Build the mobile Liquid Glass dock and non-nested sheet

**Files:**
- Modify: `lib/liquid-glass-contract.test.ts`
- Modify: `components/design-system/mobile-app-nav.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `MobileAppNav` props, focus trap, Escape handling, pending route feedback, safe-area handling, and fullscreen-chat body state.
- Produces: one `[data-mobile-nav]` dock using `.od-chrome`; one transient menu sheet using `.glass`, never rendered inside the dock.

- [ ] **Step 1: Add a failing mobile material test**

```ts
const mobileNav = readFileSync(
  resolve(process.cwd(), "components/design-system/mobile-app-nav.tsx"),
  "utf8",
);

it("uses one floating mobile dock and one sibling sheet", () => {
  expect(mobileNav).toContain('data-mobile-nav');
  expect(mobileNav).toContain('className="od-chrome liquid-glass-dock');
  expect(mobileNav).toContain('className="glass liquid-glass-mobile-sheet');
  expect(mobileNav).toContain('aria-modal="true"');
  expect(mobileNav).toContain('event.key === "Escape"');
});
```

- [ ] **Step 2: Run the test and verify the current fixed bar fails it**

Run: `npx.cmd vitest run lib/liquid-glass-contract.test.ts`

Expected: FAIL because the mobile bar is an opaque full-width strip and the sheet uses a content background.

- [ ] **Step 3: Convert the bar to an inset dock and the menu to a regular-glass sheet**

Use one fixed positioning wrapper and keep the `nav` itself as the material:

```tsx
<nav
  data-mobile-nav
  className="od-chrome liquid-glass-dock fixed inset-x-3 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-[var(--z-sticky)] mx-auto grid min-h-16 max-w-md grid-cols-5 p-1 md:hidden"
  aria-label={ariaLabel}
>
  {/* existing tabs and menu button */}
</nav>
```

Set the open menu section to `className="glass liquid-glass-mobile-sheet ..."`, positioned above the dock. Preserve the backdrop button as a sibling, not a glass parent.

- [ ] **Step 4: Add mobile geometry and accessibility fallbacks**

The dock uses a 26–30 px outer radius, safe-area inset, and no border-t strip. The sheet uses a matching concentric radius and solid fallback under reduced transparency. Preserve `.product-content` bottom padding and the `[data-chat-fullscreen] [data-mobile-nav]` rule.

- [ ] **Step 5: Verify mobile contract and interaction tests**

Run: `npx.cmd vitest run lib/liquid-glass-contract.test.ts`

Expected: PASS.

Run: `$env:E2E_BASE_URL='http://127.0.0.1:3000'; npx.cmd playwright test test/e2e/critical-flows.spec.ts --project=mobile-chromium`

Expected: mobile public flows pass; authenticated cases may skip only when their documented credentials are absent. Record skip count explicitly.

---

### Task 5: Apply the reference treatment to the real-estate dashboard

**Files:**
- Modify: `lib/liquid-glass-contract.test.ts`
- Modify: `app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx`
- Modify: `components/design-system/seller-dashboard-background.tsx` only if the verified background remains too dominant after content surfaces become stable.
- Modify: `lib/frontend-route-parity.test.ts`

**Interfaces:**
- Consumes: Existing real-estate metrics, filters, links, server actions, and background preference.
- Produces: grouped glass controls for `Agenda de visitas`, `Novo imovel`, and `Personalizar painel`; content panels remain standard `.panel` surfaces.

- [ ] **Step 1: Add failing dashboard-role assertions**

```ts
const realEstateDashboard = readFileSync(
  resolve(process.cwd(), "app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx"),
  "utf8",
);

it("uses glass for dashboard controls and content material for data", () => {
  expect(realEstateDashboard).toContain("data-dashboard-primary-actions");
  expect(realEstateDashboard).toContain("liquid-glass-control--tinted");
  expect(realEstateDashboard).toContain("data-dashboard-filters");
  expect(realEstateDashboard).toContain('data-dashboard-card className="panel');
  expect(realEstateDashboard).not.toContain('className="glass absolute right-0');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx.cmd vitest run lib/liquid-glass-contract.test.ts`

Expected: FAIL because the action grouping markers and control variants are absent.

- [ ] **Step 3: Group primary actions and convert the filter trigger**

Wrap the two header links in a neutral glass group identified by `data-dashboard-primary-actions`; keep `Novo imovel` tinted and `Agenda de visitas` neutral. Give the filter `details` element `data-dashboard-filters`, make its `summary` a neutral `.liquid-glass-control`, and keep its open popover as one `.glass` surface.

- [ ] **Step 4: Keep metric and financial data on content material**

Retain one `.panel` surface for the four-metric band and one for the indicator matrix, with internal dividers. Do not add `.glass`, `.od-chrome`, `backdrop-filter`, sheen, or refraction to repeated metric links, commission rows, or target rows.

- [ ] **Step 5: Calibrate the ambient background only from a rendered screenshot**

First render the dashboard after stable panels are in place. If the background still competes with values, lower the existing shader wrapper opacity one step and update its route-parity assertion to the exact new value. Do not change shader colors, speed, and opacity simultaneously.

- [ ] **Step 6: Replace stale parity assertions with semantic coverage**

Keep assertions for real CRM actions, routes, data attributes, animated-background preference, and dashboard content. Replace obsolete exact color/class assertions with checks for `.panel`, `data-dashboard-card`, shared `TwoLevelNav`, and `SellerDashboardBackground`. Preserve negative assertions that prevent legacy imports and invented analytics.

- [ ] **Step 7: Verify dashboard contracts and broad unit regression**

Run: `npx.cmd vitest run lib/liquid-glass-contract.test.ts lib/frontend-route-parity.test.ts`

Expected: PASS.

Run: `npm.cmd test -- --run`

Expected: 32 test files and at least 275 tests pass with 0 failures.

---

### Task 6: Validate the complete shell and document bounded evidence

**Files:**
- Modify only if verification finds a directly related defect in the files already listed.
- Verify: `app/globals.css`, shared navigation/topbars, mobile nav, and the real-estate dashboard.

**Interfaces:**
- Consumes: Completed semantic material layer and unchanged product flows.
- Produces: Evidence for compile, lint, tests, responsive behavior, accessibility fallbacks, and authenticated-shell status.

- [ ] **Step 1: Run static verification**

Run: `npm.cmd run typecheck`

Expected: PASS.

Run: `npm.cmd run lint`

Expected: 0 errors; report warnings separately.

Run: `git diff --check`

Expected: exit 0.

- [ ] **Step 2: Run the full unit suite**

Run: `npm.cmd test -- --run`

Expected: all tests pass with 0 failures.

- [ ] **Step 3: Verify the live server and public routes**

Run: `Invoke-WebRequest http://localhost:3000 -UseBasicParsing`

Expected: HTTP 200.

Run: `$env:E2E_BASE_URL='http://127.0.0.1:3000'; npx.cmd playwright test test/e2e/landing-no-js.spec.ts`

Expected: 2/2 pass; the product migration must not break public no-JS content.

- [ ] **Step 4: Verify authenticated shell if fixtures are configured**

Check only boolean presence of `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_RESTRICTED_EMAIL`, and `E2E_RESTRICTED_PASSWORD`; never print values. If all are present, run the relevant authenticated critical flows against the live server. If absent, report authenticated shell interaction as unverified rather than green.

- [ ] **Step 5: Capture desktop and mobile screenshots**

Use Playwright against the running app at 390 px, 1024 px, 1440 px, and 1920 px. At each viewport verify:

- no horizontal overflow;
- one desktop glass shell or one mobile dock, never nested glass;
- readable search, badges, values, and primary actions;
- sidebar resize and collapse on desktop;
- dock, menu, Escape, and focus return on mobile;
- reduced-motion and reduced-transparency fallbacks;
- a representative seller, legal, and real-estate route if authentication is available.

- [ ] **Step 6: Inspect the final scoped diff**

Run `git diff --` with the exact implementation files. Confirm no route, action, permission, data query, or form field changed. Do not commit overlapping dirty files; hand off the verified worktree state and list pre-existing unrelated failures separately if any remain.

- [ ] **Step 7: Record the required Obsidian session entry**

Run `scripts/obsidian-log.ps1 -Mode session` with concise summary, checks, important files, durable Liquid Glass decisions, and any unverified authenticated/browser risks. Never include secrets or raw command output.
