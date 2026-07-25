import { notFound } from "next/navigation";
import { hasLegalWorkspace } from "@/lib/law-office";
import { createClient } from "@/lib/supabase/server";

/**
 * Porta única da workspace jurídica.
 *
 * Antes cada uma das nove páginas checava só `canViewLegal(job_role, orgRole
 * === "admin")`, que libera qualquer admin de organização — ou seja, qualquer
 * cliente. O primeiro fator (a workspace estar habilitada) fica aqui, uma vez,
 * e vale para as rotas aninhadas também. O segundo fator (cargo) continua em
 * cada página, porque varia: prazos e processos pedem mais que leitura.
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin,profession_type,profession_types")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !hasLegalWorkspace(profile)) notFound();

  return <>{children}</>;
}
