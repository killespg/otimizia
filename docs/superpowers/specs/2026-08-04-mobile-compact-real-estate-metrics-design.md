# Mobile Compact Real Estate Metrics Design

**Date:** 2026-08-04
**Status:** approved
**Scope:** the four summary metrics rendered by `RealEstateMetrics`

## Goal

Condense the four real-estate summary cards on phones so they do not push the indicator content below the fold, while preserving the current Liquid Glass material, destinations, desktop composition, and data.

## Approved behavior

- Below `sm`, render the four metrics as a two-column grid, producing two rows.
- Keep the rail gap and outer padding at 8 pixels.
- Reduce each phone card to an 80-pixel minimum height with 12-pixel padding and an 8-pixel icon/content gap.
- Reduce the icon holder to 28 pixels and the icon to 14 pixels on phones.
- Use an 11-pixel compact label and a 20-pixel primary value on phones.
- Hide metric notes below `sm`; restore the existing note, card geometry, spacing, and typography from `sm` upward.
- Hide decorative sparklines below `md`; restore them unchanged from `md` upward.
- Preserve the value gradient, glass borders, hover lift, focus behavior, routes, accessible labels, and data attributes.

## Responsive geometry

The metric rail uses `grid-cols-2 lg:grid-cols-4`. Each phone card uses `min-h-20 p-3 gap-2`, with the existing `min-h-28 p-4 gap-3` restored at `sm`.

Two 80-pixel rows, the 8-pixel row gap, and 16 pixels of rail padding produce an estimated 184-pixel block. This remains below 30% of a 640-pixel-tall viewport.

## Implementation boundary

The change is implemented only with responsive Tailwind classes in:

- `RealEstateMetrics` for grid, card, icon, label, value, and note behavior;
- `MetricSparkline` for mobile visibility.

No global CSS, duplicated mobile component, indicator layout, sidebar, navigation, background, data calculation, or desktop styling is changed.

## Testing strategy

Implementation follows TDD. The server-rendered dashboard contract must assert:

- the metric rail contains `grid-cols-2` and retains `lg:grid-cols-4`;
- four metric cards contain the compact phone classes and the restored `sm` classes;
- four notes contain `hidden sm:block`;
- four sparklines contain `hidden md:block`;
- the existing count, gradient, routes, and structural assertions remain green.

## Acceptance criteria

- Four metrics form a 2x2 grid on phones.
- Metric notes and sparklines do not consume or pollute phone space.
- The metric block has an estimated minimum height of about 184 pixels.
- Glassmorphism and interaction states remain intact.
- From `sm` upward, card geometry and notes match the current layout.
- From `md` upward, sparklines match the current layout.
- At `lg`, the four cards remain in one horizontal row.

