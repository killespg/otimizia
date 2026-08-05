# Mobile Compact Real Estate Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Condense the four real-estate summary cards into a compact 2x2 phone grid without changing the existing desktop layout or Liquid Glass styling.

**Architecture:** Keep the existing `RealEstateMetrics` and `MetricSparkline` markup and data flow. Add only mobile-first Tailwind responsive classes, with a server-render contract test proving the breakpoint behavior.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, React DOM server rendering.

## Global Constraints

- Change only the four real-estate summary cards and their decorative sparklines.
- Preserve metric data, links, accessible labels, data attributes, glass borders, value gradient, hover, focus, and desktop composition.
- Do not modify global CSS, indicators, sidebar, navigation, background, or data fetching.
- Hide metric notes below `sm` and sparklines below `md`.
- Keep the phone metric rail near 184 pixels minimum total height.

---

### Task 1: Compact responsive metric rail

**Files:**
- Modify: `lib/real-estate-dashboard-liquid-stage.test.ts`
- Modify: `app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx:300-355`

**Interfaces:**
- Consumes: the existing `DashboardMetric[]` and `MetricSparkline` index.
- Produces: unchanged rendered metric semantics with compact mobile breakpoint classes.

- [ ] **Step 1: Write the failing responsive contract**

Extend the first dashboard render test with class extraction for the rail, cards, notes, and sparklines:

```ts
const metricRailClasses = html.match(
  /data-liquid-metric-rail="true"[^>]+class="([^"]+)"/,
)?.[1];
expect(metricRailClasses).toContain("grid-cols-2");
expect(metricRailClasses).toContain("lg:grid-cols-4");
expect(metricRailClasses).not.toContain("grid-cols-1");

const metricCardClasses = Array.from(
  html.matchAll(/data-liquid-metric="true"[^>]+class="([^"]+)"/g),
  (match) => match[1],
);
expect(metricCardClasses).toHaveLength(4);
for (const className of metricCardClasses) {
  expect(className).toContain("min-h-20");
  expect(className).toContain("gap-2");
  expect(className).toContain("p-3");
  expect(className).toContain("sm:min-h-28");
  expect(className).toContain("sm:gap-3");
  expect(className).toContain("sm:p-4");
}

expect(html.match(/data-metric-note="true" class="hidden sm:block/g)).toHaveLength(4);
expect(html.match(/data-metric-sparkline="true"[^>]+class="[^"]*hidden md:block/g)).toHaveLength(4);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- lib/real-estate-dashboard-liquid-stage.test.ts`

Expected: FAIL because the rail still has `grid-cols-1`, the cards still use only desktop-sized classes, notes are visible, and sparklines lack responsive visibility.

- [ ] **Step 3: Apply the minimal responsive classes**

Update the existing JSX without changing its structure:

```tsx
className="glass real-estate-metrics-glass relative grid grid-cols-2 gap-2 p-2 lg:grid-cols-4"
```

Use `min-h-20 gap-2 p-3 sm:min-h-28 sm:gap-3 sm:p-4` on cards, `size-7 sm:size-8` on icon holders, `size-3.5 sm:size-4` on icons, `text-[11px] leading-tight sm:text-xs` on labels, and `mt-1 text-xl sm:mt-2 sm:text-2xl` on values.

Mark notes with `data-metric-note="true"` and `hidden sm:block`. Add `hidden md:block` to the sparkline SVG while preserving all existing decorative classes.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- lib/real-estate-dashboard-liquid-stage.test.ts`

Expected: both dashboard tests PASS.

- [ ] **Step 5: Run static verification**

Run: `npm run typecheck`

Expected: TypeScript exits with code 0.

Run: `npx eslint "app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx" "lib/real-estate-dashboard-liquid-stage.test.ts"`

Expected: ESLint exits with code 0.

Run: `git diff --check -- "app/(dashboard)/painel/imoveis/dashboard/RealEstateDashboard.tsx" "lib/real-estate-dashboard-liquid-stage.test.ts"`

Expected: no whitespace errors.

- [ ] **Step 6: Record the session**

Run `scripts/obsidian-log.ps1` once with the implementation outcome, focused tests, important files, responsive decisions, and any remaining visual-verification risk. Do not include secrets or customer data.

