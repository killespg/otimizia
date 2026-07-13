import { describe, expect, it } from "vitest";
import { parseSaoPauloDateTime } from "./date-time";

describe("parseSaoPauloDateTime", () => {
  it("persists datetime-local as São Paulo time regardless of server timezone", () => {
    expect(parseSaoPauloDateTime("2026-07-12T10:30")).toBe("2026-07-12T13:30:00.000Z");
  });

  it("keeps explicit ISO offsets intact", () => {
    expect(parseSaoPauloDateTime("2026-07-12T10:30:00Z")).toBe("2026-07-12T10:30:00.000Z");
  });

  it("rejects invalid values", () => {
    expect(parseSaoPauloDateTime("não é uma data")).toBeNull();
  });
});
