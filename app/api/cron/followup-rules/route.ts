import { computeFollowupCandidates, type DealForFollowup, type FollowupRule } from "@/lib/followup";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Mesmo esquema de autenticação dos outros crons (Vercel injeta
// "Authorization: Bearer <CRON_SECRET>"). Não está agendado em
// vercel.json de propósito — deal_followup_rules começa vazia pra toda
// organização (não existe UI de criar regra ainda, isso é 3.2), então
// agendar isso agora seria ligar uma automação que ninguém pode configurar
// ainda. Rodar manualmente (ou registrar no vercel.json) é decisão do
// operador quando o item vier a ter uma UI de configuração.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: rules } = await admin
    .from("deal_followup_rules")
    .select("id, org_id, workspace_key, pipeline_id, stage_key, inactivity_days, active")
    .eq("active", true);
  if (!rules || rules.length === 0) {
    return Response.json({ orgsWithRules: 0, tasksCreated: 0 });
  }

  const orgWorkspacePairs = Array.from(new Set(rules.map((r) => `${r.org_id}:${r.workspace_key}`)));
  let tasksCreated = 0;

  for (const pair of orgWorkspacePairs) {
    const [orgId, workspaceKey] = pair.split(":");
    const orgRules: FollowupRule[] = rules
      .filter((r) => r.org_id === orgId && r.workspace_key === workspaceKey)
      .map((r) => ({
        id: r.id as string,
        pipelineId: r.pipeline_id as string | null,
        stageKey: r.stage_key as string | null,
        inactivityDays: r.inactivity_days as number,
        active: true,
      }));

    const { data: deals } = await admin
      .from("deals")
      .select("id, title, contact_id, pipeline_id, stage, owner_id, assignee_id, created_at")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .not("stage", "in", "(ganho,perdido)");
    if (!deals || deals.length === 0) continue;

    const dealIds = deals.map((d) => d.id as string);
    const contactIds = Array.from(new Set(deals.map((d) => d.contact_id as string | null).filter(Boolean))) as string[];

    const [{ data: interactions }, { data: openFollowupTasks }] = await Promise.all([
      contactIds.length > 0
        ? admin.from("interactions").select("contact_id, created_at").in("contact_id", contactIds)
        : Promise.resolve({ data: [] as { contact_id: string; created_at: string }[] }),
      admin.from("tasks").select("deal_id").eq("done", false).eq("source", "followup_rule").in("deal_id", dealIds),
    ]);

    const lastInteractionByContact = new Map<string, string>();
    for (const interaction of interactions ?? []) {
      const current = lastInteractionByContact.get(interaction.contact_id as string);
      if (!current || (interaction.created_at as string) > current) {
        lastInteractionByContact.set(interaction.contact_id as string, interaction.created_at as string);
      }
    }
    const dealsWithOpenFollowup = new Set((openFollowupTasks ?? []).map((t) => t.deal_id as string));

    const dealsForFollowup: DealForFollowup[] = deals.map((d) => {
      const contactId = d.contact_id as string | null;
      const lastActivityAt = (contactId && lastInteractionByContact.get(contactId)) || (d.created_at as string);
      return {
        id: d.id as string,
        title: d.title as string,
        contactId,
        pipelineId: d.pipeline_id as string | null,
        stage: d.stage as string,
        lastActivityAt,
        hasOpenFollowupTask: dealsWithOpenFollowup.has(d.id as string),
      };
    });

    const candidates = computeFollowupCandidates(orgRules, dealsForFollowup);
    for (const { deal, rule } of candidates) {
      const original = deals.find((d) => d.id === deal.id);
      const ownerId = (original?.assignee_id as string | null) ?? (original?.owner_id as string);
      const { error } = await admin.from("tasks").insert({
        owner_id: ownerId,
        org_id: orgId,
        workspace_key: workspaceKey,
        contact_id: deal.contactId,
        deal_id: deal.id,
        title: `Retomar contato — ${deal.title}`,
        due_at: new Date().toISOString(),
        source: "followup_rule",
        source_rule_id: rule.id,
      });
      if (error) {
        logError("cron.followup-rules", error, { dealId: deal.id });
        continue;
      }
      tasksCreated++;
    }
  }

  return Response.json({ orgsWithRules: orgWorkspacePairs.length, tasksCreated });
}
