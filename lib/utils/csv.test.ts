import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/utils/csv";

describe("parseCsv", () => {
  it("parses simple comma-separated rows", () => {
    expect(parseCsv("name,phone\nAna,111\nJoão,222")).toEqual([
      ["name", "phone"],
      ["Ana", "111"],
      ["João", "222"],
    ]);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    expect(parseCsv('name,notes\n"Ana","Diz ""oi"", sempre"')).toEqual([
      ["name", "notes"],
      ["Ana", 'Diz "oi", sempre'],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("name,phone\r\nAna,111\r\n")).toEqual([
      ["name", "phone"],
      ["Ana", "111"],
    ]);
  });

  it("ignores fully blank lines", () => {
    expect(parseCsv("name\nAna\n\nJoão\n")).toEqual([["name"], ["Ana"], ["João"]]);
  });
});
