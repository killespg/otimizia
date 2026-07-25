import Link from "next/link";
import { canManageLegal, canViewLegal } from "@/lib/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconArrowRight } from "../../icons";
import { DatajudSearchForm } from "./DatajudSearchForm";

export default async function DatajudSearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin, favorite_tribunals").maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin
  );
  if (workspaceKey !== "law_office") {
    return (
      <section className="panel max-w-xl p-6">
        <h1 className="text-2xl font-black text-ink">Área jurídica disponível no workspace de advocacia.</h1>
        <Link href="/painel" className="btn mt-4">
          Voltar ao painel
        </Link>
      </section>
    );
  }

  const [orgRole, { data: membership }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
  ]);
  if (!canViewLegal(membership?.job_role, orgRole === "admin")) {
    return (
      <section className="panel max-w-xl p-6">
        <p className="text-sm font-black text-brand-700">Acesso restrito</p>
        <h1 className="mt-2 text-2xl font-black text-ink">Sua função não acessa casos jurídicos.</h1>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-5">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/painel/juridico/processos"
            className="inline-flex items-center gap-2 text-[11px] font-semibold text-violet-300 hover:text-violet-200"
          >
            <IconArrowRight className="h-4 w-4 rotate-180" />
            Voltar para casos
          </Link>
          <h1 className="mt-2 text-od-title text-white">
            Consultar processo
          </h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/52">
            Busque dados oficiais de um processo (DataJud, CNJ) por tribunal e número — antes mesmo de abrir caso, pra
            ver classe, órgão julgador e movimentações.
          </p>
        </div>
      </header>

      <DatajudSearchForm
        initialFavorites={profile?.favorite_tribunals ?? []}
        canManage={canManageLegal(membership?.job_role, orgRole === "admin")}
      />
    </div>
  );
}
