# Mobile Personalized Dashboard Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a compact mobile real-estate dashboard header with time-aware daily copy, real operational status, fast actions, and an accessible animated notification popover.

**Architecture:** Keep `RealEstateDashboard` server-first. A pure greeting module derives São Paulo time, the seven daily periods, and deterministic status-aware copy; a focused client component owns only the notification popover state and motion. Desktop markup and all Supabase queries remain unchanged.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide React, Vitest, React DOM server rendering, Playwright.

## Global Constraints

- Do not use emojis.
- Do not call Tim an assistant, chatbot, copilot, or helper in new visible mobile copy.
- Use `Acione o Tim na sua operação` for the mobile Tim action.
- Use `America/Sao_Paulo` explicitly; do not depend on the process or browser time zone.
- Calm copy is legal only when `requestedVisits + openOffers + overdueCommissions === 0`.
- Preserve all current desktop header content and behavior at `md` and above.
- Keep every interactive mobile target at least 44 by 44 pixels.
- Do not change Supabase queries, authorization, organization/workspace isolation, the shared product topbar, or the mobile bottom navigation.
- Use the exact curated copy in `docs/superpowers/specs/2026-08-04-mobile-personalized-dashboard-header-design.md`.

---

### Task 1: Deterministic Brazilian greeting engine

**Files:**
- Create: `lib/real-estate/mobile-dashboard-greeting.ts`
- Create: `lib/real-estate/mobile-dashboard-greeting.test.ts`

**Interfaces:**
- Consumes: `{ now: Date; attentionCount: number }`.
- Produces: `getMobileDashboardGreeting(input): MobileDashboardGreeting` with `period`, `salutation`, and fully interpolated `message`.

- [ ] **Step 1: Write boundary tests for all seven periods**

Create a table using literal UTC instants that represent São Paulo wall-clock boundaries:

```ts
const cases = [
  ["2026-08-04T03:00:00.000Z", "overnight", "Boa noite"],
  ["2026-08-04T07:59:59.000Z", "overnight", "Boa noite"],
  ["2026-08-04T08:00:00.000Z", "early_morning", "Bom dia"],
  ["2026-08-04T11:59:59.000Z", "early_morning", "Bom dia"],
  ["2026-08-04T12:00:00.000Z", "late_morning", "Bom dia"],
  ["2026-08-04T14:59:59.000Z", "late_morning", "Bom dia"],
  ["2026-08-04T15:00:00.000Z", "early_afternoon", "Boa tarde"],
  ["2026-08-04T17:59:59.000Z", "early_afternoon", "Boa tarde"],
  ["2026-08-04T18:00:00.000Z", "late_afternoon", "Boa tarde"],
  ["2026-08-04T20:59:59.000Z", "late_afternoon", "Boa tarde"],
  ["2026-08-04T21:00:00.000Z", "early_evening", "Boa noite"],
  ["2026-08-04T23:59:59.000Z", "early_evening", "Boa noite"],
  ["2026-08-05T00:00:00.000Z", "late_evening", "Boa noite"],
  ["2026-08-05T02:59:59.000Z", "late_evening", "Boa noite"],
] as const;
```

For each case, call the real function with `attentionCount: 0` and assert the literal period and salutation.

- [ ] **Step 2: Write rotation and truthfulness tests**

Assert these independent behaviors:

```ts
const sameMorning = getMobileDashboardGreeting({
  now: new Date("2026-08-04T12:00:00.000Z"),
  attentionCount: 0,
});
const refreshedMorning = getMobileDashboardGreeting({
  now: new Date("2026-08-04T13:30:00.000Z"),
  attentionCount: 0,
});
expect(refreshedMorning.message).toBe(sameMorning.message);

const nextDay = getMobileDashboardGreeting({
  now: new Date("2026-08-05T12:00:00.000Z"),
  attentionCount: 0,
});
expect(nextDay.message).not.toBe(sameMorning.message);

const calm = getMobileDashboardGreeting({
  now: new Date("2026-08-05T00:30:00.000Z"),
  attentionCount: 0,
});
expect(calm.message.length).toBeGreaterThan(20);
expect(calm.message).not.toMatch(/prioridade/);

const singular = getMobileDashboardGreeting({
  now: new Date("2026-08-05T00:30:00.000Z"),
  attentionCount: 1,
});
expect(singular.message).toContain("1 prioridade");
expect(singular.message).not.toContain("{priorities}");

const plural = getMobileDashboardGreeting({
  now: new Date("2026-08-05T00:30:00.000Z"),
  attentionCount: 3,
});
expect(plural.message).toContain("3 prioridades");
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `npm test -- lib/real-estate/mobile-dashboard-greeting.test.ts`

Expected: FAIL because `mobile-dashboard-greeting.ts` does not exist.

- [ ] **Step 4: Implement the pure greeting module**

Export the exact types from the approved spec. Use one cached `Intl.DateTimeFormat` with `timeZone: "America/Sao_Paulo"`, `year`, `month`, `day`, `hour`, and `hourCycle: "h23"`. Convert the parts to numbers, select the period with the approved hour boundaries, and derive the São Paulo day number with:

```ts
const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
```

Represent each period as `{ salutation, calm, attention }`. Populate every `calm` and `attention` array with the four exact literals for that period from the approved spec. Select `calm` when `attentionCount <= 0`; otherwise select `attention` and replace `{priorities}` with `1 prioridade` or `${attentionCount} prioridades`.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `npm test -- lib/real-estate/mobile-dashboard-greeting.test.ts`

Expected: all greeting tests PASS.

---

### Task 2: Mobile profile header and server integration

**Files:**
- Create: `components/real-estate/mobile-real-estate-dashboard-header.tsx`
- Modify: `app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx:1-185`
- Modify: `lib/real-estate-dashboard-liquid-stage.test.ts`

**Interfaces:**
- Consumes: `MobileDashboardGreeting` from Task 1 plus real dashboard counts.
- Produces: `MobileRealEstateDashboardHeader(props)` and responsive server markup that leaves the desktop header intact.

- [ ] **Step 1: Write the failing server-render contract**

Extend the existing first dashboard test. Assert observable markup and destinations:

```ts
expect(html).toContain('data-mobile-dashboard-header="true"');
expect(html).toContain('data-mobile-dashboard-greeting="true"');
expect(html).toContain('data-mobile-dashboard-status="true"');
expect(html).toContain('data-mobile-notification-trigger="true"');
expect(html).toContain('aria-label="Ver resumo da operação"');
expect(html).toContain('aria-controls="mobile-operation-summary"');
expect(html).toContain('aria-expanded="false"');
expect(html).toContain('aria-label="Cadastrar novo imóvel"');
expect(html).toContain('href="/painel/imoveis/novo"');
expect(html).toContain('href="/painel/assistente"');
expect(html).toContain("Acione o Tim na sua operação");
expect(html).toContain("Bom dia, Mariana");
expect(html).toContain("MC");
expect(html).toContain("13 imóveis ativos");
expect(html).not.toMatch(/[😀-🙏]/u);
```

Extract the mobile root class and require `md:hidden`. Add `data-desktop-dashboard-header="true"` to the preserved desktop header, extract its class, and require `hidden md:flex`. Require the legacy desktop copy `Agenda de visitas`, `Novo imóvel`, and `Pergunte ao Tim` to remain in the static markup.

- [ ] **Step 2: Run the dashboard contract and verify RED**

Run: `npm test -- lib/real-estate-dashboard-liquid-stage.test.ts`

Expected: FAIL because the mobile header marker and new copy are absent.

- [ ] **Step 3: Create the focused client component**

Implement the exact prop type from the approved spec. Derive first name and up-to-two-letter initials from `displayName`. Render:

- root `section` with `data-mobile-dashboard-header="true"`, `relative`, and `md:hidden`;
- 44-pixel profile/action row;
- 40-pixel avatar with initials;
- `{salutation}, {firstName}` and a CSS green dot with the active-property count;
- full-width `greeting.message` below the row;
- notification button with `Bell`, `aria-expanded`, `aria-controls`, and badge capped at `9+`;
- 44-pixel Link with `HousePlus` to `/painel/imoveis/novo`;
- full-width Tim Link with `Sparkles`, the exact visible copy, and `ArrowRight`.

Use existing `liquid-glass-control`, `text-od-*`, violet, border, and focus tokens. Do not add global CSS.

- [ ] **Step 4: Implement the accessible animated popover**

Use `useState`, `useRef`, `useEffect`, `AnimatePresence`, `motion.div`, and `useReducedMotion`.

When open:

- attach `pointerdown` outside and `keydown` Escape listeners;
- Escape closes and restores focus to the bell on the next animation frame;
- outside pointer closes without stealing focus;
- each notification Link closes the popover;
- render only counts above zero for visits, offers, and overdue commissions;
- render `Tudo em ordem` when all counts are zero;
- do not lock body scrolling and do not trap focus.

Use `role="dialog"`, `aria-modal="false"`, and `aria-label="Resumo da operação"`. Animate from `{ opacity: 0, y: 8 }` to `{ opacity: 1, y: 0 }`, with zero positional motion under reduced motion.

- [ ] **Step 5: Integrate without changing desktop behavior**

In `RealEstateDashboard`, calculate the greeting with the already-derived `attentionCount`. Render the mobile component before the desktop header. Change the current header to `data-desktop-dashboard-header="true"` and `hidden md:flex`; change the existing desktop Tim section to `hidden md:block`. Pass the real `requestedVisits`, `openOffers`, and `overdueCount` values.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npm test -- lib/real-estate/mobile-dashboard-greeting.test.ts lib/real-estate-dashboard-liquid-stage.test.ts`

Expected: greeting and dashboard render-contract tests PASS.

---

### Task 3: Authenticated mobile behavior and completion gate

**Files:**
- Modify: `test/e2e/liquid-glass.spec.ts`
- Modify: `docs/superpowers/plans/2026-08-04-mobile-personalized-dashboard-header.md`

**Interfaces:**
- Consumes: the authenticated real-estate dashboard rendered by Tasks 1 and 2.
- Produces: browser evidence for mobile geometry, popover keyboard behavior, and no horizontal overflow.

- [ ] **Step 1: Add the authenticated mobile scenario**

Inside the existing authenticated describe block, add a mobile-only test that signs in, navigates to `/painel/imoveis/dashboard`, and skips with an explicit profession/onboarding reason only when the marker is not reachable. When reachable, assert:

```ts
const header = page.locator('[data-mobile-dashboard-header="true"]');
await expect(header).toBeVisible();
await expect(page.locator('[data-desktop-dashboard-header="true"]')).toBeHidden();
await expect(header.getByText("Acione o Tim na sua operação")).toBeVisible();

const trigger = header.getByRole("button", { name: "Ver resumo da operação" });
await trigger.click();
const summary = page.getByRole("dialog", { name: "Resumo da operação" });
await expect(summary).toBeVisible();
await page.keyboard.press("Escape");
await expect(summary).toHaveCount(0);
await expect(trigger).toBeFocused();
```

Reopen the popover, click outside, and assert it closes. Measure both action targets and require width and height of at least 44 pixels. Assert `document.documentElement.scrollWidth <= clientWidth + 1`.

- [ ] **Step 2: Run static and unit verification**

Run: `npm test && npm run typecheck && npx eslint "components/real-estate/mobile-real-estate-dashboard-header.tsx" "app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx" "lib/real-estate/mobile-dashboard-greeting.ts" "lib/real-estate/mobile-dashboard-greeting.test.ts" "lib/real-estate-dashboard-liquid-stage.test.ts" "test/e2e/liquid-glass.spec.ts"`

Expected: 0 unit failures, TypeScript exit 0, ESLint exit 0.

- [ ] **Step 3: Run the focused browser verification**

Run: `npx playwright test test/e2e/liquid-glass.spec.ts --project=mobile-chromium --grep "cabeçalho personalizado"`

Expected: PASS when the authenticated real-estate fixture is available. If skipped because credentials, onboarding, or profession do not expose the route, report that boundary explicitly and do not count it as browser validation.

- [ ] **Step 4: Review the exact diff boundary**

Run: `git diff --check -- "components/real-estate/mobile-real-estate-dashboard-header.tsx" "app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx" "lib/real-estate/mobile-dashboard-greeting.ts" "lib/real-estate/mobile-dashboard-greeting.test.ts" "lib/real-estate-dashboard-liquid-stage.test.ts" "test/e2e/liquid-glass.spec.ts"`

Expected: no whitespace errors. Review the diff to confirm no desktop, Supabase, authorization, shared topbar, bottom-navigation, or global CSS change was introduced.

- [ ] **Step 5: Record the implementation session**

Run `scripts/obsidian-log.ps1` once with the implementation outcome, exact verification evidence, important files, durable decisions, and any unverified authenticated-browser boundary. Do not log secrets, environment values, customer data, or raw command output.
