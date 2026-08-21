import { redirect } from "next/navigation";
import { canViewLegal } from "@/lib/law/law-office";
import { getActiveOrgId } from "@/lib/workspace/org";
import { canViewRealEstate } from "@/lib/real-estate/real-estate";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import GenericDashboard from "./_dashboard/GenericDashboard";

export default async function DashboardEntryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase
      .from("profiles")
      .select("profession_type,is_admin")
      .eq("id", user!.id)
      .maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user?.user_metadata?.profession_type, profile?.is_admin);
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role,job_role")
    .eq("org_id", orgId)
    .eq("user_id", user!.id)
    .maybeSingle();
  const isOrgAdmin = membership?.role === "admin";

  if (workspaceKey === "law_office") {
    redirect(
      canViewLegal(membership?.job_role, isOrgAdmin)
        ? "/juridico"
        : "/contatos",
    );
  }
  if (workspaceKey === "real_estate_broker") {
    redirect(
      canViewRealEstate(membership?.job_role, isOrgAdmin)
        ? "/imoveis/dashboard"
        : "/contatos",
    );
  }
  return <GenericDashboard />;
}
