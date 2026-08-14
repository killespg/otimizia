import { describe, expect, it } from "vitest";
import { designTokens } from "./tokens";

describe("design tokens", () => {
  it("exports the approved platform-neutral contract", () => {
    expect(designTokens.color.canvas).toBe("#0B0D11");
    expect(designTokens.color.actionPrimary).toBe("#2F6FCC");
    expect(designTokens.radius).toEqual({
      control: 9,
      inner: 11,
      panel: 15,
      round: 999,
    });
    expect(designTokens.target.minimum).toBe(44);
  });

  it("keeps web-independent intent names", () => {
    expect(designTokens.intent).toEqual({
      action: "actionPrimary",
      selection: "accentTint",
      focus: "focusRing",
      data: "accent",
    });
  });
});
