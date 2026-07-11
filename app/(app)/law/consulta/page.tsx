import Link from "next/link";
import { canViewLegal } from "@/lib/law-office";
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
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
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
        <Link href="/dashboard" className="btn mt-4">
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
    <div className="space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/law"
            className="nav-item inline-flex items-center gap-2 text-sm font-black text-ink-muted hover:text-brand-700"
          >
            <IconArrowRight className="h-4 w-4 rotate-180" />
            Voltar para casos
          </Link>
          <h1 className="mt-3 text-[clamp(1.7rem,5vw,3.1rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
            Consultar processo
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ink-soft">
            Busque dados oficiais de um processo (DataJud, CNJ) por tribunal e número — antes mesmo de abrir caso, pra
            ver classe, órgão julgador e movimentações.
          </p>
        </div>
      </header>

      <DatajudSearchForm />
    </div>
  );
}
