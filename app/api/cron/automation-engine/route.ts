import { renderTemplate, matchesEventRuleScope } from "@/lib/automation-template";
import { contactMessageEmail, sendEmail } from "@/lib/email";
import { computeFollowupCandidates, type DealForFollowup, type FollowupRule } from "@/lib/followup";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const EVENT_BATCH_SIZE = 100;

type AutomationRule = {
  id: string;
  org_id: string;
  workspace_key: string;
  trigger_kind: "deal_created" | "deal_stage_changed" | "deal_inactive";
  trigger_params: Record<string, unknown>;
  pipeline_id: string | null;
  stage_key: string | null;
  action_type: "create_task" | "send_email" | "change_stage";
  action_params: Record<string, unknown>;
  active: boolean;
};

type DealRow = {
  id: string;
  title: string;
  contact_id: string | null;
  owner_id: string;
  assignee_id: string | null;
  org_id: string;
  workspace_key: string;
};

// Mesmo esquema de autenticação dos outros crons. Substitui
// /api/cron/followup-rules (3.1 migrou 1.4 pro motor genérico — não há
// mais duas implementações concorrentes).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  let executed = 0;
  let skipped = 0;
  let failed = 0;

  // --- Fase A: gatilhos de evento discreto (deal_created/deal_stage_changed) ---
  const { data: events } = await admin
    .from("crm_domain_events")
    .select("*")
    .in("event_type", ["deal.created", "deal.stage_changed"])
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(EVENT_BATCH_SIZE);

  for (const event of events ?? []) {
    const triggerKind = event.event_type === "deal.created" ? "deal_created" : "deal_stage_changed";
    const payload = event.payload as { deal_id: string; to_stage?: string; stage?: string };
    const dealId = payload.deal_id;

    const { data: rules } = await admin
      .from("automation_rules")
      .select("*")
      .eq("org_id", event.org_id as string)
      .eq("trigger_kind", triggerKind)
      .eq("active", true);

    const { data: deal } = await admin
      .from("deals")
      .select("id, title, contact_id, owner_id, assignee_id, org_id, workspace_key, pipeline_id")
      .eq("id", dealId)
      .maybeSingle();

    if (deal) {
      const matched = ((rules ?? []) as AutomationRule[]).filter((rule) =>
        matchesEventRuleScope(
          { pipelineId: rule.pipeline_id, stageKey: rule.stage_key },
          { pipelineId: deal.pipeline_id as string | null, stage: payload.to_stage ?? payload.stage ?? null }
        )
      );

      for (const rule of matched) {
        const { error: dedupeError } = await admin
          .from("automation_executions")
          .insert({ org_id: rule.org_id, rule_id: rule.id, event_id: event.id, deal_id: deal.id, status: "skipped" });
        if (dedupeError) {
          // unique(rule_id, event_id) já disparou pra esta regra+evento.
          continue;
        }
        const result = await executeAction(admin, rule, deal as DealRow);
        await admin
          .from("automation_executions")
          .update({ status: result.status, error_message: result.error ?? null })
          .eq("rule_id", rule.id)
          .eq("event_id", event.id);
        if (result.status === "success") executed++;
        else if (result.status === "failed") failed++;
        else skipped++;
      }
    }

    await admin.from("crm_domain_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
  }

  // --- Fase B: deal_inactive (polling, migrado de 1.4/deal_followup_rules) ---
  const { data: inactivityRules } = await admin
    .from("automation_rules")
    .select("*")
    .eq("trigger_kind", "deal_inactive")
    .eq("active", true);

  const orgWorkspacePairs = Array.from(
    new Set((inactivityRules ?? []).map((r) => `${r.org_id}:${r.workspace_key}`))
  );

  for (const pair of orgWorkspacePairs) {
    const [orgId, workspaceKey] = pair.split(":");
    const rulesForPair: FollowupRule[] = (inactivityRules as AutomationRule[])
      .filter((r) => r.org_id === orgId && r.workspace_key === workspaceKey)
      .map((r) => ({
        id: r.id,
        pipelineId: r.pipeline_id,
        stageKey: r.stage_key,
        inactivityDays: Number(r.trigger_params.inactivity_days ?? 5),
        active: true,
      }));

    const { data: deals } = await admin
      .from("deals")
      .select("id, title, contact_id, pipeline_id, stage, owner_id, assignee_id, org_id, workspace_key, created_at")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .not("stage", "in", "(ganho,perdido)");
    if (!deals || deals.length === 0) continue;

    const dealIds = deals.map((d) => d.id as string);
    const contactIds = Array.from(new Set(deals.map((d) => d.contact_id as string | null).filter(Boolean))) as string[];

    const [{ data: interactions }, { data: openAutomationTasks }] = await Promise.all([
      contactIds.length > 0
        ? admin.from("interactions").select("contact_id, created_at").in("contact_id", contactIds)
        : Promise.resolve({ data: [] as { contact_id: string; created_at: string }[] }),
      admin.from("tasks").select("deal_id").eq("done", false).eq("source", "automation_rule").in("deal_id", dealIds),
    ]);

    const lastInteractionByContact = new Map<string, string>();
    for (const interaction of interactions ?? []) {
      const current = lastInteractionByContact.get(interaction.contact_id as string);
      if (!current || (interaction.created_at as string) > current) {
        lastInteractionByContact.set(interaction.contact_id as string, interaction.created_at as string);
      }
    }
    const dealsWithOpenTask = new Set((openAutomationTasks ?? []).map((t) => t.deal_id as string));

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
        hasOpenFollowupTask: dealsWithOpenTask.has(d.id as string),
      };
    });

    const candidates = computeFollowupCandidates(rulesForPair, dealsForFollowup);
    for (const { deal, rule } of candidates) {
      const original = deals.find((d) => d.id === deal.id);
      const fullRule = (inactivityRules as AutomationRule[]).find((r) => r.id === rule.id)!;
      const result = await executeAction(admin, fullRule, {
        id: deal.id,
        title: deal.title,
        contact_id: deal.contactId,
        owner_id: original!.owner_id as string,
        assignee_id: original!.assignee_id as string | null,
        org_id: orgId,
        workspace_key: workspaceKey,
      });
      await admin.from("automation_executions").insert({
        org_id: orgId,
        rule_id: rule.id,
        deal_id: deal.id,
        status: result.status,
        error_message: result.error ?? null,
      });
      if (result.status === "success") executed++;
      else if (result.status === "failed") failed++;
      else skipped++;
    }
  }

  return Response.json({ executed, skipped, failed });
}

async function executeAction(
  admin: ReturnType<typeof createAdminClient>,
  rule: AutomationRule,
  deal: DealRow
): Promise<{ status: "success" | "failed" | "skipped"; error?: string }> {
  const vars = { deal: { title: deal.title } };

  try {
    if (rule.action_type === "create_task") {
      const titleTemplate = String(rule.action_params.title_template ?? "Retomar contato — {{deal.title}}");
      const { error } = await admin.from("tasks").insert({
        owner_id: deal.assignee_id ?? deal.owner_id,
        org_id: deal.org_id,
        workspace_key: deal.workspace_key,
        contact_id: deal.contact_id,
        deal_id: deal.id,
        title: renderTemplate(titleTemplate, vars),
        due_at: new Date().toISOString(),
        source: "automation_rule",
        source_rule_id: rule.id,
      });
      if (error) return { status: "failed", error: error.message };
      return { status: "success" };
    }

    if (rule.action_type === "send_email") {
      if (!deal.contact_id) return { status: "skipped", error: "Negócio sem contato vinculado." };
      const { data: contact } = await admin
        .from("contacts")
        .select("email, email_opt_out")
        .eq("id", deal.contact_id)
        .maybeSingle();
      if (!contact?.email || contact.email_opt_out) {
        return { status: "skipped", error: "Contato sem e-mail ou optou por não receber." };
      }
      const subjectTemplate = String(rule.action_params.subject_template ?? "Sobre {{deal.title}}");
      const bodyTemplate = String(rule.action_params.body_template ?? "Passando para falar sobre {{deal.title}}.");
      const subject = renderTemplate(subjectTemplate, vars);
      const sent = await sendEmail(contact.email, subject, contactMessageEmail(renderTemplate(bodyTemplate, vars), "Equipe"));
      await admin.from("email_logs").insert({
        org_id: deal.org_id,
        workspace_key: deal.workspace_key,
        contact_id: deal.contact_id,
        deal_id: deal.id,
        created_by: deal.owner_id,
        subject,
        status: sent ? "sent" : "failed",
      });
      return sent ? { status: "success" } : { status: "failed", error: "Falha no envio do e-mail." };
    }

    if (rule.action_type === "change_stage") {
      const toStage = String(rule.action_params.to_stage ?? "");
      if (!["novo", "em_contato", "negociacao", "ganho", "perdido"].includes(toStage)) {
        return { status: "skipped", error: "Etapa de destino inválida na regra." };
      }
      const { error } = await admin.from("deals").update({ stage: toStage }).eq("id", deal.id);
      if (error) return { status: "failed", error: error.message };
      return { status: "success" };
    }

    return { status: "skipped", error: "Tipo de ação desconhecido." };
  } catch (error) {
    logError("cron.automation-engine", error, { ruleId: rule.id, dealId: deal.id });
    return { status: "failed", error: error instanceof Error ? error.message : String(error) };
  }
}
