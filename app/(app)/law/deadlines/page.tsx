import Link from "next/link";
import { canViewLegal } from "@/lib/law-office";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { LegalCase } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconAlert, IconBell, IconColumns } from "../../icons";

export default async function DeadlinesPage() {
  const supabase = createClient();
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

  const [orgRole, { data: membership }, members, { data: rows }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase
      .from("organization_members")
      .select("job_role")
      .eq("org_id", orgId)
      .eq("user_id", user!.id)
      .maybeSingle(),
    getOrgMembers(supabase, orgId),
    supabase
      .from("legal_cases")
      .select("*")
      .eq("org_id", orgId)
      .in("status", ["intake", "active", "waiting", "suspended"])
      .order("next_deadline_at", { ascending: true, nullsFirst: false }),
  ]);

  const isAdmin = orgRole === "admin";
  if (!canViewLegal(membership?.job_role, isAdmin)) return <AccessDenied />;

  const cases = (rows ?? []) as LegalCase[];
  const now = new Date();
  const week = new Date(Date.now() + 7 * 86_400_000);
  const overdue = cases.filter((item) => item.next_deadline_at && new Date(item.next_deadline_at) < now);
  const upcoming = cases.filter((item) => {
    if (!item.next_deadline_at) return false;
    const date = new Date(item.next_deadline_at);
    return date >= now && date <= week;
  });
  const later = cases.filter((item) => item.next_deadline_at && new Date(item.next_deadline_at) > week);
  const noDeadline = cases.filter((item) => !item.next_deadline_at);
  const memberName = new Map(members.map((member) => [member.user_id, member.name ?? "Sem nome"]));

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-brand-700">Agenda jurídica</p>
          <h1 className="mt-2 text-[clamp(1.7rem,5vw,3.1rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
            Prazos dos casos
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ink-soft">
            Uma fila por data para o time jurídico saber o que precisa de atenção antes de abrir cada caso.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/law/deadlines/calendar"
            className="nav-item inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-black text-ink-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            Ver calendário
          </Link>
          <Link
            href="/law"
            className="nav-item inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-black text-ink-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            Ver carteira de casos
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={IconAlert} label="Atrasados" value={String(overdue.length)} danger />
        <Metric icon={IconBell} label="Próximos 7 dias" value={String(upcoming.length)} />
        <Metric icon={IconColumns} label="Depois disso" value={String(later.length)} />
        <Metric icon={IconAlert} label="Sem prazo" value={String(noDeadline.length)} muted />
      </section>

      <DeadlineGroup title="Atrasados" cases={overdue} memberName={memberName} danger />
      <DeadlineGroup title="Próximos 7 dias" cases={upcoming} memberName={memberName} />
      <DeadlineGroup title="Mais adiante" cases={later} memberName={memberName} />
      <DeadlineGroup title="Casos sem prazo" cases={noDeadline} memberName={memberName} muted />
    </div>
  );
}

function DeadlineGroup({
  title,
  cases,
  memberName,
  danger = false,
  muted = false,
}: {
  title: string;
  cases: LegalCase[];
  memberName: Map<string, string>;
  danger?: boolean;
  muted?: boolean;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-base font-black text-ink">{title}</h2>
        <span className="tag bg-surface-2 text-ink-muted">{cases.length}</span>
      </div>
      {cases.length === 0 ? (
        <p className="px-5 py-5 text-sm font-medium text-ink-muted">Nada nesta fila.</p>
      ) : (
        <div className="divide-y divide-line">
          {cases.map((item) => (
            <Link
              key={item.id}
              href={`/law/${item.id}`}
              className="nav-item grid gap-3 px-5 py-4 hover:bg-brand-50 sm:grid-cols-[minmax(0,1fr)_11rem_11rem] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink">{item.title}</p>
                <p className="mt-1 truncate text-xs font-bold text-ink-muted">
                  {item.area ?? "Área não informada"}
                </p>
              </div>
              <span className="text-xs font-bold text-ink-muted">
                {item.responsible_id ? memberName.get(item.responsible_id) ?? "Sem nome" : "Sem responsável"}
              </span>
              <span
                className={
                  "text-xs font-black " +
                  (danger ? "text-danger-600" : muted ? "text-ink-muted" : "text-brand-700")
                }
              >
                {item.next_deadline_at
                  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
                      new Date(item.next_deadline_at)
                    )
                  : "Sem prazo definido"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  danger = false,
  muted = false,
}: {
  icon: (p: { className?: string }) => JSX.Element;
  label: string;
  value: string;
  danger?: boolean;
  muted?: boolean;
}) {
  return (
    <article className="panel p-4">
      <span
        className={
          "grid h-10 w-10 place-items-center rounded-full " +
          (danger ? "bg-danger-50 text-danger-600" : muted ? "bg-surface-2 text-ink-muted" : "bg-brand-50 text-brand-700")
        }
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs font-bold text-ink-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-black tracking-[-.04em] text-ink">{value}</p>
    </article>
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
      <h1 className="text-2xl font-black text-ink">Prazos jurídicos disponíveis no workspace de advocacia.</h1>
      <Link href="/dashboard" className="btn mt-4">
        Voltar ao painel
      </Link>
    </section>
  );
}
