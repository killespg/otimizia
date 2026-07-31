import Link from "next/link";
import { canViewFinance } from "@/lib/law/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { JobRole } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { IconArrowRight } from "../../icons";
import { FinanceCsvImporter } from "./FinanceCsvImporter";

export default async function FinanceImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId(supabase, user!.id);
  const [{ data: profile }, orgRole, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").eq("id", user!.id).maybeSingle(),
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user?.user_metadata?.profession_type, profile?.is_admin);
  if (workspaceKey !== "law_office") {
    return (
      <section className="panel max-w-xl p-6">
        <h1 className="text-2xl font-black text-ink">Importação financeira disponível no workspace de advocacia.</h1>
        <Link href="/painel" className="btn mt-4">
          Voltar ao painel
        </Link>
      </section>
    );
  }
  const isAdmin = orgRole === "admin";
  const jobRole = (membership?.job_role as JobRole | undefined) ?? "staff";
  if (!canViewFinance(jobRole, isAdmin)) {
    return (
      <section className="panel max-w-xl p-6">
        <p className="text-sm font-black text-brand-700">Acesso restrito</p>
        <h1 className="mt-2 text-2xl font-black text-ink">Seu cargo não acessa o financeiro.</h1>
        <p className="mt-2 text-sm font-medium text-ink-muted">
          Um sócio administrador pode atribuir o cargo Financeiro à sua conta.
        </p>
      </section>
    );
  }

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      <header className="enter rounded-lg border border-line bg-surface p-5 sm:p-6">
        <Link
          href="/painel/financeiro"
          className="inline-flex items-center gap-1 text-sm font-bold text-ink-muted hover:text-ink"
        >
          <IconArrowRight className="h-4 w-4 rotate-180" />
          Voltar para o financeiro
        </Link>
        <h1 className="mt-3 text-[clamp(1.4rem,5vw,2.2rem)] font-black leading-[1.05] tracking-[-0.03em] text-ink">
          Importar contas a receber via CSV
        </h1>
        <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-ink-muted">
          Suba a planilha do financeiro sempre que precisar — cada importação só adiciona linhas
          novas, sem apagar ou duplicar o que já está lançado. Cliente é casado pelo nome; se não
          achar, cria um contato novo.
        </p>
      </header>

      <FinanceCsvImporter />
    </div>
  );
}

