import Link from "next/link";
import { canViewLegal } from "@/lib/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { LegalDeadline } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { buildMonthCells, monthParam, parseMonthParam } from "@/lib/calendar-grid";
import { IconArrowRight } from "../../../icons";

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-surface-2 text-ink-muted",
  normal: "bg-brand-50 text-brand-700",
  high: "bg-warning-50 text-warning-700",
  critical: "bg-danger-50 text-danger-700",
};
const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function DeadlinesCalendarPage(props: { searchParams: Promise<{ month?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);

  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin
  );
  if (workspaceKey !== "law_office") return <NotLawOffice />;

  const [orgRole, { data: membership }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
  ]);
  const isAdmin = orgRole === "admin";
  if (!canViewLegal(membership?.job_role, isAdmin)) return <AccessDenied />;

  const { year, month } = parseMonthParam(searchParams.month, new Date());
  const rangeStart = new Date(year, month, 1);
  const rangeEnd = new Date(year, month + 1, 1);

  const { data: rows } = await supabase
    .from("legal_deadlines")
    .select("id, case_id, title, due_at, priority, status")
    .eq("org_id", orgId)
    .eq("status", "pending")
    .gte("due_at", rangeStart.toISOString())
    .lt("due_at", rangeEnd.toISOString())
    .order("due_at");

  type Row = Pick<LegalDeadline, "id" | "case_id" | "title" | "due_at" | "priority" | "status">;
  const deadlines = (rows ?? []) as Row[];
  const byDay = new Map<number, Row[]>();
  for (const item of deadlines) {
    const day = new Date(item.due_at).getDate();
    byDay.set(day, [...(byDay.get(day) ?? []), item]);
  }

  const cells = buildMonthCells(year, month);

  const prevParam = monthParam(new Date(year, month - 1, 1));
  const nextParam = monthParam(new Date(year, month + 1, 1));
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const monthTitle = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(rangeStart);

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-brand-700">Agenda jurídica</p>
          <h1 className="mt-2 text-[clamp(1.7rem,5vw,3.1rem)] font-black capitalize leading-[1.02] tracking-[-0.04em] text-ink">
            {monthTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ink-soft">
            Prazos pendentes do mês, por dia. Clique num prazo para abrir o caso.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/painel/juridico/prazos"
            className="nav-item inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-black text-ink-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            Ver lista
          </Link>
          <Link
            href={`/painel/juridico/prazos/calendario?month=${prevParam}`}
            aria-label="Mês anterior"
            className="nav-item grid h-11 w-11 place-items-center rounded-lg border border-line bg-white hover:border-brand-300 hover:bg-brand-50"
          >
            <IconArrowRight className="h-4 w-4 rotate-180" />
          </Link>
          <Link
            href={`/painel/juridico/prazos/calendario?month=${nextParam}`}
            aria-label="Próximo mês"
            className="nav-item grid h-11 w-11 place-items-center rounded-lg border border-line bg-white hover:border-brand-300 hover:bg-brand-50"
          >
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="panel overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-[11px] font-black uppercase tracking-[.08em] text-ink-muted">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-2">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, index) => {
            const items = day ? byDay.get(day) ?? [] : [];
            const isToday = Boolean(day && isCurrentMonth && day === today.getDate());
            return (
              <div
                key={index}
                className={
                  "min-h-24 border-b border-r border-line p-1.5 sm:min-h-32 " +
                  (day === null ? "bg-surface-2/40" : isToday ? "bg-brand-50" : "")
                }
              >
                {day && (
                  <>
                    <p className={"text-xs font-bold " + (isToday ? "text-brand-700" : "text-ink-muted")}>{day}</p>
                    <div className="mt-1 space-y-1">
                      {items.slice(0, 3).map((item) => (
                        <Link
                          key={item.id}
                          href={`/painel/juridico/processos/${item.case_id}`}
                          className={
                            "block truncate rounded px-1.5 py-0.5 text-[10px] font-bold hover:opacity-80 " +
                            (PRIORITY_COLOR[item.priority] ?? PRIORITY_COLOR.normal)
                          }
                        >
                          {item.title}
                        </Link>
                      ))}
                      {items.length > 3 && <p className="text-[10px] font-bold text-ink-muted">+{items.length - 3} mais</p>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function AccessDenied() {
  return (
    <section className="panel max-w-xl p-6">
      <p className="text-sm font-black text-brand-700">Acesso restrito</p>
      <h1 className="mt-2 text-2xl font-black text-ink">Seu cargo não acessa prazos jurídicos.</h1>
    </section>
  );
}

function NotLawOffice() {
  return (
    <section className="panel max-w-xl p-6">
      <h1 className="text-2xl font-black text-ink">Agenda jurídica disponível no workspace de advocacia.</h1>
      <Link href="/painel" className="btn mt-4">
        Voltar ao painel
      </Link>
    </section>
  );
}

