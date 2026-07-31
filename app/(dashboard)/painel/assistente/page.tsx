import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/lib/supabase/types";
import { AssistantPageClient } from "./AssistantPageClient";

export default async function AssistantPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name =
    typeof user?.user_metadata?.name === "string" && user.user_metadata.name
      ? user.user_metadata.name
      : (user?.email?.split("@")[0] ?? "");
  const firstName = name.trim().split(/\s+/)[0] || undefined;

  let org: Organization | null = null;
  let isAdmin = false;
  if (user) {
    const orgId = await getActiveOrgId(supabase, user.id);
    const [{ data: orgData }, role] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
      getOrgRole(supabase, orgId, user.id),
    ]);
    org = orgData as Organization | null;
    isAdmin = role === "admin";
  }

  // O resumo operacional é carregado depois que o chat já está interativo.
  // Ele é complementar e não deve atrasar a principal tarefa desta rota.
  return (
    <AssistantPageClient
      firstName={firstName}
      org={org}
      isAdmin={isAdmin}
    />
  );
}
