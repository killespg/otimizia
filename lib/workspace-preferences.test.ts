import { describe, expect, it } from "vitest";
import {
  cleanWorkspaceLabel,
  getDefaultWorkspaceLabels,
  getWorkspaceLabels,
  parseWorkspacePreferences,
} from "./workspace-preferences";
import type { ProfessionPreset } from "./professions";

const preset = {
  key: "autonomous_seller",
  pipelineLabel: "Funil",
  valueLabel: "Valor",
  dealSingular: "Venda",
} as unknown as ProfessionPreset;

const livestockPreset = { ...preset, key: "livestock_producer" } as unknown as ProfessionPreset;

describe("getDefaultWorkspaceLabels", () => {
  it("uses the standard defaults for a regular profession", () => {
    const labels = getDefaultWorkspaceLabels(preset);
    expect(labels).toEqual({
      contacts: "Contatos",
      pipeline: "Funil",
      value: "Valor",
      followups: "Retornos do dia",
      dealSingular: "Venda",
    });
  });

  it("uses livestock-specific wording for that profession", () => {
    const labels = getDefaultWorkspaceLabels(livestockPreset);
    expect(labels.contacts).toBe("Sujeitos");
    expect(labels.followups).toBe("Sujeitos para revisar");
  });
});

describe("parseWorkspacePreferences", () => {
  it("returns an empty object for non-object input", () => {
    expect(parseWorkspacePreferences(null)).toEqual({});
    expect(parseWorkspacePreferences("x")).toEqual({});
    expect(parseWorkspacePreferences([])).toEqual({});
  });

  it("passes through a valid object", () => {
    const value = { autonomous_seller: { labels: { contacts: "Leads" } } };
    expect(parseWorkspacePreferences(value)).toEqual(value);
  });
});

describe("getWorkspaceLabels", () => {
  it("merges custom labels over the defaults, keyed by workspace", () => {
    const preferences = { autonomous_seller: { labels: { contacts: "Leads" } } };
    const labels = getWorkspaceLabels(preset, preferences, "autonomous_seller");
    expect(labels.contacts).toBe("Leads");
    expect(labels.pipeline).toBe("Funil");
  });

  it("falls back to defaults when no custom labels exist for the workspace", () => {
    const labels = getWorkspaceLabels(preset, {}, "autonomous_seller");
    expect(labels).toEqual(getDefaultWorkspaceLabels(preset));
  });
});

describe("cleanWorkspaceLabel", () => {
  it("trims, collapses whitespace, and caps length", () => {
    expect(cleanWorkspaceLabel("  Meus   Leads  ")).toBe("Meus Leads");
    expect(cleanWorkspaceLabel("a".repeat(60))).toBe("a".repeat(40));
  });

  it("returns undefined for empty/null input", () => {
    expect(cleanWorkspaceLabel(null)).toBeUndefined();
    expect(cleanWorkspaceLabel("   ")).toBeUndefined();
  });
});
