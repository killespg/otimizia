# OtimizIA neutral-cobalt frontend reconstruction

Date: 2026-08-13
Status: approved for implementation
Scope: all web frontend surfaces in the functional `otimizia` checkout

## 1. Objective

Reconstruct the OtimizIA visual layer as a professional, neutral and accessible
system. The interface uses black and graphite surfaces, coherent borders and a
tempered cobalt accent. The reconstruction covers the landing page,
authentication, onboarding, upgrade, the persistent product shell, every
business vertical, public legal pages and printable documents.

The work preserves routes, authorization, server actions, data contracts,
integrations and product behavior. It replaces visual primitives, shells and
page composition rather than rebuilding the business application.

The same semantic tokens and interaction contracts must be usable by a future
native mobile client. React DOM components are web-specific and are not shared
with that client.

## 2. Approved visual direction

The approved direction combines:

- Base D, `Equilibrio`: near-black canvas, comfortable graphite surfaces and a
  radius scale of 9, 11 and 15 pixels.
- Accent K, `Cobalto temperado`: a single cobalt family with different
  intensities for actions, selection, focus and data.
- Solid surfaces. No glassmorphism, translucent dock, decorative gradient,
  refraction, grain, ambient canvas or shader background.
- The 2026 OtimizIA logo and application icons remain the only brand assets.
- Product verticals differ through information architecture, icons and real
  content, not through competing color themes.

The design signature is a restrained cobalt selection rail paired with a soft
cobalt-tinted active background. It identifies navigation and selected rows
without filling whole panels with blue.

## 3. Semantic token contract

Tokens use purpose-based names so another renderer can implement the same
contract without importing CSS.

### 3.1 Neutral palette

| Token | Value | Purpose |
|---|---:|---|
| `canvas` | `#0B0D11` | Root application and landing background |
| `surface-base` | `#11151A` | Sidebar, topbar and recessed areas |
| `surface-primary` | `#15191F` | Main panels, controls and cards with purpose |
| `surface-secondary` | `#1B2027` | Selected groups and raised interactive areas |
| `surface-hover` | `#20262E` | Hover on neutral interactive rows |
| `border-subtle` | `#252C35` | Separation inside groups and tables |
| `border-default` | `#2D3540` | Panel and control boundaries |
| `border-strong` | `#3B4653` | Emphasized controls and drag boundaries |
| `text-primary` | `#F5F7FA` | Headings and primary content |
| `text-secondary` | `#98A2AF` | Supporting text; 6.82:1 on primary surface |
| `text-tertiary` | `#7D8998` | Large labels and optional metadata only |
| `text-disabled` | `#64748B` | Disabled content only, never required content |

### 3.2 Cobalt palette

| Token | Value | Purpose |
|---|---:|---|
| `action-primary` | `#2F6FCC` | Primary button; white text contrast is 4.92:1 |
| `action-primary-hover` | `#285AA5` | Primary hover and pressed state |
| `accent-default` | `#4E7FBF` | Charts, selected markers and non-text accents |
| `accent-soft` | `#91B6E7` | Text and icon on cobalt tint |
| `focus-ring` | `#7DA7E0` | Keyboard focus; 7.85:1 on canvas |
| `accent-tint` | `#18283E` | Active navigation, tags and selected row tint |

Blue never replaces neutral surfaces at rest. It communicates action,
selection, current position, focus or quantitative emphasis.

### 3.3 Semantic status

Success, warning and danger use dedicated icon, label and color combinations.
No state relies on color alone. Their pale foregrounds are used on dark tints;
solid status colors are reserved for icons, compact markers and charts.

### 3.4 Geometry and spacing

- `radius-control`: 9px for buttons, inputs, menu items and compact controls.
- `radius-inner`: 11px for metric bands, grouped controls and nested regions.
- `radius-panel`: 15px for dialogs, drawers and primary content panels.
- `radius-round`: 999px only for avatars, circular icon buttons, toggles and
  true capsule states that need variable text width.
- Spacing follows a 4px base grid. Standard gaps are 8, 12, 16, 24, 32 and
  48px.
- Borders are 1px at rest and 2px only for focus, validation or active drag.
- Shadows communicate real elevation. In-flow panels use borders instead.

## 4. Typography and iconography

- Inter remains the product and marketing typeface.
- Headings use a compact scale with negative letter spacing only at 24px or
  larger.
- Body copy uses at least 14px in dense data UI and 16px in marketing/auth.
- Labels use sentence case. Uppercase is limited to short structural metadata
  whose meaning is not carried by typography alone.
- Metrics use tabular numerals. Monospace is restricted to IDs, code and
  technical values.
- Icons use one outline family and inherit semantic foreground color. Icons do
  not replace text when the action could be ambiguous.

## 5. Architecture

The dependency direction is:

`semantic tokens -> accessible primitives -> shells -> domain compositions -> routes`

### 5.1 Cross-platform foundation

Platform-neutral TypeScript exports define token names, navigation items,
component state vocabulary and intent variants. The web adapter exposes the
tokens as CSS custom properties and Tailwind utilities. A future native adapter
can expose the same contract as a native theme object.

Business validation, authorization and data transformations stay outside
visual components. Server Actions remain the web transport, but domain inputs
and results must not be hidden inside DOM-only components. This leaves a clear
boundary for a future HTTP/BFF adapter without building that API in this phase.

### 5.2 Web primitives

The new web primitive layer includes:

- Controls: Button, IconButton, Input, Textarea, Select, Checkbox, Radio,
  Switch and SearchField.
- Navigation: Sidebar, Topbar, BottomNav, Breadcrumb, Tabs and CommandMenu.
- Data: Table, DataList, MetricBand, Stat, Badge, Status and Pagination.
- Composition: Surface, Section, Toolbar, FilterBar, SplitView and DetailPanel.
- Feedback: Alert, Toast, Skeleton, EmptyState, ErrorState and PermissionState.
- Overlays: Dialog, Drawer, Popover and Tooltip.

Components support default, hover, pressed, focus-visible, loading, disabled,
error and success states where applicable. Every interactive target is at least
44 by 44 pixels.

Cards are not the default container. Related information uses one panel with
bands, rows or sections. Nested cards require a distinct interaction or
elevation reason.

### 5.3 Product shell

One shared shell renders desktop sidebar, product topbar and responsive bottom
navigation from data. Navigation definitions contain stable key, label, icon,
permission requirement and web destination. The future native renderer can map
the same stable keys and permissions to native destinations.

The seller, real-estate, legal and generic shells become configurations of the
same components. Duplicate navigation/topbar implementations are removed only
after every consumer is migrated and verified.

## 6. Surface reconstruction

### 6.1 Landing

- Use the neutral canvas and cobalt action system without copying dashboard
  components into marketing.
- The hero is typographic and product-led; the real product preview remains the
  primary proof.
- Reduce repeated uppercase labels, decorative bands and divider density.
- Feature comparison uses accessible tabs on wide screens and an accordion or
  stacked sections on narrow screens.
- FAQ answers exist in the server-rendered HTML and remain readable without
  JavaScript.
- Claims and metrics must remain grounded in implemented product behavior.

### 6.2 Authentication, onboarding and upgrade

- Use one AuthShell with a focused form surface and restrained brand context.
- Remove ambient particles and animated shapes.
- Inputs expose labels, descriptions, errors, autocomplete and correct input
  modes. Password affordances remain keyboard and screen-reader accessible.
- Mobile uses a single-column app-like flow with safe-area padding and no
  information hidden behind decorative panels.

### 6.3 Product dashboards

- Replace isolated metric cards with MetricBand groups.
- Use DataList or Table according to density and viewport, not horizontally
  compressed desktop tables on mobile.
- Charts use graphite series with one cobalt emphasis and accessible textual
  summaries.
- Loading, empty, error and permission states are explicit. Query failures must
  never be rendered as trustworthy zero values.
- Remove shader, neural and ambient backgrounds from authenticated routes.

### 6.4 Operational routes

- Contacts, pipeline, tasks, finance, products, orders, collections and
  post-sale share Toolbar, FilterBar, DataList/Table and DetailPanel patterns.
- Forms share field layout, validation and action placement.
- Destructive actions use danger intent and explicit confirmation; cobalt is
  never used to make destructive actions look primary.
- Dense desktop layouts become stacked sections, drawers or bottom sheets at
  small widths. No essential action depends on hover, drag or right-click.

### 6.5 Vertical-specific routes

- Legal: processes, documents, fees and deadlines use neutral legal data
  layouts. Status retains semantic color and label. The assistant is a
  contextual panel, not a visually separate product.
- Real estate: properties, visits, collections, matches, offers and commissions
  use the shared shell and data primitives. Photography and maps sit inside
  neutral media frames.
- Seller: catalog, orders, funnel, finance and operational insights use the same
  density and hierarchy. Category and channel color never becomes a page theme.
- Generic workspaces use the same shell with only applicable destinations.

### 6.6 Public legal pages and printable documents

Terms and privacy use the neutral web canvas and a readable narrow measure.
PDFs, proposals and print routes are an explicit exception: white paper, dark
text, neutral rules and restrained cobalt structure optimize printing and
document exchange. Print CSS removes navigation, backgrounds and interactive
controls.

## 7. Responsive and future mobile behavior

- Support from 320px without body-level horizontal scrolling.
- Respect safe-area insets for topbars, drawers, fixed actions and bottom nav.
- Navigation supports stable active state and no duplicated primary action.
- Touch targets are at least 44 by 44 pixels with adequate spacing.
- Forms specify input type, inputmode, autocomplete and logical focus order.
- Tables declare their mobile adaptation: DataList, horizontal region with a
  label, or column reduction. Silent clipping is forbidden.
- Hover enhances but never reveals the only route to an action.
- Motion respects `prefers-reduced-motion`; content does not depend on motion.
- The native client preparation ends at shared semantics and adapter
  boundaries. Native navigation, offline storage, push notifications and the
  mobile API are separate future projects.

## 8. Accessibility contract

- WCAG 2.2 AA is the release target.
- Body text and controls meet 4.5:1; large text meets 3:1; focus and meaningful
  non-text UI meet 3:1 against adjacent colors.
- Focus-visible is never removed and is not represented by color fill alone.
- Tabs have associated tabpanels, roving tabindex and arrow-key navigation.
- Dialogs and drawers have accessible names, focus management, Escape handling
  and focus restoration.
- Status, validation and charts expose text alternatives.
- Server-rendered core content remains available when JavaScript is disabled.
- Heading order, landmarks and form labels are route-level acceptance checks.

## 9. Data and error behavior

Visual reconstruction must not fabricate data or silently normalize failures.
Each data surface distinguishes loading, empty, permission-denied and failed
states. Existing server errors are preserved and mapped to safe user-facing
messages. Telemetry details never expose secrets or customer data.

The design layer does not change mutation semantics, organization boundaries or
integration payloads. Authorization tests remain required when a refactor moves
form or action boundaries.

## 10. Migration strategy

1. Establish visual contract tests and token assertions that fail on the old
   palette and geometry.
2. Add platform-neutral token and navigation contracts plus the web adapter.
3. Build accessible primitives with focused unit and interaction tests.
4. Rebuild the shared product shell and migrate every vertical configuration.
5. Rebuild auth, onboarding and upgrade.
6. Recompose dashboards and operational routes by shared pattern.
7. Rebuild landing and public legal pages without importing product domain
   components.
8. Rebuild printable surfaces with the documented light-paper exception.
9. Remove superseded components and decorative backgrounds after import scans
   prove there are no consumers.
10. Run static, unit, integration, build, accessibility, responsive and
    authenticated browser validation.

Existing uncommitted work is preserved and reviewed file by file. Mechanical
global replacement is not an acceptable migration method.

## 11. Verification and acceptance criteria

- No active product route uses the previous navy/violet palette, glass,
  decorative gradients, ambient canvas, shader or neural background.
- No arbitrary radii remain outside documented exceptions.
- Landing, auth, onboarding, upgrade, every panel vertical and public legal
  pages use the neutral-cobalt contract.
- Print/PDF routes use the accessible light-paper exception.
- Keyboard-only use can reach and operate all essential actions.
- Automated contrast checks and manual spot checks meet the accessibility
  contract.
- Desktop, tablet, 390px and 320px layouts have no body overflow or obstructed
  actions.
- Unit, integration, lint, typecheck and production build results are reported
  exactly. Unavailable external systems are reported as unverified.
- Anonymous and authenticated browser flows are tested with real hydration.
- The existing 2026 logo assets render correctly in web, PWA and dark/light
  document contexts.
- No business rule, authorization boundary, data contract or integration is
  intentionally changed by the visual reconstruction.

## 12. Risks and controls

- Broad CSS regressions: introduce tokens and primitives first, then migrate by
  consumer and route.
- Dirty worktree overlap: inspect every diff, avoid blanket resets and verify
  user changes remain represented.
- Duplicate shell logic: keep compatibility adapters until all verticals pass
  route tests, then remove old implementations.
- Accessibility regression: require component tests plus browser keyboard and
  no-JavaScript checks.
- False completion from local checks: keep build, local Supabase, authenticated
  flows and external integration status as separate evidence gates.
- Future-mobile overengineering: share semantics and boundaries now; defer
  native implementation and mobile-specific infrastructure.
