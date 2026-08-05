import Link from "next/link";
import { canViewLegal } from "@/lib/law/law-office";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { LegalCase } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { IconAlert, IconBell, IconColumns } from "../../icons";

export default async function DeadlinesPage() {
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
  const week = new Date(now.getTime() + 7 * 86_400_000);
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
    <div className="mx-auto w-full max-w-[1640px] space-y-5">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-od-text-2">Jurídico / Agenda e prazos</p>
          <h1 className="mt-2 text-od-title text-white">Agenda e prazos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/52">Fila cronológica do escritório para agir antes que um compromisso vire risco.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/painel/juridico/prazos/calendario"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/[0.1] px-4 text-xs font-semibold text-white/65 hover:bg-white/[0.04] hover:text-white"
          >
            Ver calendário
          </Link>
          <Link
            href="/painel/juridico/processos"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-od-accent px-4 text-[13px] font-semibold text-white hover:bg-brand-600"
          >
            Ver carteira de casos
          </Link>
        </div>
      </header>

      <section className="grid border-y border-white/[0.08] sm:grid-cols-2 xl:grid-cols-4">
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
    <section className="overflow-hidden panel">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <span className="text-xs font-semibold text-od-text-3">{cases.length}</span>
      </div>
      {cases.length === 0 ? (
        <p className="px-5 py-5 text-sm text-white/52">Nada nesta fila.</p>
      ) : (
        <div>
          {cases.map((item) => (
            <Link
              key={item.id}
              href={`/painel/juridico/processos/${item.id}`}
              className="grid gap-3 border-b border-white/[0.06] px-5 py-4 hover:bg-white/[0.025] sm:grid-cols-[minmax(0,1fr)_11rem_11rem] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white">{item.title}</p>
                <p className="mt-1 truncate text-xs text-od-text-3">
                  {item.area ?? "Área não informada"}
                </p>
              </div>
              <span className="text-xs text-white/58">
                {item.responsible_id ? memberName.get(item.responsible_id) ?? "Sem nome" : "Sem responsável"}
              </span>
              <span
                className={
                  "text-xs font-semibold " +
                  (danger ? "text-[#fb7767]" : muted ? "text-od-text-3" : "text-od-text-2")
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
  icon: (p: { className?: string }) => React.ReactElement;
  label: string;
  value: string;
  danger?: boolean;
  muted?: boolean;
}) {
  return (
    <article className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span className={danger ? "text-[#fb7767]" : muted ? "text-od-text-3" : "text-od-text-2"}><Icon className="h-4 w-4" /></span>
      <div><p className="text-xs text-od-text-3">{label}</p><p className="mt-1 text-2xl font-bold tracking-[-.02em] text-white">{value}</p></div>
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
      <Link href="/painel" className="btn mt-4">
        Voltar ao painel
      </Link>
    </section>
  );
}
