# Apple Contained Liquid Glass Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected black-purple cards and multicolor canvas with the approved Apple-contained material direction while preserving the existing functional shell.

**Architecture:** Keep the semantic split already implemented in `app/globals.css`: content stays stable and glass stays functional. Correct the shared content tokens and panel geometry first, then replace the full-screen ambient SVG with two low-chroma light sources; no React structure, route, data, permission, or action changes are required.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, CSS custom properties, SVG, Playwright, Vitest.

## Global Constraints

- Canvas is `#17171b` and must read as neutral graphite, not a multicolor gradient.
- Primary content is `rgba(39,39,46,.94)` and secondary content is `rgba(32,32,38,.96)`.
- Content borders are neutral `rgba(255,255,255,.09)` at rest; violet `#8757f0` is reserved for primary action, selection, and focus.
- Content panels use 12–16 px radii, no broad shadow, and no `backdrop-filter`.
- Glass remains restricted to shell, search, action groups, and overlays.
- Orange, pink, and cyan are removed from the authenticated product canvas.
- Preserve all current routes, data, actions, permissions, navigation behavior, accessibility fallbacks, and the running development server.

---

### Task 1: Neutral graphite content material

**Files:**
- Modify: `test/e2e/liquid-glass.spec.ts:61-106`
- Modify: `app/globals.css:68-75, 122-150, 332-349, 395-412`

**Interfaces:**
- Consumes: existing `.panel`, `.card`, `.card-quiet`, `.panel-soft`, and real-estate workspace selectors.
- Produces: `--od-content-surface`, `--od-content-surface-muted`, `--od-content-border`, and panel geometry shared by every product vertical.

- [ ] **Step 1: Replace the rejected violet-card assertion with the approved rendered-material contract**

Add `borderColor` and `borderRadius` to the computed-style payload and replace the channel-bias assertions with literal values derived from the approved mockup:

```ts
const style = getComputedStyle(element);
return [
  element.dataset.material,
  {
    backdropFilter: style.backdropFilter,
    backgroundColor: style.backgroundColor,
    backgroundImage: style.backgroundImage,
    borderColor: style.borderColor,
    borderRadius: style.borderRadius,
    boxShadow: style.boxShadow,
  },
];

expect(materials.content.backgroundColor).toBe("rgba(39, 39, 46, 0.94)");
expect(materials.content.borderColor).toBe("rgba(255, 255, 255, 0.09)");
expect(materials.content.borderRadius).toBe("16px");
expect(materials.content.boxShadow).toBe("none");
```

- [ ] **Step 2: Run the focused Playwright test and verify RED**

Run:

```powershell
$env:E2E_BASE_URL='http://127.0.0.1:3000'
npx --no-install playwright test test/e2e/liquid-glass.spec.ts --grep "mantém o vidro funcional" --project=desktop-chromium
```

Expected: FAIL because the current card computes to `rgba(20, 16, 30, 0.92)`, has a violet border, and uses a 20 px radius.

- [ ] **Step 3: Apply the approved tokens and panel radius**

Use these exact custom properties in `:root`:

```css
--od-bg: #17171b;
--od-surface-solid: #27272e;
--od-muted-surface-solid: #202026;
--od-content-surface: rgba(39, 39, 46, 0.94);
--od-content-surface-muted: rgba(32, 32, 38, 0.96);
--od-content-border: rgba(255, 255, 255, 0.09);
--od-content-border-hover: rgba(255, 255, 255, 0.15);
--od-content-shadow: none;
--od-glass-fill: rgba(255, 255, 255, 0.075);
--od-glass-border: rgba(255, 255, 255, 0.26);
--od-glass-chrome-bg: rgba(28, 28, 34, 0.38);
--od-glass-chrome-blur: blur(20px) saturate(145%);
--od-glass-panel-blur: blur(16px) saturate(140%);
```

Set both the shared content rule and the real-estate override to the existing 16 px token:

```css
.workspace-real_estate_broker .real-estate-area .panel {
  border-color: var(--od-border);
  border-radius: var(--radius-md);
}

.panel,
.card,
.card-quiet,
.panel-soft {
  border-radius: var(--radius-md);
}
```

- [ ] **Step 4: Run the focused Playwright test and verify GREEN**

Run the command from Step 2 again.

Expected: `1 passed` with content remaining non-glass and chrome/control remaining glass.

- [ ] **Step 5: Review the material checkpoint without committing shared dirty files**

```powershell
git diff --check -- app/globals.css test/e2e/liquid-glass.spec.ts
git diff -- app/globals.css test/e2e/liquid-glass.spec.ts
```

Expected: only the intended material and regression-test hunks are added by
this task. Do not commit these shared files because they already contain
unrelated work in the dirty tree.

### Task 2: Restrained ambient canvas

**Files:**
- Modify: `test/e2e/liquid-glass.spec.ts`
- Modify: `public/backgrounds/liquid-ambient.svg`
- Modify: `app/globals.css:246-256`

**Interfaces:**
- Consumes: `/backgrounds/liquid-ambient.svg` through `.product-workspace`.
- Produces: a fixed authenticated-product canvas with one subtle violet light and one weaker blue-gray light.

- [ ] **Step 1: Add a rendered SVG chroma regression test**

Add a Playwright test that loads the real asset into a canvas and measures its pixels:

```ts
test("mantém o canvas ambiente escuro e de baixa cromia", async ({ page }) => {
  await page.goto("/login");
  const chroma = await page.evaluate(async () => {
    const response = await fetch("/backgrounds/liquid-ambient.svg");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.src = url;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 120;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let maximum = 0;
    let total = 0;
    let count = 0;
    for (let index = 0; index < pixels.length; index += 16) {
      const channels = [pixels[index], pixels[index + 1], pixels[index + 2]];
      const spread = Math.max(...channels) - Math.min(...channels);
      maximum = Math.max(maximum, spread);
      total += spread;
      count += 1;
    }
    return { maximum, average: total / count };
  });

  expect(chroma.maximum).toBeLessThanOrEqual(24);
  expect(chroma.average).toBeLessThanOrEqual(8);
});
```

- [ ] **Step 2: Run the ambient test and verify RED**

Run:

```powershell
$env:E2E_BASE_URL='http://127.0.0.1:3000'
npx --no-install playwright test test/e2e/liquid-glass.spec.ts --grep "baixa cromia" --project=desktop-chromium
```

Expected: FAIL because the current five-color SVG produces strongly separated RGB channels.

- [ ] **Step 3: Replace the full-screen rainbow with two restrained light sources**

Replace the SVG body with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1200" width="1920" height="1200">
  <defs>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="210" />
    </filter>
  </defs>
  <rect width="1920" height="1200" fill="#17171b" />
  <g filter="url(#soft)">
    <ellipse cx="250" cy="270" rx="520" ry="470" fill="#8757f0" opacity="0.10" />
    <ellipse cx="890" cy="120" rx="500" ry="340" fill="#63758e" opacity="0.055" />
  </g>
</svg>
```

Update the neutral overlay in `.product-workspace`:

```css
background-image: linear-gradient(rgba(23, 23, 27, 0.12), rgba(23, 23, 27, 0.12)), url("/backgrounds/liquid-ambient.svg");
```

- [ ] **Step 4: Run the ambient test and verify GREEN**

Run the command from Step 2 again.

Expected: `1 passed`, maximum chroma at most 24 and average chroma at most 8.

- [ ] **Step 5: Review the canvas checkpoint without committing shared dirty files**

```powershell
git diff --check -- app/globals.css public/backgrounds/liquid-ambient.svg test/e2e/liquid-glass.spec.ts
git diff -- app/globals.css public/backgrounds/liquid-ambient.svg test/e2e/liquid-glass.spec.ts
```

Expected: only the intended canvas, token, and regression-test hunks are added
by this task. Leave the shared implementation files uncommitted.

### Task 3: Document and verify the complete correction

**Files:**
- Modify: `DESIGN.md:14-75`
- Verify: `app/globals.css`
- Verify: `test/e2e/liquid-glass.spec.ts`

**Interfaces:**
- Consumes: final material and canvas decisions from Tasks 1 and 2.
- Produces: canonical design guidance and release evidence for the corrective pass.

- [ ] **Step 1: Align the canonical design document with direction A**

Record the exact neutral content and canvas roles:

```md
- Canvas: `#17171b`, with only low-chroma ambient light near the functional shell.
- Content: neutral graphite `rgba(39,39,46,.94)`; muted content `rgba(32,32,38,.96)`.
- Content borders: neutral white at 9%; no violet border or broad shadow at rest.
- Content radii: 12–16 px; pills are reserved for controls.
```

- [ ] **Step 2: Run the complete Liquid Glass browser contract**

```powershell
$env:E2E_BASE_URL='http://127.0.0.1:3000'
npx --no-install playwright test test/e2e/liquid-glass.spec.ts
```

Expected: all unauthenticated desktop and mobile material tests pass. Authenticated cases may remain skipped only if the configured account redirects to onboarding; report that boundary explicitly.

- [ ] **Step 3: Run static and unit verification**

```powershell
npm run typecheck
npm run lint
npm test
git diff --check
```

Expected: every command exits 0; Vitest reports zero failed tests.

- [ ] **Step 4: Confirm the dev server stayed available**

```powershell
(Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/login' -TimeoutSec 10).StatusCode
```

Expected: `200` without stopping PID 18036 or starting a second Next.js process.

- [ ] **Step 5: Review documentation without absorbing the existing dirty DESIGN.md**

```powershell
git diff --check -- DESIGN.md
git diff -- DESIGN.md
```

Expected: direction A is recorded and no unrelated documentation changes are
removed. Leave `DESIGN.md` uncommitted with the implementation handoff.
