import { describe, expect, it } from "vitest";
import {
  agendaItemHref,
  buildAgendaEntries,
  occupancyByDay,
  selectedCivilDay,
  summarizeAgenda,
  timelineGroups,
  filterAgendaProcessSignals,
  toDatetimeLocalValue,
  type AgendaEntry,
  type AgendaSourceCase,
  type AgendaSourceDeadline,
} from "./legal-agenda";

const memberName = new Map([["user-1", "Mariana Costa"]]);

const hearing: AgendaSourceDeadline = {
  id: "dl-1",
  title: "Audiência de conciliação",
  due_at: "2026-08-18T12:00:00.000Z",
  deadline_type: "hearing",
  case_id: "case-1",
  assigned_to: "user-1",
  status: "pending",
};

const replica: AgendaSourceDeadline = {
  id: "dl-2",
  title: "Apresentar réplica",
  due_at: "2026-08-13T18:00:00.000Z",
  deadline_type: "procedural",
  case_id: "case-2",
  assigned_to: "user-1",
  status: "pending",
};

const activeCase: AgendaSourceCase = {
  id: "case-1",
  title: "Silva vs Banco",
  next_deadline_at: "2026-08-18T12:00:00.000Z",
  responsible_id: "user-1",
  area: "Cível",
};

const otherCase: AgendaSourceCase = {
  id: "case-2",
  title: "Execução de título",
  next_deadline_at: "2026-08-13T18:00:00.000Z",
  responsible_id: "user-1",
  area: "Cível",
};

const looseCase: AgendaSourceCase = {
  id: "case-3",
  title: "Inventário Almeida",
  next_deadline_at: "2026-08-25T15:00:00.000Z",
  responsible_id: null,
  area: "Família",
};

function entry(partial: Partial<AgendaEntry> & Pick<AgendaEntry, "id" | "day" | "dueAt" | "title">): AgendaEntry {
  return {
    kind: "deadline",
    caseId: "case-1",
    caseTitle: "Caso",
    typeLabel: "Processual",
    responsibleLabel: "Mariana Costa",
    isHearing: false,
    ...partial,
  };
}

describe("buildAgendaEntries", () => {
  it("prefers the real deadline over the duplicated case commitment on the same day", () => {
    const entries = buildAgendaEntries([hearing, replica], [activeCase, otherCase, looseCase], memberName);
    expect(entries.map((item) => item.id)).toEqual(["dl-2", "dl-1", "case-case-3"]);
    expect(entries[1]).toMatchObject({
      kind: "deadline",
      title: "Audiência de conciliação",
      caseTitle: "Silva vs Banco",
      isHearing: true,
    });
    expect(entries[2]).toMatchObject({
      kind: "case",
      title: "Inventário Almeida",
      typeLabel: "Família",
    });
  });

  it("ignores completed deadlines", () => {
    const entries = buildAgendaEntries([{ ...hearing, status: "completed" }], [activeCase], memberName);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("case");
  });
});

describe("summarizeAgenda", () => {
  it("splits overdue, today, week and hearings", () => {
    const entries = buildAgendaEntries([hearing, replica], [activeCase, otherCase, looseCase], memberName);
    expect(summarizeAgenda(entries, "2026-08-18")).toEqual({
      overdue: 1,
      today: 1,
      upcoming: 1,
      hearings: 1,
    });
  });
});

describe("occupancyByDay", () => {
  it("marks overdue and hearing days inside the visible month", () => {
    const entries = buildAgendaEntries([hearing, replica], [looseCase], memberName);
    const occupancy = occupancyByDay(entries, 2026, 7, "2026-08-18");
    expect(occupancy.get(13)).toEqual({ count: 1, overdue: true, hearing: false });
    expect(occupancy.get(18)).toEqual({ count: 1, overdue: false, hearing: true });
    expect(occupancy.get(25)).toEqual({ count: 1, overdue: false, hearing: false });
  });
});

describe("timelineGroups", () => {
  const entries = [
    entry({ id: "a", title: "Atrasado", day: "2026-08-13", dueAt: "2026-08-13T12:00:00.000Z" }),
    entry({ id: "b", title: "Hoje", day: "2026-08-18", dueAt: "2026-08-18T12:00:00.000Z", isHearing: true }),
    entry({ id: "c", title: "Depois", day: "2026-08-25", dueAt: "2026-08-25T12:00:00.000Z" }),
    entry({ id: "d", title: "Outro mês", day: "2026-09-02", dueAt: "2026-09-02T12:00:00.000Z" }),
  ];

  it("pins overdue above the rest of the current month", () => {
    const groups = timelineGroups(entries, { today: "2026-08-18", year: 2026, month: 7 });
    expect(groups.map((group) => group.key)).toEqual(["overdue", "2026-08-18", "2026-08-25"]);
    expect(groups[0]?.tone).toBe("danger");
    expect(groups[0]?.items.map((item) => item.id)).toEqual(["a"]);
    expect(groups[1]?.label).toContain("Hoje");
  });

  it("focuses a selected day without mixing other dates", () => {
    const groups = timelineGroups(entries, {
      today: "2026-08-18",
      year: 2026,
      month: 7,
      selectedDay: "2026-08-25",
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((item) => item.id)).toEqual(["c"]);
  });

  it("lists only the visible month when browsing the past", () => {
    const groups = timelineGroups(entries, { today: "2026-09-01", year: 2026, month: 7 });
    expect(groups.map((group) => group.key)).toEqual(["2026-08-13", "2026-08-18", "2026-08-25"]);
    expect(groups.every((group) => group.tone === "danger")).toBe(true);
  });
});

describe("selectedCivilDay", () => {
  it("accepts a day that exists in the month", () => {
    expect(selectedCivilDay(2026, 7, "18")).toBe("2026-08-18");
  });

  it("rejects an impossible day", () => {
    expect(selectedCivilDay(2026, 1, "30")).toBeNull();
    expect(selectedCivilDay(2026, 7, "0")).toBeNull();
  });
});

describe("filterAgendaProcessSignals", () => {
  it("keeps process items only when they are near due or have a new DataJud movement", () => {
    const far: AgendaEntry = {
      id: "dl-far",
      kind: "deadline",
      title: "Contestação",
      caseId: "case-far",
      caseTitle: "Longe",
      typeLabel: "Processual",
      dueAt: "2026-09-20T12:00:00.000Z",
      day: "2026-09-20",
      responsibleLabel: "Mariana",
      isHearing: false,
    };
    const near: AgendaEntry = { ...far, id: "dl-near", day: "2026-08-20", dueAt: "2026-08-20T12:00:00.000Z", caseId: "case-near" };
    const unread: AgendaEntry = { ...far, id: "dl-unread", caseId: "case-unread" };
    const filtered = filterAgendaProcessSignals([far, near, unread], "2026-08-18", new Set(["case-unread"]));
    expect(filtered.map((item) => item.id)).toEqual(["dl-near", "dl-unread"]);
  });
});

describe("agendaItemHref", () => {
  it("opens the reminder editor instead of the linked case", () => {
    expect(
      agendaItemHref({ kind: "task", id: "task-1", caseId: "case-1" }, "2026-08", null),
    ).toBe("/painel/juridico/prazos?month=2026-08&editar=task-1");
  });

  it("keeps process deadlines on the case page", () => {
    expect(
      agendaItemHref({ kind: "deadline", id: "dl-1", caseId: "case-1" }, "2026-08", null),
    ).toBe("/painel/juridico/processos/case-1");
  });
});

describe("toDatetimeLocalValue", () => {
  it("formats an ISO instant for a datetime-local input in Sao Paulo", () => {
    expect(toDatetimeLocalValue("2026-08-18T15:00:00.000Z")).toBe("2026-08-18T12:00");
  });

  it("returns empty when there is no date", () => {
    expect(toDatetimeLocalValue(null)).toBe("");
  });
});
