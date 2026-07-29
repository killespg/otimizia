import { getBusinessSummary, listTasks } from "@/lib/ai/tools/read";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { getWorkspaceKey } from "@/lib/workspaces";
import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/lib/supabase/types";
import { AssistantPageClient } from "./AssistantPageClient";

type TaskRow = { id: string; title: string; due_at: string | null; done: boolean };

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
  let summary: { total_contatos: number; ganho_no_mes_centavos: number; lembretes_atrasados: number } | null = null;
  let overdueTasks: TaskRow[] = [];
  let todayTasks: TaskRow[] = [];

  if (user) {
    const [{ data: profile }, orgId] = await Promise.all([
      supabase.from("profiles").select("profession_type, is_admin").eq("id", user.id).maybeSingle(),
      getActiveOrgId(supabase, user.id),
    ]);
    const [{ data: orgData }, role] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
      getOrgRole(supabase, orgId, user.id),
    ]);
    org = orgData as Organization | null;
    isAdmin = role === "admin";

    const workspaceKey = getWorkspaceKey(
      profile?.profession_type,
      user.user_metadata?.profession_type,
      profile?.is_admin ?? false
    );

    try {
      const [summaryRaw, overdueRaw, todayRaw] = await Promise.all([
        getBusinessSummary(supabase, orgId, workspaceKey),
        listTasks(supabase, orgId, workspaceKey, { filtro: "atrasados" }),
        listTasks(supabase, orgId, workspaceKey, { filtro: "hoje" }),
      ]);
      summary = JSON.parse(summaryRaw);
      overdueTasks = (JSON.parse(overdueRaw).lembretes ?? []).slice(0, 5);
      todayTasks = (JSON.parse(todayRaw).lembretes ?? []).slice(0, 5);
    } catch {
      // Painel de hoje é um extra visual — se a consulta falhar, a conversa
      // com o Tim continua funcionando normalmente sem ele.
    }
  }

  return (
    <AssistantPageClient
      firstName={firstName}
      org={org}
      isAdmin={isAdmin}
      summary={summary}
      overdueTasks={overdueTasks}
      todayTasks={todayTasks}
    />
  );
}
