import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/app-ui";
import { canManageLegal, canViewLegal } from "@/lib/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconArrowRight } from "../../icons";
import { DatajudSearchForm } from "./DatajudSearchForm";

export default async function DatajudSearchPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase
      .from("profiles")
      .select("profession_type, is_admin, favorite_tribunals")
      .eq("id", user!.id)
      .maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin,
  );
  if (workspaceKey !== "law_office") {
    return (
      <SectionCard className="max-w-xl">
        <PageHeader title="Área jurídica disponível no workspace de advocacia." />
        <Link href="/dashboard" className="btn mt-4">
          Voltar ao painel
        </Link>
      </SectionCard>
    );
  }

  const [orgRole, { data: membership }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase
      .from("organization_members")
      .select("job_role")
      .eq("org_id", orgId)
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);
  if (!canViewLegal(membership?.job_role, orgRole === "admin")) {
    return (
      <SectionCard className="max-w-xl">
        <PageHeader
          eyebrow="Acesso restrito"
          title="Sua função não acessa casos jurídicos."
        />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        navigation={
          <Link
            href="/law"
            className="nav-item inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <IconArrowRight className="h-4 w-4 rotate-180" />
            Voltar para casos
          </Link>
        }
        eyebrow="DataJud · CNJ"
        title="Consultar processo"
        description="Busque dados oficiais por tribunal e número antes mesmo de abrir o caso, para consultar classe, órgão julgador e movimentações."
      />

      <DatajudSearchForm
        initialFavorites={profile?.favorite_tribunals ?? []}
        canManage={canManageLegal(membership?.job_role, orgRole === "admin")}
      />
    </div>
  );
}
