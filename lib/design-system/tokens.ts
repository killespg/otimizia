export const designTokens = {
  color: {
    canvas: "#0B0D11",
    surfaceBase: "#11151A",
    surfacePrimary: "#15191F",
    surfaceSecondary: "#1B2027",
    surfaceHover: "#20262E",
    borderSubtle: "#252C35",
    borderDefault: "#2D3540",
    borderStrong: "#3B4653",
    textPrimary: "#F5F7FA",
    textSecondary: "#98A2AF",
    textTertiary: "#7D8998",
    textDisabled: "#64748B",
    actionPrimary: "#2F6FCC",
    actionPrimaryHover: "#285AA5",
    accent: "#4E7FBF",
    accentSoft: "#91B6E7",
    focusRing: "#7DA7E0",
    accentTint: "#18283E",
  },
  radius: {
    control: 9,
    inner: 11,
    panel: 15,
    round: 999,
  },
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    6: 24,
    8: 32,
    12: 48,
  },
  target: {
    minimum: 44,
  },
  intent: {
    action: "actionPrimary",
    selection: "accentTint",
    focus: "focusRing",
    data: "accent",
  },
} as const;

export type DesignTokens = typeof designTokens;
export type DesignColorToken = keyof DesignTokens["color"];
export type DesignIntent = keyof DesignTokens["intent"];
