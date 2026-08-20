import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { PipelineWorkspace } from "./PipelineWorkspace";

export default async function PipelinePage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  if (workspaceKey === "autonomous_seller") redirect("/painel/vendas");
  return (
    <PipelineWorkspace
      returnTo="/painel/funil"
      reportHref="/painel/funil/relatorio"
    />
  );
}
