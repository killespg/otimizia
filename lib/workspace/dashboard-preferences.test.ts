import { describe, expect, it } from "vitest";
import {
  DASHBOARD_WIDGETS,
  cleanDashboardText,
  getDashboardPreferences,
  isMetricKey,
  mergeScopedPreferences,
  metricLabel,
} from "./dashboard-preferences";
import { getProfessionPreset, type ProfessionPreset } from "../people/professions";

const preset = {
  metrics: [
    { key: "open_value", label: "Valor aberto (preset)" },
    { key: "contacts", label: "Contatos (preset)" },
  ],
} as unknown as ProfessionPreset;

describe("getDashboardPreferences", () => {
  it("falls back to defaults when no stored value exists", () => {
    const prefs = getDashboardPreferences(undefined, preset);
    expect(prefs.metrics).toEqual(["open_value", "contacts"]);
    expect(prefs.widgets).toEqual([...DASHBOARD_WIDGETS]);
    expect(prefs.showAnimatedBackground).toBe(false);
  });

  it("keeps only known metric/widget keys from stored value", () => {
    const prefs = getDashboardPreferences(
      { metrics: ["open_value", "bogus"], widgets: ["chart", "nope"] },
      preset
    );
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
    expect(prefs.metrics).toEqual(["open_value", "contacts"]);
  });

  it("reads preferences scoped to the given workspace key", () => {
    const stored = {
      law_office: { metricLabels: { open_value: "Causas abertas" } },
      autonomous_seller: { metricLabels: { open_value: "Pipeline" } },
    };
    expect(getDashboardPreferences(stored, preset, "law_office").metricLabels)
      .toEqual({ open_value: "Causas abertas" });
    expect(getDashboardPreferences(stored, preset, "autonomous_seller").metricLabels)
      .toEqual({ open_value: "Pipeline" });
    // Área ainda não personalizada cai nos defaults, não na config de outra área.
    expect(getDashboardPreferences(stored, preset, "consultant").metricLabels).toEqual({});
  });

  it("uses legacy flat preferences as a fallback for every workspace", () => {
    const legacy = { metricLabels: { open_value: "Herdado" } };
    expect(getDashboardPreferences(legacy, preset, "law_office").metricLabels)
      .toEqual({ open_value: "Herdado" });
    expect(getDashboardPreferences(legacy, preset, "autonomous_seller").metricLabels)
      .toEqual({ open_value: "Herdado" });
  });

  it("preserves an explicitly disabled animated background", () => {
    const prefs = getDashboardPreferences({ showAnimatedBackground: false }, preset);
    expect(prefs.showAnimatedBackground).toBe(false);
  });

  it("preserves an explicitly enabled animated background", () => {
    const prefs = getDashboardPreferences({ showAnimatedBackground: true }, preset);
    expect(prefs.showAnimatedBackground).toBe(true);
  });

  it("upgrades the legacy dashboard order to action-first defaults", () => {
    const prefs = getDashboardPreferences(
      {
        widgets: [
          "metrics",
          "calendar",
          "chart",
          "deals",
          "tasks",
          "assistant",
          "open_claims",
          "onboarding",
        ],
      },
      preset,
    );
    expect(prefs.widgets.slice(0, 4)).toEqual([
      "onboarding",
      "tasks",
      "open_claims",
      "calendar",
    ]);
  });

  it("upgrades the old seller statistics to useful commercial defaults", () => {
    const sellerPreset = getProfessionPreset("autonomous_seller");
    const prefs = getDashboardPreferences(
      {
        autonomous_seller: {
          metrics: ["open_value", "open_deals", "won_value_month", "overdue_tasks"],
        },
      },
      sellerPreset,
      "autonomous_seller",
    );

    expect(prefs.metrics).toEqual([
      "open_value",
      "won_value_month",
      "conversion_rate",
      "commission_open",
    ]);
  });
});

describe("mergeScopedPreferences", () => {
  it("writes one workspace without touching the others", () => {
    const existing = { law_office: { widgets: ["chart"] } };
    const merged = mergeScopedPreferences(existing, "autonomous_seller", {
      metrics: ["open_value"],
      metricLabels: {},
      widgets: ["metrics"],
      showAnimatedBackground: true,
    });
    expect(merged.law_office).toEqual({ widgets: ["chart"] });
    expect(getDashboardPreferences(merged, preset, "autonomous_seller").widgets).toEqual(["metrics"]);
    expect(getDashboardPreferences(merged, preset, "law_office").widgets).toEqual(["chart"]);
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
  it("isMetricKey", () => {
    expect(isMetricKey("open_value")).toBe(true);
    expect(isMetricKey("bogus")).toBe(false);
  });
});
