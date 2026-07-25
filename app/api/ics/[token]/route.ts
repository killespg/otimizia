import { buildIcsFeed } from "@/lib/ics";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Feed público (sem sessão) — a segurança está no token em si (uuid
// aleatório, regenerável em Configurações), mesmo modelo de link público
// somente-leitura usado em legal_case_share_links. Usa a service role
// porque não há cookie de sessão nessa requisição (Google/Apple Calendário
// batem aqui direto, sem navegador autenticado).
export async function GET(_request: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const token = params.token;
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return new Response("Not found", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, name")
    .eq("calendar_ics_token", token)
    .maybeSingle();

  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  const { data: tasks } = await admin
    .from("tasks")
    .select("id, title, due_at, done")
    .or(`assignee_id.eq.${profile.id},owner_id.eq.${profile.id}`)
    .eq("done", false)
    .not("due_at", "is", null);

  const { data: deadlines } = await admin
    .from("legal_deadlines")
    .select("id, title, due_at, status")
    .eq("assigned_to", profile.id)
    .eq("status", "pending");

  // RE-3xx: visitas agendadas do corretor entram no mesmo feed — mesmo
  // padrão de tasks/legal_deadlines acima, só outra fonte de eventos.
  const { data: visits } = await admin
    .from("real_estate_visits")
    .select("id, scheduled_at, property_id")
    .eq("broker_id", profile.id)
    .eq("status", "scheduled")
    .not("scheduled_at", "is", null);
  const visitPropertyIds = (visits ?? []).map((v) => v.property_id as string);
  const { data: visitProperties } =
    visitPropertyIds.length > 0
      ? await admin.from("real_estate_properties").select("id, title").in("id", visitPropertyIds)
      : { data: [] };
  const visitPropertyTitle = new Map(((visitProperties ?? []) as { id: string; title: string }[]).map((p) => [p.id, p.title]));

  const events = [
    ...(tasks ?? []).map((task) => ({
      uid: `otimizia-task-${task.id}@useotimizia.com`,
      title: task.title as string,
      start: new Date(task.due_at as string),
    })),
    ...(deadlines ?? []).map((deadline) => ({
      uid: `otimizia-deadline-${deadline.id}@useotimizia.com`,
      title: `Prazo: ${deadline.title as string}`,
      start: new Date(deadline.due_at as string),
    })),
    ...(visits ?? []).map((visit) => ({
      uid: `otimizia-visit-${visit.id}@useotimizia.com`,
      title: `Visita: ${visitPropertyTitle.get(visit.property_id as string) ?? "Imóvel"}`,
      start: new Date(visit.scheduled_at as string),
    })),
  ];

  const ics = buildIcsFeed(`OtimizIA — ${profile.name ?? "Lembretes"}`, events);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="otimizia.ics"',
      "Cache-Control": "public, max-age=900",
    },
  });
}
