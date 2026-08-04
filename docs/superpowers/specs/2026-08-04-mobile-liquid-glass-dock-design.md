# Mobile Liquid Glass Dock Design

**Date:** 2026-08-04
**Status:** approved design, pending implementation plan
**Scope:** authenticated OtimizIA product navigation below the `md` breakpoint

## Goal

Refine the existing mobile bottom navigation into a premium one-handed Apple Liquid Glass dock. The Tim assistant becomes the central primary action, the complete area menu remains available at the right edge, and page content reserves enough bottom space to remain reachable above the floating dock.

## Current implementation

`components/design-system/mobile-app-nav.tsx` already provides most required behavior:

- a fixed five-column bottom dock;
- profession-specific tabs supplied by the shared product navigation;
- a modal “Mais” sheet containing quick actions and remaining routes;
- pending-route feedback, active-route detection, badges, danger state, focus trapping, Escape handling, body scroll locking, and focus restoration;
- safe-area-aware bottom positioning;
- reduced-motion support through Framer Motion;
- a Liquid Glass material alias defined in `app/globals.css`.

The current five positions are `tab 1`, `tab 2`, `Mais`, `tab 3`, and `Tim`. The redesign changes hierarchy and material but does not replace the proven navigation architecture.

## Approved decisions

- Tapping Tim continues to navigate to `/painel/assistente`; it does not start audio capture automatically.
- The dock remains visible only below `md` (`md:hidden`). The existing desktop sidebar still starts at `md`, preventing two navigation systems from appearing between 768 and 1023 pixels.
- Existing profession-specific tab choices remain unchanged. The real-estate, legal, and seller navigation components continue to provide their current three tabs, groups, badges, quick actions, and routes.
- The “Mais” sheet, keyboard behavior, and navigation semantics are preserved.

## Navigation order

The dock uses a five-column grid in this exact DOM and visual order:

1. `tabs[0]`
2. `tabs[1]`
3. Tim
4. `tabs[2]`
5. Mais

This guarantees that Tim occupies the true center column for every profession. “Mais” becomes the rightmost one-handed target without changing its dialog behavior.

## Dock geometry

The navigation frame uses:

```tsx
className="fixed inset-x-4 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-[var(--z-sticky)] mx-auto grid min-h-16 max-w-md grid-cols-5 px-1 md:hidden"
```

Key constraints:

- `inset-x-4` leaves a 16-pixel visual margin on phone widths;
- `bottom-6` is represented by `1.5rem`, with `env(safe-area-inset-bottom)` added for iPhones with a home indicator;
- the dock stays at `max-w-md` on larger phones and small tablets;
- every interactive column keeps at least a 56-pixel-high target;
- no horizontal overflow is introduced at 320, 360, 390, or 430 pixels.

## Liquid Glass material

The dock remains a single glass volume. It must not wrap each tab in a separate outlined capsule.

The frame carries the existing `od-chrome liquid-glass-dock` aliases plus the approved material values:

- translucent graphite equivalent to `bg-gray-900/30`;
- `backdrop-blur-2xl`;
- `backdrop-saturate-150` rather than `saturate-150`, so only the backdrop is saturated and icons/text remain accurate;
- `rounded-3xl`;
- `border border-white/10`;
- `shadow-[0_8px_32px_rgba(0,0,0,0.3)]`.

Because `.od-chrome` and `.liquid-glass-dock` already supply pseudo-element material in `app/globals.css`, their dock-specific rules must be aligned with these values instead of stacking another opaque surface. The final computed material, not the presence of duplicate utility classes, is the acceptance criterion.

The dock keeps a restrained bottom reflection and fine internal highlight. It must not become milky, solid gray, or strongly blue.

## Standard tabs

`BarTab` retains its existing Link semantics, prefetching, badges, `aria-current`, labels, and minimum touch target.

Visual states:

- inactive: `text-white/50`, transparent background;
- hover/focus: `text-white/75` with a subtle translucent surface;
- active: `text-white` with a restrained `bg-white/[0.06]` surface;
- danger badges retain their existing semantic red treatment;
- focus remains visibly outlined through the global focus system.

Labels remain visible below their icons because they disambiguate profession-specific tabs and improve accessibility for unfamiliar icons.

## Central Tim action

`TimTab` stays a semantic Next.js Link with:

- `href={timHref}`;
- `aria-label="Falar com o Tim"`;
- `aria-current="page"` when the assistant route is active;
- the visible label `Tim`;
- the same pending-route feedback as other tabs.

Its central visual is a 48-by-48-pixel circle:

```tsx
className="grid size-12 place-items-center rounded-full bg-indigo-500/80 shadow-[0_0_24px_rgba(99,102,241,0.38)]"
```

The circle uses a Lucide microphone icon and sits slightly above the standard icon baseline. Its complete Link target remains within the center grid column and at least 56 pixels high. The active state increases the glow and adds a subtle internal highlight; it does not change the destination or start recording.

The LogoMark remains available in the “Falar com o Tim” row inside the expanded sheet, where brand identity has enough space. Only the compact central dock action switches to the microphone icon.

## Mais action and sheet

The menu button moves to column five but retains:

- its existing `button` semantics;
- `aria-expanded` and `aria-controls`;
- Menu/X icon swap and `Mais`/`Fechar` label swap;
- active state when the sheet is open or the current route belongs to a hidden group;
- focus restoration when the sheet closes;
- backdrop dismissal, explicit close, Escape, and Tab focus trap.

The sheet remains immediately above the dock. Its bottom offset changes from the current value to account for the dock’s new `bottom-6` placement and 64-pixel height:

```tsx
bottom-[calc(6.25rem+env(safe-area-inset-bottom))]
```

This leaves a deliberate 12-pixel gap between the dock and sheet while preserving the maximum sheet height and existing Liquid Glass material.

## Main content clearance

`app/(dashboard)/painel/layout.tsx` reserves the dock footprint on mobile by changing the main content bottom padding to:

```tsx
pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8
```

This clearance includes dock height, bottom offset, and breathing room. Desktop padding remains unchanged. Page-specific internal scrolling, such as the WhatsApp inbox, keeps its existing local padding and is not removed by this task.

## Accessibility and motion

- All five targets remain at least 44 by 44 pixels; the implementation target is 56 pixels high.
- Link and button semantics remain unchanged.
- Active links continue to expose `aria-current="page"`.
- Tim has a stable accessible name independent of the microphone icon.
- The “Mais” dialog preserves focus trap, Escape dismissal, scroll lock, and focus restoration.
- The center-button lift is static geometry, not a continuous animation.
- Existing reduced-motion behavior remains active for the sheet and navigation transitions.
- Safe-area insets are part of both dock and content offsets.

## Responsive behavior

- Below 768 pixels: the dock is visible and the desktop product sidebar is hidden.
- At and above 768 pixels: the dock and sheet are hidden; the existing desktop sidebar is visible.
- The task does not change topbars, desktop sidebar width, sidebar resizing, or the desktop scrollbar.

## Testing strategy

Implementation follows TDD.

1. Static render tests verify the exact five-position order, Tim’s center position, Link/button semantics, labels, active state, badges, and absence of nested interactive elements.
2. Contract tests verify `md:hidden`, safe-area offsets, `data-mobile-nav`, the dock material alias, and mobile main padding.
3. Playwright mobile tests verify:
   - five visible targets at least 44 by 44 pixels;
   - Tim is horizontally centered and navigates to the assistant;
   - “Mais” occupies the last column;
   - sheet open/close behavior, Escape, backdrop, explicit close, focus restoration, and focus trap;
   - the last page content remains scrollable above the dock;
   - no horizontal overflow at supported phone widths;
   - the dock is absent on desktop projects.
4. Reduced-motion and safe-area-sensitive CSS remain covered by the Liquid Glass contract suite.

## Non-goals

- No automatic microphone permission request or voice capture.
- No route, badge, quick-action, or profession-tab changes.
- No new navigation library or dependency.
- No redesign of the “Mais” sheet content.
- No desktop navigation changes.
- No change to dashboard cards, tables, colors, or background.

## Acceptance criteria

- Tim is the true center item and opens `/painel/assistente`.
- “Mais” is the rightmost item and retains all current accessible dialog behavior.
- The dock uses the approved translucent graphite Liquid Glass material without per-tab glass capsules.
- Standard active/inactive states are legible and preserve labels.
- Main content can be scrolled fully above the dock.
- The dock remains below `md`; desktop navigation is untouched.
- Mobile touch targets, safe-area handling, reduced motion, and navigation tests pass.
