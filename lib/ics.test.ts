import { describe, expect, it } from "vitest";
import { buildIcsFeed } from "@/lib/ics";

describe("buildIcsFeed", () => {
  it("wraps events in a VCALENDAR with the given name", () => {
    const ics = buildIcsFeed("Meus lembretes", [
      { uid: "task-1", title: "Ligar para a Ana", start: new Date("2026-01-10T12:00:00.000Z") },
    ]);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("X-WR-CALNAME:Meus lembretes");
    expect(ics).toContain("UID:task-1");
    expect(ics).toContain("SUMMARY:Ligar para a Ana");
    expect(ics).toContain("DTSTART:20260110T120000Z");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("strips line breaks from titles to keep one event per line", () => {
    const ics = buildIcsFeed("Feed", [
      { uid: "1", title: "Linha 1\nLinha 2", start: new Date() },
    ]);
    expect(ics).toContain("SUMMARY:Linha 1 Linha 2");
  });
});
