import Link from "next/link";
import { buildMonthCells } from "@/lib/utils/calendar-grid";
import { formatDate } from "@/lib/utils/format";
import { IconArrowRight } from "../../icons";
import { calendarToneClass, type CalendarItem } from "../dashboard-format";

const CALENDAR_WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function CalendarWidget({
  now,
  items,
  viewAllHref,
}: {
  now: Date;
  items: CalendarItem[];
  viewAllHref: string;
}) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const cells = buildMonthCells(year, month);

  const byDay = new Map<number, CalendarItem[]>();
  for (const item of items) {
    if (item.date.getFullYear() === year && item.date.getMonth() === month) {
      const day = item.date.getDate();
      byDay.set(day, [...(byDay.get(day) ?? []), item]);
    }
  }

  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(now);
  const upcoming = items
    .filter((item) => item.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);

  return (
    <section className="enter rounded-md border border-od-border bg-od-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">Agenda</p>
          <h2 className="mt-0.5 text-base font-black capitalize tracking-[-0.02em] text-od-text sm:text-lg">
            {monthLabel}
          </h2>
        </div>
        <Link
          href={viewAllHref}
          className="nav-item inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:text-brand-900"
        >
          Ver agenda
          <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-[0.04em] text-od-text-3">
        {CALENDAR_WEEKDAY_LABELS.map((label, index) => (
          <div key={index}>{label}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          const dayItems = day ? byDay.get(day) ?? [] : [];
          const isToday = day === now.getDate();
          return (
            <div
              key={index}
              className={
                "aspect-square rounded-md text-xs font-bold " +
                (day === null
                  ? ""
                  : isToday
                    ? "bg-brand-700 text-white"
                    : dayItems.length > 0
                      ? "bg-brand-50 text-brand-700"
                      : "text-od-text-2")
              }
            >
              {day && <span className="grid h-full place-items-center">{day}</span>}
            </div>
          );
        })}
      </div>

      {upcoming.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-od-border bg-od-muted-surface px-3 py-6 text-center text-xs font-medium text-od-text-3">
          Nada agendado por enquanto.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {upcoming.map((item, index) => (
            <li key={index}>
              <Link
                href={item.href}
                className="row-link flex items-center justify-between gap-2 rounded-md border border-od-border px-3 py-2 hover:border-brand-300 hover:bg-brand-50"
              >
                <span className="clip-1 text-safe min-w-0 text-xs font-bold text-od-text">{item.title}</span>
                <span className={"shrink-0 text-xs font-black " + calendarToneClass(item.tone)}>
                  {formatDate(item.date.toISOString())}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
