import Link from "next/link";
import { LegalDeadlineBoard } from "@/components/legal/legal-deadline-board";
import { Page, PageHeader } from "@/components/ui/surface";
import { canViewLegal } from "@/lib/law/law-office";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { LegalCase } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";

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
    <Page>
      <PageHeader
        eyebrow="Jurídico / Agenda e prazos"
        title="Agenda e prazos"
        description="Fila cronológica do escritório para agir antes que um compromisso vire risco."
        actions={
          <>
          <Link
            href="/painel/juridico/prazos/calendario"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-od-border px-4 text-xs font-semibold text-od-text-2 hover:border-od-border-hover hover:bg-od-surface-hover hover:text-white"
          >
            Ver calendário
          </Link>
          <Link
            href="/painel/juridico/processos"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-od-accent px-4 text-[13px] font-semibold text-white hover:bg-od-accent-hover"
          >
            Ver carteira de casos
          </Link>
          </>
        }
      />
      <LegalDeadlineBoard
        overdue={overdue}
        upcoming={upcoming}
        later={later}
        noDeadline={noDeadline}
        memberName={memberName}
      />
    </Page>
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
