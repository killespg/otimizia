import { describe, expect, it } from "vitest";
import { PROFESSION_OPTIONS, getProfessionPreset, normalizeProfession } from "./professions";

describe("normalizeProfession", () => {
  it("accepts any publicly listed profession value", () => {
    for (const option of PROFESSION_OPTIONS) {
      expect(normalizeProfession(option.value)).toBe(option.value);
    }
  });

  it("never resolves 'founder' from user input", () => {
    expect(normalizeProfession("founder")).toBe("autonomous_seller");
  });

  it("falls back to autonomous_seller for unknown or non-string input", () => {
    expect(normalizeProfession("not-a-profession")).toBe("autonomous_seller");
    expect(normalizeProfession(undefined)).toBe("autonomous_seller");
    expect(normalizeProfession(42)).toBe("autonomous_seller");
  });
});

describe("getProfessionPreset", () => {
  it("returns a preset matching the requested key for every public option", () => {
    for (const option of PROFESSION_OPTIONS) {
      expect(getProfessionPreset(option.value as never).key).toBe(option.value);
    }
  });

  it("resolves the founder preset when explicitly requested", () => {
    expect(getProfessionPreset("founder" as never).key).toBe("founder");
  });

  it("falls back to autonomous_seller for an unrecognized key", () => {
    expect(getProfessionPreset("bogus" as never).key).toBe("autonomous_seller");
  });
});
