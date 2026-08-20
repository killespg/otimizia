import type { LegalDeadline } from "@/lib/supabase/types";

const TIME_ZONE = "America/Sao_Paulo";

export const LEGAL_DEADLINE_TYPE_LABEL: Record<LegalDeadline["deadline_type"], string> = {
  procedural: "Processual",
  hearing: "Audiência",
  internal: "Interno",
  client: "Cliente",
  administrative: "Administrativo",
};

export type AgendaSourceDeadline = {
  id: string;
  title: string;
  due_at: string;
  deadline_type: LegalDeadline["deadline_type"];
  case_id: string;
  assigned_to: string | null;
  status: LegalDeadline["status"];
};

export type AgendaSourceCase = {
  id: string;
  title: string;
  next_deadline_at: string | null;
  responsible_id: string | null;
  area: string | null;
};

export type AgendaEntry = {
  id: string;
  kind: "deadline" | "case" | "task";
  title: string;
  caseId: string;
  caseTitle: string;
  typeLabel: string;
  dueAt: string;
  day: string;
  responsibleLabel: string;
  isHearing: boolean;
  ownerLabel?: string | null;
  notes?: string | null;
  handoffPending?: boolean;
};

export type AgendaDayGroup = {
  key: string;
  label: string;
  tone?: "danger";
  items: AgendaEntry[];
};

export type AgendaSummary = {
  overdue: number;
  today: number;
  upcoming: number;
  hearings: number;
};

export type DayOccupancy = {
  count: number;
  overdue: boolean;
  hearing: boolean;
};

export function civilDate(value: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

export function agendaItemHref(
  item: Pick<AgendaEntry, "kind" | "id" | "caseId">,
  monthParam: string,
  selectedDay: string | null,
) {
  if (item.kind === "task") {
    const params = new URLSearchParams({ month: monthParam, editar: item.id });
    if (selectedDay) params.set("dia", String(Number(selectedDay.slice(-2))));
    return `/painel/juridico/prazos?${params.toString()}`;
  }
  if (item.caseId) return `/painel/juridico/processos/${item.caseId}`;
  return `/painel/juridico/prazos?month=${monthParam}`;
}

export function formatAgendaClock(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function formatAgendaDayHeading(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, date, 12));
}

export function monthBounds(year: number, month: number): { start: string; end: string } {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    start: `${year}-${pad(month + 1)}-01`,
    end: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  };
}

export function selectedCivilDay(year: number, month: number, dayParam?: string): string | null {
  const day = Number(dayParam);
  const lastDay = new Date(year, month + 1, 0).getDate();
  if (!Number.isInteger(day) || day < 1 || day > lastDay) return null;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function memberLabel(id: string | null, names: Map<string, string>, empty: string) {
  if (!id) return empty;
  return names.get(id) ?? "Sem nome";
}

function addDays(day: string, amount: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + amount));
  return next.toISOString().slice(0, 10);
}

export function buildAgendaEntries(
  deadlines: AgendaSourceDeadline[],
  cases: AgendaSourceCase[],
  memberName: Map<string, string>,
): AgendaEntry[] {
  const caseById = new Map(cases.map((item) => [item.id, item]));
  const covered = new Map<string, Set<string>>();
  const entries: AgendaEntry[] = [];

  for (const deadline of deadlines) {
    if (deadline.status !== "pending") continue;
    const legalCase = caseById.get(deadline.case_id);
    const day = civilDate(deadline.due_at);
    const days = covered.get(deadline.case_id) ?? new Set<string>();
    days.add(day);
    covered.set(deadline.case_id, days);
    entries.push({
      id: deadline.id,
      kind: "deadline",
      title: deadline.title,
      caseId: deadline.case_id,
      caseTitle: legalCase?.title ?? "Caso",
      typeLabel: LEGAL_DEADLINE_TYPE_LABEL[deadline.deadline_type],
      dueAt: deadline.due_at,
      day,
      responsibleLabel: memberLabel(deadline.assigned_to, memberName, "Sem responsável"),
      isHearing: deadline.deadline_type === "hearing",
    });
  }

  for (const legalCase of cases) {
    if (!legalCase.next_deadline_at) continue;
    const day = civilDate(legalCase.next_deadline_at);
    if (covered.get(legalCase.id)?.has(day)) continue;
    entries.push({
      id: `case-${legalCase.id}`,
      kind: "case",
      title: legalCase.title,
      caseId: legalCase.id,
      caseTitle: legalCase.title,
      typeLabel: legalCase.area ?? "Compromisso da carteira",
      dueAt: legalCase.next_deadline_at,
      day,
      responsibleLabel: memberLabel(legalCase.responsible_id, memberName, "Sem responsável"),
      isHearing: false,
    });
  }

  return entries.sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.title.localeCompare(b.title, "pt-BR"));
}

export function summarizeAgenda(entries: AgendaEntry[], today: string): AgendaSummary {
  const week = addDays(today, 7);
  return {
    overdue: entries.filter((item) => item.day < today).length,
    today: entries.filter((item) => item.day === today).length,
    upcoming: entries.filter((item) => item.day > today && item.day <= week).length,
    hearings: entries.filter((item) => item.isHearing).length,
  };
}

export function agendaHeadline(summary: AgendaSummary): string {
  const overdue = summary.overdue === 1 ? "1 atrasado" : `${summary.overdue} atrasados`;
  const today =
    summary.today === 1 ? "1 compromisso hoje" : `${summary.today} compromissos hoje`;
  return `${overdue} · ${today} · ${summary.upcoming} nos próximos 7 dias`;
}

export function occupancyByDay(
  entries: AgendaEntry[],
  year: number,
  month: number,
  today: string,
): Map<number, DayOccupancy> {
  const { start, end } = monthBounds(year, month);
  const occupancy = new Map<number, DayOccupancy>();
  for (const entry of entries) {
    if (entry.day < start || entry.day > end) continue;
    const day = Number(entry.day.slice(-2));
    const current = occupancy.get(day) ?? { count: 0, overdue: false, hearing: false };
    current.count += 1;
    current.overdue = current.overdue || entry.day < today;
    current.hearing = current.hearing || entry.isHearing;
    occupancy.set(day, current);
  }
  return occupancy;
}

function groupsFromDays(entries: AgendaEntry[], today: string): AgendaDayGroup[] {
  const byDay = new Map<string, AgendaEntry[]>();
  for (const item of entries) {
    byDay.set(item.day, [...(byDay.get(item.day) ?? []), item]);
  }
  return Array.from(byDay.keys())
    .sort()
    .map((day) => ({
      key: day,
      label: day === today ? `Hoje · ${formatAgendaDayHeading(day)}` : formatAgendaDayHeading(day),
      tone: day < today ? "danger" : undefined,
      items: byDay.get(day) ?? [],
    }));
}

export function timelineGroups(
  entries: AgendaEntry[],
  {
    today,
    year,
    month,
    selectedDay,
  }: {
    today: string;
    year: number;
    month: number;
    selectedDay?: string | null;
  },
): AgendaDayGroup[] {
  if (selectedDay) {
    return [
      {
        key: selectedDay,
        label: selectedDay === today ? `Hoje · ${formatAgendaDayHeading(selectedDay)}` : formatAgendaDayHeading(selectedDay),
        tone: selectedDay < today ? "danger" : undefined,
        items: entries.filter((item) => item.day === selectedDay),
      },
    ];
  }

  const { start, end } = monthBounds(year, month);
  const isCurrentMonth = today >= start && today <= end;

  if (isCurrentMonth) {
    const overdueItems = entries.filter((item) => item.day < today);
    const rest = entries.filter((item) => item.day >= today && item.day <= end);
    const groups: AgendaDayGroup[] = [];
    if (overdueItems.length > 0) {
      groups.push({ key: "overdue", label: "Atrasados", tone: "danger", items: overdueItems });
    }
    return [...groups, ...groupsFromDays(rest, today)];
  }

  return groupsFromDays(
    entries.filter((item) => item.day >= start && item.day <= end),
    today,
  );
}

export function isAgendaProcessSignal(
  entry: Pick<AgendaEntry, "kind" | "day" | "caseId">,
  today: string,
  unreadCaseIds: Set<string>,
  horizonDays = 7,
) {
  if (entry.kind === "task") return true;
  return entry.day <= addDays(today, horizonDays) || unreadCaseIds.has(entry.caseId);
}

export function filterAgendaProcessSignals(
  entries: AgendaEntry[],
  today: string,
  unreadCaseIds: Set<string>,
) {
  return entries.filter((entry) => isAgendaProcessSignal(entry, today, unreadCaseIds));
}

export type AgendaSourceTask = {
  id: string;
  title: string;
  due_at: string | null;
  notes: string | null;
  case_id: string | null;
  assignee_id: string | null;
  owner_id: string;
  pending_assignee_id?: string | null;
};

export function buildTaskAgendaEntries(
  tasks: AgendaSourceTask[],
  cases: AgendaSourceCase[],
  memberName: Map<string, string>,
  currentUserId: string,
  today: string,
): AgendaEntry[] {
  const caseById = new Map(cases.map((item) => [item.id, item]));
  return tasks
    .map((task) => {
      const dueAt = task.due_at ?? `${today}T12:00:00.000-03:00`;
      const legalCase = task.case_id ? caseById.get(task.case_id) : undefined;
      const ownerId = task.assignee_id ?? task.owner_id;
      return {
        id: task.id,
        kind: "task" as const,
        title: task.title,
        caseId: task.case_id ?? "",
        caseTitle: legalCase?.title ?? "",
        typeLabel: task.due_at ? "Lembrete" : "Lembrete sem data",
        dueAt,
        day: task.due_at ? civilDate(task.due_at) : today,
        responsibleLabel: memberLabel(ownerId, memberName, "Sem responsável"),
        isHearing: false,
        ownerLabel: ownerId !== currentUserId ? memberName.get(ownerId) ?? "Equipe" : null,
        notes: task.notes,
        handoffPending: task.pending_assignee_id === currentUserId,
      };
    })
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.title.localeCompare(b.title, "pt-BR"));
}
