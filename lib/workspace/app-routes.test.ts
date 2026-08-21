import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  APP_SECTIONS,
  canonicalizeDashboardPath,
  internalDashboardPath,
  isDashboardHref,
  isDashboardPath,
} from "./app-routes";

describe("dashboard public paths", () => {
  it("keeps /painel only as the overview", () => {
    expect(isDashboardPath("/painel")).toBe(true);
    expect(isDashboardPath("/juridico/processos")).toBe(true);
    expect(isDashboardPath("/contatos")).toBe(true);
    expect(isDashboardPath("/login")).toBe(false);
    expect(isDashboardPath("/")).toBe(false);
    expect(isDashboardHref("/imoveis/mapa?x=1")).toBe(true);
  });

  it("rewrites and redirects every app section in next.config", () => {
    const config = readFileSync(resolve(process.cwd(), "next.config.mjs"), "utf8");
    expect(config).toContain("`/painel/${section}`");
    expect(config).toContain("`/${section}`");
    expect(config).toContain("`/${section}/:path*`");
    expect(config).toContain("async rewrites()");
    for (const section of APP_SECTIONS) {
      expect(config).toContain(`"${section}"`);
    }
  });

  it("strips the overview prefix from section URLs", () => {
    expect(canonicalizeDashboardPath("/painel")).toBe("/painel");
    expect(canonicalizeDashboardPath("/painel/juridico/processos?x=1")).toBe(
      "/juridico/processos?x=1",
    );
    expect(internalDashboardPath("/contatos")).toBe("/painel/contatos");
    expect(internalDashboardPath("/painel")).toBe("/painel");
  });
});
