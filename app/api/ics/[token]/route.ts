import { buildIcsFeed } from "@/lib/ics";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Feed público (sem sessão) — a segurança está no token em si (uuid
// aleatório, regenerável em Configurações), mesmo modelo de link público
// somente-leitura usado em legal_case_share_links. Usa a service role
// porque não há cookie de sessão nessa requisição (Google/Apple Calendário
// batem aqui direto, sem navegador autenticado).
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
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
