import { describe, expect, it } from "vitest";
import {
  ALL_CATEGORIES,
  CONSENT_POLICY_VERSION,
  ESSENTIAL_ONLY,
  actionFor,
  parseConsent,
  serializeConsent,
  type ConsentState,
} from "./consent";

const VISITOR = "0123456789abcdef0123456789abcdef";

function state(overrides: Partial<ConsentState> = {}): ConsentState {
  return {
    version: CONSENT_POLICY_VERSION,
    visitorId: VISITOR,
    analytics: true,
    marketing: true,
    action: "accepted_all",
    ...overrides,
  };
}

describe("serializeConsent / parseConsent", () => {
  it("round-trips a full acceptance", () => {
    expect(parseConsent(serializeConsent(state()))).toEqual(state());
  });

  it("round-trips a partial choice", () => {
    const partial = state({ analytics: true, marketing: false, action: "custom" });
    expect(parseConsent(serializeConsent(partial))).toEqual(partial);
  });

  it("treats a cookie from an older policy version as absent", () => {
    const raw = serializeConsent(state()).replace(/^\d+/, "0");
    expect(parseConsent(raw)).toBeNull();
  });

  it("rejects malformed cookies instead of guessing", () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent("")).toBeNull();
    expect(parseConsent(`${CONSENT_POLICY_VERSION}|${VISITOR}|1|1`)).toBeNull();
    expect(parseConsent(`${CONSENT_POLICY_VERSION}|nao-hex|1|1|accepted_all`)).toBeNull();
    expect(parseConsent(`${CONSENT_POLICY_VERSION}|${VISITOR}|2|1|accepted_all`)).toBeNull();
    expect(parseConsent(`${CONSENT_POLICY_VERSION}|${VISITOR}|1|1|inventado`)).toBeNull();
  });
});

describe("actionFor", () => {
  it("classifies acceptance and refusal", () => {
    expect(actionFor(ALL_CATEGORIES, null)).toBe("accepted_all");
    expect(actionFor(ESSENTIAL_ONLY, null)).toBe("rejected_all");
    expect(actionFor({ analytics: true, marketing: false }, null)).toBe("custom");
  });

  it("distinguishes a refusal from a revocation", () => {
    const hadConsent = state();
    expect(actionFor(ESSENTIAL_ONLY, hadConsent)).toBe("withdrawn");

    const neverConsented = state({ analytics: false, marketing: false, action: "rejected_all" });
    expect(actionFor(ESSENTIAL_ONLY, neverConsented)).toBe("rejected_all");
  });
});
