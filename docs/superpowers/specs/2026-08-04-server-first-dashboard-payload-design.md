# Server-first Typed Dashboard Payload Design

**Date:** 2026-08-04
**Status:** approved architecture, pending implementation plan
**Scope:** authenticated dashboards for `real_estate_broker`, `law_office`, and `autonomous_seller`

## Goal

Move profession-specific dashboard copy and presentation data out of JSX and into typed, pure server adapters. The browser must receive only a serializable presentation payload assembled after authentication and organization/workspace authorization. Existing layout, Liquid Glass materials, Tailwind classes, responsiveness, domain actions, and real Supabase data remain unchanged.

## Current state

- `app/(dashboard)/painel/layout.tsx` authenticates the user, resolves the active organization and workspace, enforces role-based access, loads navigation counts, and selects one of three profession navigation components.
- Each profession already queries Supabase in a Server Component. Real estate uses `/painel/imoveis/dashboard`, legal uses `/painel/juridico`, and the autonomous seller uses the server-side generic dashboard loader before rendering `SellerDashboard`.
- The shared sidebar renderer is `TwoLevelNav`, but each profession still declares labels, routes, icons, mobile tabs, and groups inside a Client Component.
- Real-estate and seller dashboards already map some local arrays, but the arrays and indicator copy are assembled inside the render component. The legal dashboard still declares its summary cards directly in JSX.
- `app/(dashboard)/painel/loading.tsx` exists, but its skeleton does not mirror the current glass metric rail and indicator surface.

## Non-goals

- Do not introduce `useState`, `useEffect`, browser-side Supabase fetching, a dashboard API route, or simulated data.
- Do not move authorization or tenant selection into adapters.
- Do not create a universal database query that loads every profession or every dashboard widget.
- Do not force the legal, seller, and real-estate pages into one visual template. Their current layouts differ and must remain visually intact.
- Do not migrate lower domain panels such as commissions, targets, case tables, task queues, charts, onboarding, or forms into the common payload in this change.
- Do not change Tailwind class strings except in the new skeleton component, which must reuse existing material classes.

## Common contract

Create `lib/dashboard/dashboard-payload.ts`. The contract describes visual structure, never real-estate, legal, or sales domain entities.

```ts
export type DashboardProfession =
  | "real_estate_broker"
  | "law_office"
  | "autonomous_seller";

export type DashboardIconKey =
  | "gauge"
  | "bot"
  | "building"
  | "briefcase"
  | "calendar"
  | "contact"
  | "handCoins"
  | "housePlus"
  | "images"
  | "kanban"
  | "mapPinned"
  | "messageCircle"
  | "settings"
  | "users"
  | "barChart"
  | "badgeDollarSign"
  | "fileSearch"
  | "files"
  | "landmark"
  | "listTodo"
  | "receiptText"
  | "scale"
  | "walletCards"
  | "bellRing"
  | "layers"
  | "clipboardList"
  | "packageSearch"
  | "shieldCheck"
  | "slidersHorizontal"
  | "alertTriangle"
  | "fileClock"
  | "refresh"
  | "circleDollarSign"
  | "wallet"
  | "columns"
  | "checkCircle"
  | "bell"
  | "message";

export interface DashboardNavigationItem {
  id: string;
  href: string;
  label: string;
  icon: DashboardIconKey;
  exact?: boolean;
  badge?: number;
  danger?: boolean;
}

export interface DashboardNavigationGroup {
  id: string;
  label: string;
  items: DashboardNavigationItem[];
}

export interface DashboardNavigationPayload {
  namespace: string;
  logoHref: string;
  subtitle: string;
  organizationName: string;
  displayName: string;
  railAriaLabel: string;
  detailAriaLabel: string;
  mobileAriaLabel: string;
  groups: DashboardNavigationGroup[];
  submenu?: {
    parentHref: string;
    items: Array<{ id: string; href: string; label: string }>;
  };
  mobileTabs: [DashboardNavigationItem, DashboardNavigationItem, DashboardNavigationItem];
  mobileTimHref: string;
  mobileGroups: DashboardNavigationGroup[];
  mobileQuickActions?: DashboardNavigationItem[];
}

export interface DashboardMetricPayload {
  id: string;
  title: string;
  value: string;
  subtext: string;
  icon: DashboardIconKey;
  href?: string;
  tone?: "default" | "warning" | "danger";
  visible?: boolean;
  order?: number;
}

export interface DashboardIndicatorPayload {
  id: string;
  title: string;
  value: string;
  subtext: string;
  href?: string;
  progress?: {
    value: number;
    label: string;
  };
}

export interface DashboardIndicatorGroupPayload {
  id: string;
  title: string;
  indicators: DashboardIndicatorPayload[];
}

export interface DashboardContentPayload {
  title: string;
  description: string;
  reportAction?: { label: string; href: string; download?: boolean };
  metrics: DashboardMetricPayload[];
  indicatorGroups: DashboardIndicatorGroupPayload[];
}

export interface DashboardPayload {
  profession: DashboardProfession;
  navigation: DashboardNavigationPayload;
  content: DashboardContentPayload;
}
```

All values crossing a Server Component boundary are strings, numbers, booleans, arrays, and plain objects. Dates, Supabase clients, functions, React elements, and Lucide components are forbidden in the payload.

Stable `id` values are required for React keys and must not be derived from translated labels. Progress values are clamped to `0..100` by the adapter.

## App Router boundary

The persistent sidebar lives in `layout.tsx`, while filtered dashboard content lives in route pages. Building one full payload in both places would either duplicate expensive queries or make every subroute fetch the full dashboard.

Therefore `DashboardPayload` is the canonical complete schema, but adapters expose independently buildable slices:

```ts
interface DashboardAdapter<TNavigationInput, TContentInput> {
  navigation(input: TNavigationInput): DashboardPayload["navigation"];
  content(input: TContentInput): DashboardPayload["content"];
}
```

The layout consumes `adapter.navigation(...)` from counts it already loads. Each profession's main page consumes `adapter.content(...)` after its existing domain queries and filters. This preserves the persistent App Router layout and avoids loading page data merely to draw the sidebar.

## Server adapter pattern

Create the following pure modules:

- `lib/dashboard/adapters/real-estate-dashboard-adapter.ts`
- `lib/dashboard/adapters/legal-dashboard-adapter.ts`
- `lib/dashboard/adapters/seller-dashboard-adapter.ts`
- `lib/dashboard/dashboard-adapters.ts`

Each adapter owns:

- profession-specific labels, navigation groups, routes, empty-state copy, singular/plural copy, value formatting, and progress calculation;
- transformation from a typed raw input into the common presentation contract;
- filtering of navigation items based on authorized capabilities already calculated by the server, such as legal finance visibility or enabled seller modules;
- no database calls and no authorization decisions.

The registry performs an exhaustive dispatch over `DashboardProfession`. Adding a fourth supported profession must fail TypeScript until its adapter is registered.

Adapter inputs contain only the raw or already-authorized domain values required for presentation. Examples:

- real estate: property counts, visits, offers, commissions, targets, organization/display names, filters, and allowed navigation counts;
- legal: active cases, critical deadlines, review counts, financial totals only when `canViewFinance` is true, and authorized navigation counts;
- seller: existing metric numbers, commercial insights, operation module flags, organization/display names, and authorized navigation counts.

Supabase queries remain in Server Components and continue to constrain rows by `org_id` and, where the table is shared, `workspace_key`. Query errors must be surfaced to the route error boundary instead of being silently adapted as zero-valued data.

## Icon resolution

Create `components/dashboard/dashboard-icon-registry.ts` with a total mapping from `DashboardIconKey` to Lucide components. The shared client navigation component resolves icon keys immediately before calling `TwoLevelNav`.

This is the only client-side mapping. Profession adapters stay free of React imports and remain serializable and easy to unit test.

## Navigation rendering

Create `components/dashboard/profession-product-navigation.tsx` as the shared Client Component. It receives `DashboardNavigationPayload`, workspace switcher values, and the logout server action already used by the current wrappers. It resolves icons and passes the existing `NavGroup`, submenu, mobile tabs, mobile groups, quick actions, labels, and organization data to `TwoLevelNav`.

`PainelLayout` selects the profession adapter after its current authentication and permission checks, builds the navigation payload from the counts already fetched, and renders the shared navigation component. Existing authorization branches and count queries remain in place.

The three current profession navigation components may become thin compatibility wrappers during the migration, then be removed only after route and contract tests prove all labels, routes, badges, mobile tabs, quick actions, submenu items, and ARIA labels are unchanged.

## Dashboard content rendering

Each profession keeps its current renderer and Tailwind classes. Only the data assembly moves:

- `RealEstateDashboard` receives `content: DashboardContentPayload`; `RealEstateMetrics` maps `content.metrics` and `RealEstateCommercialIndicators` maps `content.indicatorGroups`.
- `SellerDashboard` receives the same content slice for `SellerMetrics` and `SellerCommercialIndicators`; widget ordering and visibility still come from existing dashboard preferences.
- `LegalDashboardPage` passes its adapted metrics to the existing `StatCard` renderer using `.map()`. Legal sections that are not structurally metric or indicator groups remain domain-specific.

The renderers may use a profession-specific visual component because the existing classes differ. They must not recreate labels, values, routes, or notes in JSX. The adapter provides those properties.

Hardcoded copy outside the shared areas—forms, table columns, empty-state tutorials, domain panels, and action forms—is intentionally out of scope. This prevents a data architecture change from becoming an unrelated content-system rewrite.

## Data flow

1. A Server Component authenticates the user.
2. It resolves `org_id`, workspace, membership, role, and enabled domain access.
3. It queries only the authorized profession tables, retaining current `org_id` and `workspace_key` filters.
4. It checks Supabase errors before adaptation.
5. It passes typed raw values into the selected profession adapter.
6. The adapter returns serializable navigation or content payload data.
7. Existing components map payload arrays while retaining current markup and Tailwind classes.
8. Nested `loading.tsx` files provide the same visual geometry until the server response is ready.

No client refetch occurs during hydration.

## Loading states

Create `components/dashboard/dashboard-overview-skeleton.tsx` and reuse it from:

- `app/(dashboard)/painel/loading.tsx` for the seller dashboard;
- `app/(dashboard)/painel/imoveis/dashboard/loading.tsx` for real estate;
- `app/(dashboard)/painel/juridico/loading.tsx` for legal.

The shared component accepts a visual variant only when necessary to reproduce an existing surface. It renders:

- the current header footprint;
- four metric placeholders in the same responsive grid;
- the current three-column indicator footprint;
- translucent `bg-white/5` shapes with `animate-pulse motion-reduce:animate-none`;
- existing `glass`, `panel`, `real-estate-metrics-glass`, and `real-estate-indicators-glass` classes as appropriate.

The route-level `loading.tsx` convention supplies the Suspense boundary automatically. No loading state appears inside dashboard business components.

## Error handling

- Authentication and access failures keep their current redirect, `notFound`, or restricted-state behavior.
- Supabase query failures throw from the Server Component or a small server-only result helper and are handled by the existing route error boundary.
- Adapters are total for valid input and do not catch infrastructure errors.
- Missing optional business data produces honest empty-state copy from the adapter; it is not treated as an infrastructure error.
- Unauthorized finance data is omitted before adaptation and never serialized as a hidden metric.

## Testing strategy

Implementation follows TDD.

1. Contract tests assert that payloads contain only serializable values, stable IDs, valid icon keys, and clamped progress.
2. Adapter unit tests cover real-estate, legal, and seller fixtures, including zero-data states, singular/plural copy, permissions, and module flags.
3. Navigation rendering tests compare every current desktop/mobile route, label, badge, submenu, quick action, and ARIA label before and after migration.
4. Dashboard renderer tests verify that payload values appear and that profession-specific hardcoded metric/indicator copy no longer exists in JSX.
5. Skeleton tests verify four metric placeholders, indicator geometry, `animate-pulse`, `bg-white/5`, and `motion-reduce:animate-none`.
6. Existing typecheck, lint, unit, and Liquid Glass E2E suites remain release gates. Authenticated E2E only counts when credentials are available.

## Compatibility and rollout

The migration is incremental and keeps each step releasable:

1. Add the contract and pure adapters with tests.
2. Migrate navigation payload construction while preserving `TwoLevelNav` markup.
3. Migrate real-estate metrics and indicators.
4. Migrate seller metrics and commercial indicators.
5. Migrate legal summary metrics without changing its domain-specific sections.
6. Replace route skeletons and run the complete validation suite.

No schema migration, Supabase policy change, API route, new dependency, or visual redesign is required.

## Acceptance criteria

- All three enabled professions have typed server adapters.
- Sidebar labels/routes/counts and shared metric/indicator copy come from typed payloads rather than profession JSX literals.
- Supabase remains server-only for dashboard loading and preserves organization/workspace boundaries.
- Dashboard renderers use `.map()` over payload arrays.
- The existing visual DOM structure and Tailwind classes remain unchanged except for new skeleton markup.
- Route-level skeletons preserve the glass layout and reduced-motion behavior.
- No `useState` or `useEffect` is added for dashboard data loading.
- Typecheck, lint, unit tests, and applicable E2E tests pass with no invented data.
