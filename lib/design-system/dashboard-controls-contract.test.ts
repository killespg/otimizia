import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

describe("dashboard control geometry", () => {
  it("keeps the desktop sidebar compact", () => {
    const shell = read("components/design-system/product-shell-navigation.tsx");
    const groups = read("components/design-system/product-nav-groups.tsx");
    const css = read("app/globals.css");

    expect(shell).toContain('collapsed ? "w-16" : "w-56"');
    expect(shell).not.toContain('collapsed ? "w-[68px]" : "w-[248px]"');
    expect(groups).toContain("product-nav-row group mx-1");
    expect(groups).toMatch(/min-h-11[^\"]*self-stretch/);
    expect(groups).toContain("relative grid size-11 shrink-0");
    expect(groups).toContain("min-h-11 -translate-x-px");
    expect(css).toContain(".product-nav-row::before");
    expect(css).toContain("inset: 4px;");
  });

  it("opens the account actions from the top-right avatar", () => {
    const topbar = read("components/design-system/product-shell-topbar.tsx");
    const shell = read("components/design-system/product-shell.tsx");

    expect(topbar).toContain('from "framer-motion"');
    expect(topbar).toContain("AnimatePresence");
    expect(topbar).toContain("useReducedMotion");
    expect(topbar).toContain("<motion.div");
    expect(topbar).toContain("aria-expanded={accountMenuOpen}");
    expect(topbar).toContain('event.key === "Escape"');
    expect(topbar).toContain('"pointerdown"');
    expect(topbar).toContain('action={logout}');
    expect(topbar).toContain('href="/painel/configuracoes"');
    expect(topbar).toContain("grid size-11 place-items-center");
    expect(topbar).toContain("grid size-9 place-items-center");
    expect(shell).toContain("displayName={displayName}");
  });

  it("uses the control radius and accessible targets in dashboard controls", () => {
    const css = read("app/globals.css");
    const preferences = read("components/dashboard/DashboardPreferencesForm.tsx");
    const customize = read("components/dashboard/DashboardCustomizePanel.tsx");

    expect(css).toContain(
      ".dashboard-widget-order-actions button { min-height: 44px; min-width: 44px; border-radius: var(--radius-control);",
    );
    expect(preferences).not.toMatch(/min-h-10 rounded-md/);
    expect(preferences).toContain("min-h-11 rounded-control");
    expect(customize).toContain("rounded-control");
    expect(customize).not.toContain('"dashboard-customize-trigger"');
  });

  it("animates preference state in the client boundary and respects reduced motion", () => {
    const preferences = read("components/dashboard/DashboardPreferencesForm.tsx");

    expect(preferences).toContain('from "framer-motion"');
    expect(preferences).toContain("useReducedMotion");
    expect(preferences).toContain("<motion.div");
    expect(preferences).toContain('role="tabpanel"');
  });
});
