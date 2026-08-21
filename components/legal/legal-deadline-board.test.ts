import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AgendaEntry } from "@/lib/law/legal-agenda";

vi.mock("@/app/(dashboard)/painel/juridico/actions", () => ({
  completeLegalDeadline: vi.fn(),
}));

vi.mock("@/app/(dashboard)/painel/actions", () => ({
  completeAgendaTask: vi.fn(),
}));

import { LegalDeadlineBoard } from "./legal-deadline-board";

const hearing: AgendaEntry = {
  id: "dl-1",
  kind: "deadline",
  title: "Audiência de conciliação",
  caseId: "case-1",
  caseTitle: "Silva vs Banco",
  typeLabel: "Audiência",
  dueAt: "2026-08-18T12:00:00.000Z",
  day: "2026-08-18",
  responsibleLabel: "Mariana Costa",
  isHearing: true,
};

const overdue: AgendaEntry = {
  id: "dl-2",
  kind: "deadline",
  title: "Apresentar réplica",
  caseId: "case-2",
  caseTitle: "Execução de título extrajudicial",
  typeLabel: "Processual",
  dueAt: "2026-08-13T15:00:00.000Z",
  day: "2026-08-13",
  responsibleLabel: "Mariana Costa",
  isHearing: false,
};

describe("LegalDeadlineBoard", () => {
  it("renders a month calendar and a chronological timeline instead of a case table", () => {
    const html = renderToStaticMarkup(
      createElement(LegalDeadlineBoard, {
        entries: [overdue, hearing],
        year: 2026,
        month: 7,
        monthParam: "2026-08",
        prevMonth: "2026-07",
        nextMonth: "2026-09",
        monthTitle: "agosto de 2026",
        today: "2026-08-18",
        selectedDay: null,
        casesWithoutDeadline: 2,
        canManage: true,
      }),
    );

    expect(html.match(/data-ui="data-panel"/g)).toHaveLength(2);
    expect(html).toContain('data-ui="deadline-calendar"');
    expect(html).toContain('data-ui="deadline-timeline"');
    expect(html).toContain("Audiência de conciliação");
    expect(html).toContain("/juridico/processos/case-1");
    expect(html).toContain("Apresentar réplica");
    expect(html).toContain("Atrasados");
    expect(html).toContain("2 casos ativos sem prazo cadastrado.");
    expect(html).toContain("ui-metric--danger");
    expect(html).toContain("ui-button--secondary");
    expect(html).toContain("ui-icon-button");
    expect(html).toContain("/juridico/prazos?month=2026-08&amp;dia=18");
    expect(html).toContain("text-[var(--od-danger-fg)]");
    expect(html).not.toContain("#fb7767");
    expect(html).not.toContain("Casos sem prazo");
    expect(html).not.toContain("Processos em acompanhamento");
    expect(html).not.toContain("Situação");
  });

  it("shows a name tag on someone else's reminder", () => {
    const html = renderToStaticMarkup(
      createElement(LegalDeadlineBoard, {
        entries: [
          {
            ...hearing,
            id: "task-1",
            kind: "task",
            title: "Ligar para a testemunha",
            ownerLabel: "Ana Souza",
            typeLabel: "Lembrete",
            isHearing: false,
          },
        ],
        year: 2026,
        month: 7,
        monthParam: "2026-08",
        prevMonth: "2026-07",
        nextMonth: "2026-09",
        monthTitle: "agosto de 2026",
        today: "2026-08-18",
        selectedDay: null,
        casesWithoutDeadline: 0,
      }),
    );

    expect(html).toContain("Ligar para a testemunha");
    expect(html).toContain("Ana Souza");
    expect(html).toContain("ui-status--neutral");
    expect(html).toContain("/juridico/prazos?month=2026-08&amp;editar=task-1");
    expect(html).not.toContain("/juridico/processos/case-1");
  });

  it("filters today from the metric band and shows an inset empty state for an idle day", () => {
    const selected = renderToStaticMarkup(
      createElement(LegalDeadlineBoard, {
        entries: [hearing],
        year: 2026,
        month: 7,
        monthParam: "2026-08",
        prevMonth: "2026-07",
        nextMonth: "2026-09",
        monthTitle: "agosto de 2026",
        today: "2026-08-18",
        selectedDay: "2026-08-18",
        casesWithoutDeadline: 0,
      }),
    );
    const emptyDay = renderToStaticMarkup(
      createElement(LegalDeadlineBoard, {
        entries: [hearing],
        year: 2026,
        month: 7,
        monthParam: "2026-08",
        prevMonth: "2026-07",
        nextMonth: "2026-09",
        monthTitle: "agosto de 2026",
        today: "2026-08-18",
        selectedDay: "2026-08-25",
        casesWithoutDeadline: 0,
      }),
    );
    const upcoming = renderToStaticMarkup(
      createElement(LegalDeadlineBoard, {
        entries: [
          {
            ...hearing,
            id: "dl-week",
            day: "2026-08-22",
            dueAt: "2026-08-22T12:00:00.000Z",
            isHearing: false,
          },
        ],
        year: 2026,
        month: 7,
        monthParam: "2026-08",
        prevMonth: "2026-07",
        nextMonth: "2026-09",
        monthTitle: "agosto de 2026",
        today: "2026-08-18",
        selectedDay: null,
        casesWithoutDeadline: 0,
      }),
    );

    expect(selected).toContain('aria-current="true"');
    expect(selected).toContain("/juridico/prazos?month=2026-08\"");
    expect(emptyDay).toContain("Nada neste dia.");
    expect(emptyDay).toContain("ui-feedback--inset");
    expect(emptyDay).toContain("Ver o mês");
    expect(upcoming).toContain("ui-metric--warning");
  });
});
