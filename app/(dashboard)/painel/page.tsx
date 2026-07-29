import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspaces";
import GenericDashboard from "./_dashboard/GenericDashboard";

export default async function DashboardEntryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("profession_type,is_admin").eq("id", user!.id).maybeSingle();
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user?.user_metadata?.profession_type, profile?.is_admin);

  if (workspaceKey === "law_office") redirect("/painel/juridico");
  if (workspaceKey === "real_estate_broker") redirect("/painel/imoveis/dashboard");
  return <GenericDashboard />;
}
