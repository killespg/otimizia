import { describe, expect, it } from "vitest";
import {
  getWorkspaceKey,
  getWorkspaceOptions,
  isWorkspaceEnabled,
  normalizeWorkspaceKeys,
} from "./workspaces";

describe("getWorkspaceKey", () => {
  it("always returns 'founder' for admins, ignoring profile/metadata", () => {
    expect(getWorkspaceKey("law_office", "consultant", true)).toBe("founder");
  });

  it("falls back to profile value, then metadata, for non-admins", () => {
    expect(getWorkspaceKey("law_office", "consultant", false)).toBe("law_office");
    expect(getWorkspaceKey(undefined, "consultant", false)).toBe("consultant");
  });

  it("never resolves 'founder' from user-provided input", () => {
    expect(getWorkspaceKey("founder", undefined, false)).toBe("autonomous_seller");
  });

  it("defaults to autonomous_seller for unrecognized input", () => {
    expect(getWorkspaceKey("not-a-real-profession", undefined, false)).toBe("autonomous_seller");
  });
});

describe("normalizeWorkspaceKeys", () => {
  it("de-duplicates and normalizes a list of professions", () => {
    expect(normalizeWorkspaceKeys(["law_office", "law_office", "consultant"])).toEqual([
      "law_office",
      "consultant",
    ]);
  });

  it("falls back to the fallback profession when the list is empty", () => {
    expect(normalizeWorkspaceKeys([], "consultant")).toEqual(["consultant"]);
    expect(normalizeWorkspaceKeys(undefined)).toEqual(["autonomous_seller"]);
  });
});

describe("isWorkspaceEnabled", () => {
  it("treats the active workspace as always enabled even if absent from the list", () => {
    expect(isWorkspaceEnabled("consultant", [])).toBe(true);
  });

  it("checks membership otherwise", () => {
    expect(isWorkspaceEnabled("law_office", ["law_office", "consultant"])).toBe(true);
    expect(isWorkspaceEnabled("real_estate_broker", ["law_office", "consultant"])).toBe(false);
  });
});

describe("getWorkspaceOptions", () => {
  it("only returns options enabled for the given values", () => {
    const options = getWorkspaceOptions(["law_office", "consultant"], "law_office");
    expect(options.map((o) => o.value).sort()).toEqual(["consultant", "law_office"]);
  });
});
