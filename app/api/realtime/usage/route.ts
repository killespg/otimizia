import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const seconds = Math.round(Number(body?.seconds));
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return Response.json({ ok: true });
  }

  const { error } = await supabase.rpc("increment_voice_usage", {
    p_seconds: Math.min(seconds, 3600),
  });
  if (error) {
    console.error("[api/realtime/usage]", error);
    return Response.json({ error: "Nao consegui registrar o uso." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
