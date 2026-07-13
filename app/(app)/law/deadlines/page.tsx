import Link from "next/link";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  Tag,
} from "@/components/app-ui";
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
    supabase
      .from("profiles")
      .select("profession_type, is_admin")
      .eq("id", user!.id)
      .maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);

  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin,
  );
  if (workspaceKey !== "law_office") return <NotLawOffice />;

  const [orgRole, { data: membership }, members, { data: rows }] =
    await Promise.all([
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
  const overdue = cases.filter(
    (item) => item.next_deadline_at && new Date(item.next_deadline_at) < now,
  );
  const upcoming = cases.filter((item) => {
    if (!item.next_deadline_at) return false;
    const date = new Date(item.next_deadline_at);
    return date >= now && date <= week;
  });
  const later = cases.filter(
    (item) => item.next_deadline_at && new Date(item.next_deadline_at) > week,
  );
  const noDeadline = cases.filter((item) => !item.next_deadline_at);
  const memberName = new Map(
    members.map((member) => [member.user_id, member.name ?? "Sem nome"]),
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Agenda jurídica"
        title="Prazos dos casos"
        description="Uma fila por data para o time jurídico saber o que precisa de atenção antes de abrir cada caso."
        actions={
          <div className="flex flex-wrap gap-2">
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
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={IconAlert}
          label="Atrasados"
          value={String(overdue.length)}
          tone="danger"
        />
        <StatCard
          icon={IconBell}
          label="Próximos 7 dias"
          value={String(upcoming.length)}
          tone="warning"
        />
        <StatCard
          icon={IconColumns}
          label="Depois disso"
          value={String(later.length)}
        />
        <StatCard
          icon={IconAlert}
          label="Sem prazo"
          value={String(noDeadline.length)}
        />
      </section>

      <DeadlineGroup
        title="Atrasados"
        cases={overdue}
        memberName={memberName}
        danger
      />
      <DeadlineGroup
        title="Próximos 7 dias"
        cases={upcoming}
        memberName={memberName}
      />
      <DeadlineGroup
        title="Mais adiante"
        cases={later}
        memberName={memberName}
      />
      <DeadlineGroup
        title="Casos sem prazo"
        cases={noDeadline}
        memberName={memberName}
        muted
      />
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
    <SectionCard flush title={title} actions={<Tag>{cases.length}</Tag>}>
      {cases.length === 0 ? (
        <EmptyState title="Nada nesta fila." />
      ) : (
        <div className="divide-y divide-line">
          {cases.map((item) => (
            <Link
              key={item.id}
              href={`/law/${item.id}`}
              className="nav-item grid gap-3 px-5 py-4 hover:bg-brand-50 sm:grid-cols-[minmax(0,1fr)_11rem_11rem] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink">
                  {item.title}
                </p>
                <p className="mt-1 truncate text-xs font-bold text-ink-muted">
                  {item.area ?? "Área não informada"}
                </p>
              </div>
              <span className="text-xs font-bold text-ink-muted">
                {item.responsible_id
                  ? (memberName.get(item.responsible_id) ?? "Sem nome")
                  : "Sem responsável"}
              </span>
              <span
                className={
                  "text-xs font-black " +
                  (danger
                    ? "text-danger-600"
                    : muted
                      ? "text-ink-muted"
                      : "text-brand-700")
                }
              >
                {item.next_deadline_at
                  ? new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(item.next_deadline_at))
                  : "Sem prazo definido"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function AccessDenied() {
  return (
    <SectionCard className="max-w-xl">
      <PageHeader
        eyebrow="Acesso restrito"
        title="Seu cargo não acessa prazos jurídicos."
      />
    </SectionCard>
  );
}

function NotLawOffice() {
  return (
    <SectionCard className="max-w-xl">
      <PageHeader title="Prazos jurídicos disponíveis no workspace de advocacia." />
      <Link href="/dashboard" className="btn mt-4">
        Voltar ao painel
      </Link>
    </SectionCard>
  );
}
