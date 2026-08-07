# Cinematic Liquid Glass Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current flat public landing with the approved cinematic Liquid Glass corridor while preserving real product claims, public actions, responsive behavior, and the authenticated product boundary.

**Architecture:** `app/page.tsx` owns the semantic chapter order and keeps authentication server-side. A focused client component coordinates the “Hoje → Tim → Negócios” scroll transforms without owning copy or data. Landing-only material and fallback rules live under the `landing-cinematic-` prefix in `app/globals.css`; existing feature, preview, pricing, FAQ, and about components retain their domain responsibilities.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion 12, Vitest 4, Playwright 1.62.

## Global Constraints

- Restrict the new visual language to `app/page.tsx` and `components/landing`; do not promote it to `components/design-system`.
- Preserve login, signup, public anchors, cookie preferences, and authenticated-user redirect behavior.
- Keep Inter, `#8757f0` as the action/selection color, `#6f315f` as ambient light only, and truthful current pricing/capability copy.
- Normal text must reach 4.5:1 contrast; large text must reach 3:1 on rendered pixels.
- Keep every interactive target at least 44 × 44 px and prevent document overflow at 390 px.
- Keep essential content and CTAs visible without JavaScript.
- Honor `prefers-reduced-motion`, `prefers-reduced-transparency`, and `prefers-contrast: more`.
- Never nest `backdrop-filter` stages or add gradient text, mouse spotlights, looping decoration, stock assets, or a glass card for every feature.
- Scroll transforms are bounded to 32 px translation, `0.98`–`1.02` scale, and at least `0.72` content opacity.

---

### Task 1: Lock the cinematic landing contract

**Files:**
- Create: `test/e2e/landing-cinematic.spec.ts`
- Modify: `test/e2e/landing-no-js.spec.ts`
- Modify: `test/e2e/landing-responsive.spec.ts`

**Interfaces:**
- Consumes: the rendered public route at `/`.
- Produces: behavior assertions for `data-landing-cinematic`, `data-cinematic-plate`, `data-landing-stage`, chapter order, reduced-preference fallbacks, mobile overflow, and updated hero copy.

- [ ] **Step 1: Write the failing Playwright contract**

```ts
import { expect, test } from "@playwright/test";

test("apresenta o corredor cinematográfico com o produto antes das profissões", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-landing-cinematic="true"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: /Seu negócio não para/i })).toBeVisible();

  const plates = page.locator("[data-cinematic-plate]");
  await expect(plates).toHaveCount(3);
  await expect(plates.nth(0)).toContainText("Hoje");
  await expect(plates.nth(1)).toContainText("Tim");
  await expect(plates.nth(2)).toContainText("Negócios");

  const chapterOrder = await page.locator("main section[id]").evaluateAll(
    (sections) => sections.map((section) => section.id),
  );
  expect(chapterOrder.indexOf("painel")).toBeLessThan(chapterOrder.indexOf("recursos"));

  const panelStage = page.locator('[data-landing-stage="panel"]');
  await expect(panelStage).toBeVisible();
  expect(await panelStage.evaluate((element) => getComputedStyle(element).backdropFilter)).not.toBe("none");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx.cmd --no-install playwright test test/e2e/landing-cinematic.spec.ts --project=desktop-chromium`

Expected: FAIL because the cinematic data markers and classes do not exist yet and `#recursos` still precedes `#painel`.

- [ ] **Step 3: Update the Playwright expectations before implementation**

```ts
await expect(
  page.getByRole("heading", { name: /Seu negócio não para/i }),
).toBeVisible();
await expect(page.locator('[data-landing-cinematic="true"]')).toBeVisible();
```

In `landing-no-js.spec.ts`, retain checks for resources, `R$ 39,90 por mês`, and the signup link. In `landing-responsive.spec.ts`, retain the overflow and 44 px target audit while updating only the hero heading matcher.

- [ ] **Step 4: Run both E2E files and confirm they fail only on the new design contract**

Run: `npx.cmd --no-install playwright test test/e2e/landing-no-js.spec.ts test/e2e/landing-responsive.spec.ts --project=desktop-chromium --project=mobile-chromium`

Expected: FAIL on the new heading or cinematic root marker; existing interactions remain discoverable.

- [ ] **Step 5: Commit the RED contract**

```powershell
git add -- test/e2e/landing-cinematic.spec.ts test/e2e/landing-no-js.spec.ts test/e2e/landing-responsive.spec.ts
git commit -m "test(landing): define contrato cinematografico"
```

### Task 2: Build the canvas, hero, and scroll corridor

**Files:**
- Create: `components/landing/cinematic-scroll-corridor.tsx`
- Modify: `components/landing/hero.tsx`
- Modify: `app/globals.css`
- Test: `test/e2e/landing-cinematic.spec.ts`

**Interfaces:**
- Produces: `CinematicScrollCorridor({ children }: { children: ReactNode })`, which only exposes layout and scroll-progress context through CSS custom properties.
- Produces: hero markers `data-cinematic-plate="today|tim|business"` and stable section links to `#painel` and `/signup`.
- Consumes: Framer Motion `useScroll`, `useTransform`, and `useReducedMotion`; no product data or authentication state.

- [ ] **Step 1: Implement the isolated corridor component**

```tsx
"use client";

import { type ReactNode, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

export function CinematicScrollCorridor({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [32, -32]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.98, 1.02, 0.98]);

  return (
    <motion.div
      ref={ref}
      className="landing-cinematic-corridor"
      style={reduceMotion ? { y: 0, scale: 1 } : { y, scale }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Replace the hero composition**

Use one open hero with the approved headline, two truthful CTAs, and three semantic plates:

```tsx
<h1 className="lp-h1 landing-cinematic-hero-title">
  Seu negócio não para.
  <span>Você também não.</span>
</h1>
<p>O OtimizIA mostra o que precisa da sua atenção, executa o próximo passo com o Tim e mantém cada negócio em movimento.</p>
<div className="landing-cinematic-plates" aria-label="Como o OtimizIA acompanha o seu dia">
  <article data-cinematic-plate="today">Hoje</article>
  <article data-cinematic-plate="tim">Tim</article>
  <article data-cinematic-plate="business">Negócios</article>
</div>
```

Each plate must contain a real one-sentence product proof, not a fabricated metric.

- [ ] **Step 3: Replace the dead `landing-liquid-*` block with the cinematic material system**

Implement `.landing-cinematic-page`, `.landing-cinematic-light`, `.landing-cinematic-corridor`, `.landing-cinematic-plates`, `.landing-cinematic-plate`, `.landing-cinematic-stage`, and `.landing-cinematic-stage--quiet`. Remove selectors that have no remaining use. Keep the stage fill dark enough for AA and use only two ambient fields.

```css
.landing-cinematic-stage {
  isolation: isolate;
  border: 1px solid rgba(255,255,255,.2);
  background: rgba(24, 20, 32, .72);
  backdrop-filter: blur(22px) saturate(145%);
  box-shadow: inset 0 -1px rgba(255,255,255,.24), 0 30px 72px -44px rgba(0,0,0,.9);
}
```

- [ ] **Step 4: Add preference and unsupported-browser fallbacks**

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .landing-cinematic-stage,
  .landing-cinematic-plate { background: rgba(21, 19, 27, .98); }
}

@media (prefers-reduced-transparency: reduce) {
  .landing-cinematic-stage,
  .landing-cinematic-plate { backdrop-filter: none; background: #15131b; }
}
```

Also remove scroll transforms under `prefers-reduced-motion` and reinforce stage borders under `prefers-contrast: more`.

- [ ] **Step 5: Run the focused contract**

Run: `npx.cmd --no-install playwright test test/e2e/landing-cinematic.spec.ts --project=desktop-chromium`

Expected: plate and CSS assertions pass; page-order assertions remain RED until Task 3.

- [ ] **Step 6: Commit the hero and material foundation**

```powershell
git add -- components/landing/cinematic-scroll-corridor.tsx components/landing/hero.tsx app/globals.css test/e2e/landing-cinematic.spec.ts
git commit -m "feat(landing): cria corredor liquid glass"
```

### Task 3: Recompose the page around early product proof

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/landing/container-scroll-animation.tsx`
- Modify: `components/landing/dashboard-preview.tsx`
- Test: `test/e2e/landing-cinematic.spec.ts`

**Interfaces:**
- Consumes: `CinematicScrollCorridor` from Task 2.
- Produces: semantic order `Hero → #painel → #ia → #recursos → #planos → #duvidas → #sobre → #cta-final`.
- Produces: `data-landing-stage="panel|tim|professions|conversion"` markers for stable tests and visual inspection.

- [ ] **Step 1: Replace alternating section backgrounds with open chapters**

Change `Section` to accept `chapter?: "today" | "tim" | "business" | "conversion"` instead of `raised`. Render one chapter label and no `bg-od-muted-surface`.

```tsx
<section id={id} data-landing-chapter={chapter} className="lp-section landing-cinematic-section">
```

- [ ] **Step 2: Move `#painel` immediately after the hero**

Wrap the preview in `CinematicScrollCorridor`, add `data-landing-stage="panel"`, and keep the current navigation instructions. Remove duplicate outer backgrounds and make `ContainerScroll` use `landing-cinematic-stage` as its only frame.

- [ ] **Step 3: Build the chapter sequence**

Use chapter labels and concise headings:

```tsx
<Section id="ia" chapter="tim" title="O próximo passo já pode estar feito.">
<Section id="recursos" chapter="business" title="O mesmo núcleo, do jeito da sua profissão.">
```

Keep the existing truthful descriptions and all FAQ answers; change only the order and editorial framing.

- [ ] **Step 4: Make the preview frame responsive**

Keep the dashboard’s own mobile layout. The outer stage must be `height: auto` below 640 px, use `overflow: clip`, and never scale the actual dashboard text below its authored size.

- [ ] **Step 5: Run the contract and public-route unit suite**

Run: `npx.cmd --no-install playwright test test/e2e/landing-cinematic.spec.ts --project=desktop-chromium`

Run: `npm.cmd test -- lib/frontend-route-parity.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the page composition**

```powershell
git add -- app/page.tsx components/landing/container-scroll-animation.tsx components/landing/dashboard-preview.tsx test/e2e/landing-cinematic.spec.ts
git commit -m "feat(landing): antecipa prova real do produto"
```

### Task 4: Apply one coherent glass stage per chapter

**Files:**
- Modify: `components/landing/feature-tabs.tsx`
- Modify: `components/landing/ai-composer.tsx`
- Modify: `components/landing/pricing.tsx`
- Modify: `components/landing/FaqAccordion.tsx`
- Modify: `components/landing/about.tsx`
- Modify: `app/globals.css`
- Test: `test/e2e/landing-cinematic.spec.ts`

**Interfaces:**
- Consumes: `.landing-cinematic-stage` and `.landing-cinematic-stage--quiet` from Task 2.
- Produces: a single stage per interactive or conversion chapter; no descendant uses `backdrop-filter`.

- [ ] **Step 1: Turn the profession selector into the interactive business stage**

Wrap the segmented control and selected profession content in one `landing-cinematic-stage`. Keep feature rows unframed. The selected tab uses violet; unselected tabs use transparent text states with 44 px targets.

- [ ] **Step 2: Turn Tim into a single conversational stage**

Replace `lp-panel lp-panel-quiet` with `landing-cinematic-stage`. Keep the message history and input in the same material; internal bubbles use opaque low-emphasis fills without `backdrop-filter`.

- [ ] **Step 3: Build the conversion environment**

Use one stage each for pricing and FAQ, and one quiet stage for the comparison in `About`. Keep their internal split/list structure and current real copy.

- [ ] **Step 4: Add stable stage markers**

```tsx
data-landing-stage="professions"
data-landing-stage="tim"
data-landing-stage="pricing"
data-landing-stage="faq"
data-landing-stage="about"
```

Assert each exists once and no stage contains another stage in `landing-cinematic.spec.ts` against the rendered DOM.

- [ ] **Step 5: Run focused tests**

Run: `npx.cmd --no-install playwright test test/e2e/landing-cinematic.spec.ts --project=desktop-chromium`

Expected: PASS.

- [ ] **Step 6: Commit the chapter materials**

```powershell
git add -- components/landing/feature-tabs.tsx components/landing/ai-composer.tsx components/landing/pricing.tsx components/landing/FaqAccordion.tsx components/landing/about.tsx app/globals.css test/e2e/landing-cinematic.spec.ts
git commit -m "feat(landing): unifica stages cinematograficos"
```

### Task 5: Complete navigation, mobile behavior, and final CTA

**Files:**
- Modify: `components/landing/landing-nav.tsx`
- Modify: `components/landing/mobile-sticky-cta.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Test: `test/e2e/landing-responsive.spec.ts`

**Interfaces:**
- Consumes: existing `NavBar` API and the new page anchors.
- Produces: navigation order matching the page, cinematic nav styling, and a final conversion stage that does not collide with the mobile sticky CTA or cookie banner.

- [ ] **Step 1: Reorder navigation items to match the page**

Set the sequence to O painel, Sócio-assistente, Profissões, Planos, Dúvidas, Sobre nós. Keep login and signup actions unchanged.

- [ ] **Step 2: Make the landing nav a visible floating glass volume**

Target the class actually emitted by `NavBar`; do not depend on the dead compound selector `header.landing-liquid-nav.od-chrome`. Verify the rendered header has non-`none` backdrop filter.

- [ ] **Step 3: Give the final CTA its own focused reflection**

Use `landing-cinematic-stage landing-cinematic-final-cta`, retain `/signup`, and keep the footer open on the canvas.

- [ ] **Step 4: Validate sticky CTA collision rules**

Ensure the sticky CTA hides when `#cta-final` enters and never covers cookie controls. Keep its 48 px minimum height and safe-area padding.

- [ ] **Step 5: Run responsive and no-JS E2E**

Run: `npx.cmd --no-install playwright test test/e2e/landing-responsive.spec.ts test/e2e/landing-no-js.spec.ts --project=desktop-chromium --project=mobile-chromium`

Expected: PASS with no overflow and no touch targets below 44 px.

- [ ] **Step 6: Commit navigation and conversion polish**

```powershell
git add -- components/landing/landing-nav.tsx components/landing/mobile-sticky-cta.tsx app/page.tsx app/globals.css test/e2e/landing-responsive.spec.ts test/e2e/landing-no-js.spec.ts
git commit -m "feat(landing): fecha navegacao e conversao imersiva"
```

### Task 6: Visual, accessibility, and release verification

**Files:**
- Create: `test/e2e/landing-contrast.spec.ts`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `components/landing/hero.tsx`
- Modify: `components/landing/cinematic-scroll-corridor.tsx`
- Modify: `components/landing/container-scroll-animation.tsx`
- Modify: `components/landing/feature-tabs.tsx`
- Modify: `components/landing/ai-composer.tsx`
- Modify: `components/landing/pricing.tsx`
- Modify: `components/landing/FaqAccordion.tsx`
- Modify: `components/landing/about.tsx`
- Test: `test/e2e/landing-cinematic.spec.ts`
- Test: `test/e2e/landing-responsive.spec.ts`
- Test: `test/e2e/landing-no-js.spec.ts`

**Interfaces:**
- Consumes: completed cinematic landing.
- Produces: current evidence for automated checks, rendered contrast, three viewport layouts, preference fallbacks, and a clean worktree.

- [ ] **Step 1: Run the automated quality gate**

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Expected: all commands exit 0. Existing warnings must be reported rather than hidden.

- [ ] **Step 2: Run public landing E2E at supported viewports**

Run: `npx.cmd --no-install playwright test test/e2e/landing-responsive.spec.ts test/e2e/landing-no-js.spec.ts --project=desktop-chromium --project=mobile-chromium`

Expected: all selected tests pass.

- [ ] **Step 3: Inspect 390, 768, and 1440 px in the browser**

At each viewport, verify the hero, plate clipping, early preview, chapter order, profession tabs, Tim composer, pricing, FAQ, about comparison, final CTA, footer, mobile menu, and cookie controls. Record screenshots for any layout defect before fixing it.

- [ ] **Step 4: Measure rendered contrast and nested glass**

Add a Playwright contrast test that compares computed foreground color with a screenshot pixel immediately beside each marked text sample. The helper must use the WCAG relative-luminance formula:

```ts
import sharp from "sharp";

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance([red, green, blue]: number[]) {
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrast(foreground: number[], background: number[]) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}
```

Mark the hero lead, chapter descriptions, pricing labels, FAQ answers, and final CTA support text with `data-contrast-sample`. For each element, sample a one-pixel screenshot point 8 px outside its text box but inside the same stage, then require 4.5:1 for normal text and 3:1 for large text. Also assert:

```js
document.querySelectorAll("[data-landing-stage] [data-landing-stage]").length === 0
```

- [ ] **Step 5: Emulate accessibility preferences**

Verify reduced motion removes scroll transforms, reduced transparency returns opaque `#15131b` stages, and increased contrast strengthens borders without hiding content.

- [ ] **Step 6: Run final diff and status checks**

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; only intentional landing files remain modified before the final commit.

- [ ] **Step 7: Commit verification fixes**

```powershell
git add -- app/page.tsx app/globals.css components/landing test/e2e/landing-cinematic.spec.ts test/e2e/landing-responsive.spec.ts test/e2e/landing-no-js.spec.ts test/e2e/landing-contrast.spec.ts
git commit -m "fix(landing): valida experiencia cinematografica"
```
