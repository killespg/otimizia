import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/app-ui";
import { canViewFinance } from "@/lib/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { JobRole } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconArrowRight } from "../../icons";
import { FinanceCsvImporter } from "./FinanceCsvImporter";

export default async function FinanceImportPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId(supabase, user!.id);
  const [{ data: profile }, orgRole, { data: membership }] = await Promise.all([
    supabase
      .from("profiles")
      .select("profession_type, is_admin")
      .eq("id", user!.id)
      .maybeSingle(),
    getOrgRole(supabase, orgId, user!.id),
    supabase
      .from("organization_members")
      .select("job_role")
      .eq("org_id", orgId)
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin,
  );
  if (workspaceKey !== "law_office") {
    return (
      <SectionCard className="max-w-xl">
        <PageHeader title="Importação financeira disponível no workspace de advocacia." />
        <Link href="/dashboard" className="btn mt-4">
          Voltar ao painel
        </Link>
      </SectionCard>
    );
  }
  const isAdmin = orgRole === "admin";
  const jobRole = (membership?.job_role as JobRole | undefined) ?? "staff";
  if (!canViewFinance(jobRole, isAdmin)) {
    return (
      <SectionCard className="max-w-xl">
        <PageHeader
          eyebrow="Acesso restrito"
          title="Seu cargo não acessa o financeiro."
          description="Um sócio administrador pode atribuir o cargo Financeiro à sua conta."
        />
      </SectionCard>
    );
  }

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      <PageHeader
        navigation={
          <Link
            href="/finance"
            className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <IconArrowRight className="h-4 w-4 rotate-180" />
            Voltar para o financeiro
          </Link>
        }
        eyebrow="Financeiro do escritório"
        title="Importar contas a receber via CSV"
        description="Suba a planilha do financeiro sempre que precisar — cada importação só adiciona linhas novas, sem apagar ou duplicar o que já está lançado. Cliente é casado pelo nome; se não achar, cria um contato novo."
      />

      <FinanceCsvImporter />
    </div>
  );
}
