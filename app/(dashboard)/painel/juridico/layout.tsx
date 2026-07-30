import { notFound } from "next/navigation";
import { canViewLegal } from "@/lib/law-office";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspaces";

/**
 * Porta única da workspace jurídica.
 *
 * O workspace jurídico precisa estar ativo e o cargo precisa permitir leitura
 * antes de qualquer página filha consultar processos, documentos ou prazos.
 * As páginas continuam aplicando permissões mais restritas nas mutações.
 */
export default async function LegalWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sem sessão o proxy já redireciona para o login; aqui só não deixamos passar.
  if (!user) notFound();

  const [{ data: profile }, orgId] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_admin,profession_type")
      .eq("id", user.id)
      .maybeSingle(),
    getActiveOrgId(supabase, user.id),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user.user_metadata?.profession_type,
    profile?.is_admin,
  );
  if (workspaceKey !== "law_office") notFound();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role,job_role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (
    !membership ||
    !canViewLegal(membership.job_role, membership.role === "admin")
  ) {
    notFound();
  }

  return <>{children}</>;
}
