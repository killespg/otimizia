import { notFound } from "next/navigation";
import { getActiveOrgId } from "@/lib/workspace/org";
import { canViewRealEstate } from "@/lib/real-estate/real-estate";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";

/**
 * Porta única da vertical imobiliária.
 *
 * A checagem acontece no layout antes de qualquer página filha consultar
 * contatos, imóveis ou indicadores. Ter a vertical entre as áreas disponíveis
 * não basta: ela precisa ser o workspace ativo e o cargo atual precisa permitir
 * leitura imobiliária.
 */
export default async function RealEstateAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: profile }, orgId] = await Promise.all([
    supabase
      .from("profiles")
      .select("profession_type,is_admin")
      .eq("id", user.id)
      .maybeSingle(),
    getActiveOrgId(supabase, user.id),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user.user_metadata?.profession_type,
    profile?.is_admin,
  );
  if (workspaceKey !== "real_estate_broker") notFound();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role,job_role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (
    !membership ||
    !canViewRealEstate(membership.job_role, membership.role === "admin")
  ) {
    notFound();
  }

  return <div className="real-estate-area mx-auto w-full max-w-[1600px]">{children}</div>;
}
