import { generateContactSummary } from "@/lib/ai/contact-summary";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { logError } from "@/lib/logger";
import { getActiveOrgId } from "@/lib/org";
import { getUserPlanAccess } from "@/lib/plan-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildContactTimeline } from "@/lib/timeline";
import { getWorkspaceKey } from "@/lib/workspaces";

export const runtime = "nodejs";
export const maxDuration = 30;

// 4.2 (Fase 4): resumo e preparação de atendimento. Busca a mesma timeline
// já usada em app/(app)/contacts/[id]/page.tsx (1.2) — nenhuma fonte de
// dado nova, só uma leitura de IA em cima do que já existe.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(createAdminClient(), "contact_summary", user.id);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Muitos resumos em pouco tempo. Espere um pouco e tente de novo." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const access = await getUserPlanAccess(supabase, user.id);
  if (!access.hasAccess) {
    return Response.json({ error: "Seu teste grátis acabou." }, { status: 402 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY não configurada no servidor." }, { status: 500 });
  }

  let contactId: string;
  try {
    const body = await req.json();
    contactId = String(body?.contactId ?? "");
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!contactId) {
    return Response.json({ error: "Contato é obrigatório." }, { status: 400 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);
  const { data: profile } = await supabase.from("profiles").select("profession_type, is_admin").eq("id", user.id).maybeSingle();
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type, profile?.is_admin ?? false);

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("id", contactId)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  if (!contact) {
    return Response.json({ error: "Contato não encontrado." }, { status: 404 });
  }

  const isRealEstate = workspaceKey === "real_estate_broker";
  const [{ data: interactions }, { data: tasks }, { data: callLogs }, { data: emailLogs }, { data: visits }, { data: offers }] =
    await Promise.all([
      supabase.from("interactions").select("id, body, created_at").eq("contact_id", contactId).eq("org_id", orgId),
      supabase.from("tasks").select("id, title, due_at, done, created_at").eq("contact_id", contactId).eq("org_id", orgId),
      supabase.from("call_logs").select("id, duration_minutes, outcome, next_step, created_at").eq("contact_id", contactId).eq("org_id", orgId),
      supabase.from("email_logs").select("id, subject, status, created_at").eq("contact_id", contactId).eq("org_id", orgId),
      isRealEstate
        ? supabase.from("real_estate_visits").select("id, status, scheduled_at, completed_at, created_at").eq("contact_id", contactId).eq("org_id", orgId)
        : Promise.resolve({ data: [] as { id: string; status: string; scheduled_at: string | null; completed_at: string | null; created_at: string }[] }),
      isRealEstate
        ? supabase.from("real_estate_offers").select("id, status, amount_cents, sent_at, created_at").eq("contact_id", contactId).eq("org_id", orgId)
        : Promise.resolve({ data: [] as { id: string; status: string; amount_cents: number; sent_at: string | null; created_at: string }[] }),
    ]);

  const timeline = buildContactTimeline({
    interactions: interactions ?? [],
    tasks: tasks ?? [],
    calls: callLogs ?? [],
    emails: emailLogs ?? [],
    visits: visits ?? [],
    offers: offers ?? [],
  });

  if (timeline.length === 0) {
    return Response.json({ error: "Este contato ainda não tem nada na linha do tempo pra resumir." }, { status: 400 });
  }

  try {
    const summary = await generateContactSummary(contact.name, timeline);
    if (!summary) {
      return Response.json({ error: "Não consegui gerar o resumo agora. Tenta de novo." }, { status: 502 });
    }
    return Response.json({ summary, timeline });
  } catch (error) {
    logError("api/ai/contact-summary", error, { userId: user.id, orgId, contactId });
    return Response.json({ error: "Algo deu errado ao gerar o resumo." }, { status: 500 });
  }
}
