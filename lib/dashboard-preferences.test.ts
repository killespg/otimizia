import { describe, expect, it } from "vitest";
import {
  DASHBOARD_WIDGETS,
  cleanDashboardText,
  getDashboardPreferences,
  isDashboardAccent,
  isDashboardStyle,
  isMetricKey,
  mergeScopedPreferences,
  metricLabel,
} from "./dashboard-preferences";
import type { ProfessionPreset } from "./professions";

const preset = {
  metrics: [
    { key: "open_value", label: "Valor aberto (preset)" },
    { key: "contacts", label: "Contatos (preset)" },
  ],
} as unknown as ProfessionPreset;

describe("getDashboardPreferences", () => {
  it("falls back to defaults when no stored value exists", () => {
    const prefs = getDashboardPreferences(undefined, preset);
    expect(prefs.style).toBe("glow");
    expect(prefs.accent).toBe("purple");
    expect(prefs.metrics).toEqual(["open_value", "contacts"]);
    expect(prefs.widgets).toEqual([...DASHBOARD_WIDGETS]);
  });

  it("keeps only known metric/widget keys from stored value", () => {
    const prefs = getDashboardPreferences(
      { style: "compact", accent: "cyan", metrics: ["open_value", "bogus"], widgets: ["chart", "nope"] },
      preset
    );
    expect(prefs.style).toBe("compact");
    expect(prefs.accent).toBe("cyan");
    expect(prefs.metrics).toEqual(["open_value"]);
    expect(prefs.widgets).toEqual(["chart"]);
  });

  it("caps metrics at 8 and de-duplicates", () => {
    const many = ["open_value", "open_value", "contacts", "won_value_month", "won_count_month", "overdue_tasks", "conversations_today", "conversion_rate", "avg_ticket"];
    const prefs = getDashboardPreferences({ metrics: many }, preset);
    expect(prefs.metrics.length).toBeLessThanOrEqual(8);
    expect(new Set(prefs.metrics).size).toBe(prefs.metrics.length);
  });

  it("ignores garbage input and falls back to defaults", () => {
    const prefs = getDashboardPreferences("not an object", preset);
    expect(prefs.style).toBe("glow");
    expect(prefs.metrics).toEqual(["open_value", "contacts"]);
  });

  it("reads preferences scoped to the given workspace key", () => {
    const stored = {
      law_office: { style: "compact", accent: "cyan" },
      autonomous_seller: { style: "executive", accent: "pink" },
    };
    expect(getDashboardPreferences(stored, preset, "law_office").style).toBe("compact");
    expect(getDashboardPreferences(stored, preset, "autonomous_seller").style).toBe("executive");
    // Área ainda não personalizada cai nos defaults, não na config de outra área.
    expect(getDashboardPreferences(stored, preset, "consultant").style).toBe("glow");
  });

  it("uses legacy flat preferences as a fallback for every workspace", () => {
    const legacy = { style: "compact", accent: "cyan" };
    expect(getDashboardPreferences(legacy, preset, "law_office").style).toBe("compact");
    expect(getDashboardPreferences(legacy, preset, "autonomous_seller").style).toBe("compact");
  });
});

describe("mergeScopedPreferences", () => {
  it("writes one workspace without touching the others", () => {
    const existing = { law_office: { style: "compact" } };
    const merged = mergeScopedPreferences(existing, "autonomous_seller", {
      style: "clean",
      accent: "purple",
      metrics: ["open_value"],
      metricLabels: {},
      widgets: ["metrics"],
    });
    expect(merged.law_office).toEqual({ style: "compact" });
    expect(getDashboardPreferences(merged, preset, "autonomous_seller").style).toBe("clean");
    expect(getDashboardPreferences(merged, preset, "law_office").style).toBe("compact");
  });
});

describe("metricLabel", () => {
  it("prefers a custom label when set", () => {
    const prefs = getDashboardPreferences({ metricLabels: { open_value: "Pipeline" } }, preset);
    expect(metricLabel("open_value", preset, prefs)).toBe("Pipeline");
  });

  it("falls back to the preset label, then the generic fallback", () => {
    const prefs = getDashboardPreferences(undefined, preset);
    expect(metricLabel("open_value", preset, prefs)).toBe("Valor aberto (preset)");
    expect(metricLabel("avg_ticket", preset, prefs)).toBe("Ticket médio");
  });
});

describe("cleanDashboardText", () => {
  it("collapses whitespace, trims, and truncates", () => {
    expect(cleanDashboardText("  a   b  ", 5)).toBe("a b");
    expect(cleanDashboardText("abcdefgh", 3)).toBe("abc");
  });

  it("returns empty string for non-string input", () => {
    expect(cleanDashboardText(42 as unknown)).toBe("");
  });
});

describe("type guards", () => {
  it("isMetricKey / isDashboardStyle / isDashboardAccent", () => {
    expect(isMetricKey("open_value")).toBe(true);
    expect(isMetricKey("bogus")).toBe(false);
    expect(isDashboardStyle("glow")).toBe(true);
    expect(isDashboardStyle("bogus")).toBe(false);
    expect(isDashboardAccent("purple")).toBe(true);
    expect(isDashboardAccent("bogus")).toBe(false);
  });
});
