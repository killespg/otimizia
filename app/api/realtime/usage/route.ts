import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.session_id === "string" ? body.session_id : null;
  if (!sessionId) {
    return Response.json({ error: "session_id ausente." }, { status: 400 });
  }
  const close = body?.close === true;

  // O tempo cobrado vem do relógio do banco (agora - last_heartbeat_at),
  // nunca de um valor enviado pelo cliente — veja checkpoint_voice_session.
  const { error } = await supabase.rpc("checkpoint_voice_session", {
    p_session_id: sessionId,
    p_close: close,
  });
  if (error) {
    logError("api/realtime/usage", error, { userId: user.id, sessionId });
    return Response.json({ error: "Nao consegui registrar o uso." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
