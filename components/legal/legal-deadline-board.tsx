import Link from "next/link";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { completeLegalDeadline } from "@/app/(dashboard)/painel/juridico/actions";
import { completeAgendaTask } from "@/app/(dashboard)/painel/actions";
import { PendingButton } from "@/components/ui/PendingButton";
import { MetricBand, Status } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/feedback";
import { DataPanel } from "@/components/ui/surface";
import { buildMonthCells } from "@/lib/utils/calendar-grid";
import {
  formatAgendaClock,
  occupancyByDay,
  summarizeAgenda,
  timelineGroups,
  agendaItemHref,
  type AgendaEntry,
} from "@/lib/law/legal-agenda";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const QUEUE_RULE =
  "Processos só entram perto do vencimento ou com movimentação nova no DataJud.";

export function LegalDeadlineBoard({
  entries,
  year,
  month,
  monthParam,
  prevMonth,
  nextMonth,
  monthTitle,
  today,
  selectedDay,
  casesWithoutDeadline,
  canManage = false,
}: {
  entries: AgendaEntry[];
  year: number;
  month: number;
  monthParam: string;
  prevMonth: string;
  nextMonth: string;
  monthTitle: string;
  today: string;
  selectedDay: string | null;
  casesWithoutDeadline: number;
  canManage?: boolean;
}) {
  const summary = summarizeAgenda(entries, today);
  const occupancy = occupancyByDay(entries, year, month, today);
  const groups = timelineGroups(entries, { today, year, month, selectedDay });
  const cells = buildMonthCells(year, month);
  const weeks: (number | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  const todayParts = today.split("-");
  const isCurrentMonth = Number(todayParts[0]) === year && Number(todayParts[1]) === month + 1;
  const todayDate = Number(todayParts[2]);
  const todayMonthParam = today.slice(0, 7);
  const todayIsSelected = selectedDay === today;
  const todayHref = todayIsSelected
    ? `/juridico/prazos?month=${todayMonthParam}`
    : `/juridico/prazos?month=${todayMonthParam}&dia=${todayDate}`;
  const monthHref = `/juridico/prazos?month=${monthParam}`;
  const hrefFor = (day?: number) => {
    const params = new URLSearchParams({ month: monthParam });
    if (day) params.set("dia", String(day));
    return `/juridico/prazos?${params.toString()}`;
  };

  return (
    <div className="grid gap-6">
      <MetricBand
        aria-label="Resumo da agenda"
        items={[
          {
            label: "Atrasados",
            value: summary.overdue,
            tone: "danger",
          },
          {
            label: "Hoje",
            value: summary.today,
            href: todayHref,
            current: todayIsSelected,
          },
          {
            label: "Próximos 7 dias",
            value: summary.upcoming,
            tone: summary.upcoming > 0 ? "warning" : undefined,
          },
          { label: "Audiências", value: summary.hearings },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,.85fr)]">
        <DataPanel
          title={monthTitle}
          description="O mês do escritório. Abra um dia para ver a fila daquela data."
          actions={
            <div className="flex gap-2">
              <Link
                href={`/juridico/prazos?month=${prevMonth}`}
                aria-label="Mês anterior"
                className="ui-button ui-button--secondary ui-icon-button"
              >
                <ChevronLeft size={16} />
              </Link>
              <Link
                href={`/juridico/prazos?month=${nextMonth}`}
                aria-label="Próximo mês"
                className="ui-button ui-button--secondary ui-icon-button"
              >
                <ChevronRight size={16} />
              </Link>
            </div>
          }
        >
          <table data-ui="deadline-calendar" className="w-full table-fixed border-collapse">
            <caption className="sr-only">{monthTitle}</caption>
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] font-semibold uppercase tracking-[0.08em] text-od-text-3">
                {WEEKDAYS.map((label) => (
                  <th key={label} scope="col" className="px-1 py-2 text-center font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIndex) => (
                <tr key={weekIndex}>
                  {week.map((day, dayIndex) => {
                    const mark = day ? occupancy.get(day) : undefined;
                    const isToday = Boolean(day && isCurrentMonth && day === todayDate);
                    const isSelected = Boolean(day && selectedDay && Number(selectedDay.slice(-2)) === day);
                    const cellClass = [
                      "h-14 border-b border-r border-white/[0.06] p-0 align-top sm:h-[4.75rem]",
                      dayIndex === 0 ? "border-l-0" : "",
                      day === null ? "bg-white/[0.015]" : "",
                      isSelected ? "bg-od-accent/16" : isToday ? "bg-white/[0.04]" : "",
                    ].join(" ");
                    return (
                      <td key={`${weekIndex}-${dayIndex}`} className={cellClass}>
                        {day ? (
                          <Link
                            href={isSelected ? monthHref : hrefFor(day)}
                            aria-current={isSelected ? "true" : isToday ? "date" : undefined}
                            className="flex h-full min-h-11 flex-col gap-1 px-1.5 py-1.5 hover:bg-white/[0.04]"
                          >
                            <span
                              className={
                                "text-xs font-semibold tabular-nums " +
                                (isToday ? "text-od-accent" : "text-white/55")
                              }
                            >
                              {day}
                            </span>
                            {mark ? (
                              <span
                                className={
                                  "mt-auto text-[11px] font-semibold tabular-nums " +
                                  (mark.overdue
                                    ? "text-[var(--od-danger-fg)]"
                                    : mark.hearing
                                      ? "text-od-text"
                                      : "text-od-text-2")
                                }
                              >
                                {mark.count}
                              </span>
                            ) : null}
                          </Link>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </DataPanel>

        <DataPanel
          title={selectedDay ? "Fila do dia" : "Fila cronológica"}
          description={
            selectedDay
              ? `Só o que vence na data escolhida no calendário. ${QUEUE_RULE}`
              : `Atrasados primeiro; depois o que ainda cabe neste mês. ${QUEUE_RULE}`
          }
          count={groups.reduce((sum, group) => sum + group.items.length, 0)}
          actions={
            selectedDay ? (
              <Link href={monthHref} className="ui-button ui-button--quiet ui-button--sm">
                Ver o mês
              </Link>
            ) : null
          }
        >
          <div data-ui="deadline-timeline">
            {groups.length === 0 || groups.every((group) => group.items.length === 0) ? (
              selectedDay ? (
                <EmptyState
                  inset
                  title="Nada neste dia."
                  action={
                    <Link href={monthHref} className="ui-button ui-button--quiet ui-button--sm">
                      Ver o mês
                    </Link>
                  }
                />
              ) : (
                <EmptyState inset title="Nenhum prazo pendente nesta agenda." />
              )
            ) : (
              groups.map((group) => (
                <TimelineGroup
                  key={group.key}
                  group={group}
                  canManage={canManage}
                  monthParam={monthParam}
                  selectedDay={selectedDay}
                />
              ))
            )}
          </div>
        </DataPanel>
      </div>

      {casesWithoutDeadline > 0 ? (
        <p className="text-xs leading-5 text-od-text-3">
          {casesWithoutDeadline === 1 ? "1 caso ativo sem prazo cadastrado." : `${casesWithoutDeadline} casos ativos sem prazo cadastrado.`}{" "}
          <Link href="/juridico/processos" className="font-semibold text-od-text-2 hover:text-white">
            Abrir carteira
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function TimelineGroup({
  group,
  canManage,
  monthParam,
  selectedDay,
}: {
  group: ReturnType<typeof timelineGroups>[number];
  canManage: boolean;
  monthParam: string;
  selectedDay: string | null;
}) {
  const showDayRail = group.key !== "overdue";
  const dayNumber = showDayRail ? Number(group.key.slice(-2)) : null;

  return (
    <section aria-labelledby={`agenda-${group.key}`} className="border-b border-white/[0.06] last:border-b-0">
      <h3
        id={`agenda-${group.key}`}
        className={
          "px-5 pb-1 pt-4 text-xs font-semibold uppercase tracking-[0.06em] " +
          (group.tone === "danger" ? "text-[var(--od-danger-fg)]" : "text-od-text-3")
        }
      >
        {group.label}
      </h3>
      <ol className="pb-2">
        {group.items.map((item, index) => (
          <li key={item.id} className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-3 px-5 py-3 hover:bg-white/[0.025]">
            <div className="pt-0.5 text-right">
              {showDayRail && dayNumber !== null ? (
                <p className={"text-lg font-bold tabular-nums leading-none tracking-[-0.04em] " + (index === 0 ? "text-white" : "text-transparent")}>
                  {dayNumber}
                </p>
              ) : (
                <p
                  className={
                    "text-xs font-semibold tabular-nums " +
                    (group.tone === "danger" ? "text-[var(--od-danger-fg)]" : "text-od-text-2")
                  }
                >
                  {item.day.slice(-2)}/{item.day.slice(5, 7)}
                </p>
              )}
              <p className="mt-1 text-[11px] tabular-nums text-od-text-3">{formatAgendaClock(item.dueAt)}</p>
            </div>
            <div className="flex min-w-0 items-start gap-3">
              <Link
                href={agendaItemHref(item, monthParam, selectedDay)}
                aria-label={item.kind === "task" ? `Editar ${item.title}` : item.title}
                className="min-w-0 flex-1"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-[13px] font-semibold text-white">{item.title}</p>
                  {item.ownerLabel ? <Status intent="neutral">{item.ownerLabel}</Status> : null}
                </div>
                <p className="mt-1 truncate text-xs text-od-text-3">
                  {item.typeLabel}
                  {item.kind === "deadline" && item.caseTitle ? ` · ${item.caseTitle}` : ""}
                  {item.kind === "task" && item.caseTitle ? ` · ${item.caseTitle}` : ""}
                  {item.kind === "task" && item.notes ? ` · ${item.notes}` : ""}
                  {item.kind === "case" ? ` · ${item.responsibleLabel}` : ""}
                </p>
              </Link>
              {item.kind === "deadline" && canManage ? (
                <form action={completeLegalDeadline}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="case_id" value={item.caseId} />
                  <PendingButton
                    aria-label={`Concluir ${item.title}`}
                    intent="quiet"
                    className="ui-icon-button"
                    iconOnly
                    pendingLabel="Concluindo"
                  >
                    <Check size={16} />
                  </PendingButton>
                </form>
              ) : null}
              {item.kind === "task" ? (
                <form action={completeAgendaTask}>
                  <input type="hidden" name="id" value={item.id} />
                  <PendingButton
                    aria-label={`Concluir ${item.title}`}
                    intent="quiet"
                    className="ui-icon-button"
                    iconOnly
                    pendingLabel="Concluindo"
                  >
                    <Check size={16} />
                  </PendingButton>
                </form>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
