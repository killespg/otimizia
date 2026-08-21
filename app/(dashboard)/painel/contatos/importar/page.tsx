import Link from "next/link";
import { getActiveOrgId } from "@/lib/workspace/org";
import { getProfessionPreset } from "@/lib/people/professions";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceLabels } from "@/lib/workspace/workspace-preferences";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { IconArrowRight } from "../../icons";
import { ContactsCsvImporter } from "./ContactsCsvImporter";

export default async function ImportContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId(supabase, user!.id);
  const [{ data: profile }, { data: org }] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").eq("id", user!.id).maybeSingle(),
    supabase.from("organizations").select("workspace_preferences").eq("id", orgId).maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const preset = getProfessionPreset(workspaceKey);
  const workspaceLabels = getWorkspaceLabels(preset, org?.workspace_preferences, workspaceKey);

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      <header className="pb-5">
        <Link
          href="/contatos"
          className="inline-flex items-center gap-1 text-sm font-bold text-ink-muted hover:text-ink"
        >
          <IconArrowRight className="h-4 w-4 rotate-180" />
          Voltar para {workspaceLabels.contacts}
        </Link>
        <h1 className="mt-3 text-[clamp(1.4rem,5vw,2.2rem)] font-black leading-[1.05] tracking-[-0.03em] text-ink">
          Importar contatos via CSV
        </h1>
        <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-ink-muted">
          Suba uma planilha exportada como CSV. Você escolhe qual coluna vira cada campo antes de
          confirmar — nada é salvo sem sua revisão.
        </p>
      </header>

      <ContactsCsvImporter />
    </div>
  );
}
