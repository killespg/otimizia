import { describe, expect, it } from "vitest";
import { addBusinessDays, easterSunday, goodFriday, isBusinessDay, isForensicRecess, isNationalHoliday } from "./law-deadline-calc";

describe("easterSunday", () => {
  it("matches known Easter Sundays", () => {
    expect(easterSunday(2024)).toEqual(new Date(2024, 2, 31));
    expect(easterSunday(2025)).toEqual(new Date(2025, 3, 20));
    expect(easterSunday(2026)).toEqual(new Date(2026, 3, 5));
  });
});

describe("goodFriday", () => {
  it("is two days before Easter Sunday", () => {
    expect(goodFriday(2024)).toEqual(new Date(2024, 2, 29));
    expect(goodFriday(2025)).toEqual(new Date(2025, 3, 18));
  });
});

describe("isNationalHoliday", () => {
  it("recognizes fixed national holidays", () => {
    expect(isNationalHoliday(new Date(2026, 0, 1))).toBe(true);
    expect(isNationalHoliday(new Date(2026, 8, 7))).toBe(true);
    expect(isNationalHoliday(new Date(2026, 11, 25))).toBe(true);
  });

  it("recognizes Good Friday", () => {
    expect(isNationalHoliday(goodFriday(2025))).toBe(true);
  });

  it("only counts Consciência Negra from 2024 onward", () => {
    expect(isNationalHoliday(new Date(2023, 10, 20))).toBe(false);
    expect(isNationalHoliday(new Date(2024, 10, 20))).toBe(true);
  });

  it("rejects a plain business day", () => {
    expect(isNationalHoliday(new Date(2026, 6, 13))).toBe(false);
  });
});

describe("isForensicRecess", () => {
  it("covers 20/dez through 31/dez", () => {
    expect(isForensicRecess(new Date(2026, 11, 20))).toBe(true);
    expect(isForensicRecess(new Date(2026, 11, 19))).toBe(false);
  });

  it("covers 1/jan through 20/jan", () => {
    expect(isForensicRecess(new Date(2026, 0, 20))).toBe(true);
    expect(isForensicRecess(new Date(2026, 0, 21))).toBe(false);
  });
});

describe("isBusinessDay", () => {
  it("rejects weekends", () => {
    expect(isBusinessDay(new Date(2026, 6, 11))).toBe(false); // sábado
    expect(isBusinessDay(new Date(2026, 6, 12))).toBe(false); // domingo
  });

  it("respects countRecess flag", () => {
    const recessDay = new Date(2026, 0, 5); // segunda-feira dentro do recesso
    expect(isBusinessDay(recessDay)).toBe(false);
    expect(isBusinessDay(recessDay, { countRecess: false })).toBe(true);
  });
});

describe("addBusinessDays", () => {
  it("skips a weekend", () => {
    const friday = new Date(2026, 6, 10); // sexta-feira
    const result = addBusinessDays(friday, 1);
    expect(result.dueDate).toEqual(new Date(2026, 6, 13)); // segunda
    expect(result.skippedWeekends).toBe(2);
  });

  it("skips the forensic recess when counting it", () => {
    const start = new Date(2026, 11, 18); // sexta-feira, 18/dez/2026
    const result = addBusinessDays(start, 2, { countRecess: true });
    // 2 dias úteis depois de 18/dez/2026, pulando o recesso de 20/dez a
    // 20/jan, caem em 22/jan/2027 (quinta e sexta-feira).
    expect(result.dueDate).toEqual(new Date(2027, 0, 22));
    expect(result.skippedRecessDays).toBe(21);
  });

  it("ignores the recess when countRecess is false", () => {
    const start = new Date(2026, 11, 18);
    const result = addBusinessDays(start, 2, { countRecess: false });
    expect(result.skippedRecessDays).toBe(0);
  });
});
