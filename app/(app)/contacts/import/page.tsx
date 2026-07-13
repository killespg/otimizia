import Link from "next/link";
import { PageHeader } from "@/components/app-ui";
import { getActiveOrgId } from "@/lib/org";
import { getProfessionPreset } from "@/lib/professions";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceLabels } from "@/lib/workspace-preferences";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconArrowRight } from "../../icons";
import { ContactsCsvImporter } from "./ContactsCsvImporter";

export default async function ImportContactsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId(supabase, user!.id);
  const [{ data: profile }, { data: org }] = await Promise.all([
    supabase
      .from("profiles")
      .select("profession_type, is_admin")
      .eq("id", user!.id)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("workspace_preferences")
      .eq("id", orgId)
      .maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false,
  );
  const preset = getProfessionPreset(workspaceKey);
  const workspaceLabels = getWorkspaceLabels(
    preset,
    org?.workspace_preferences,
    workspaceKey,
  );

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      <PageHeader
        navigation={
          <Link
            href="/contacts"
            className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <IconArrowRight className="h-4 w-4 rotate-180" />
            Voltar para {workspaceLabels.contacts}
          </Link>
        }
        eyebrow="Importação"
        title="Importar contatos via CSV"
        description="Suba uma planilha exportada como CSV. Você escolhe qual coluna vira cada campo antes de confirmar — nada é salvo sem sua revisão."
      />

      <ContactsCsvImporter />
    </div>
  );
}
