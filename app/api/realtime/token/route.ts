import { createHash } from "crypto";
import { getUserPlanAccess } from "@/lib/plan-access";
import { createClient } from "@/lib/supabase/server";
import { currentYearMonth, VOICE_MONTHLY_LIMIT_SECONDS } from "@/lib/voice-limit";

export const runtime = "nodejs";

const REALTIME_MODEL = "gpt-realtime-2";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Nao autorizado." }, { status: 401 });
  }
  const access = await getUserPlanAccess(supabase, user.id);
  if (!access.hasAccess) {
    return Response.json({ error: "Seu teste gratis acabou." }, { status: 402 });
  }

  const { data: usage } = await supabase
    .from("voice_usage")
    .select("seconds_used")
    .eq("owner_id", user.id)
    .eq("year_month", currentYearMonth())
    .maybeSingle();
  if ((usage?.seconds_used ?? 0) >= VOICE_MONTHLY_LIMIT_SECONDS) {
    return Response.json(
      { error: "Você atingiu o limite de 20 minutos de chamada de voz neste mês." },
      { status: 402 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY nao configurada no servidor." },
      { status: 500 }
    );
  }

  const safetyIdentifier = createHash("sha256")
    .update(user.id)
    .digest("hex")
    .slice(0, 64);

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": safetyIdentifier,
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: REALTIME_MODEL,
        instructions:
          "Voce e socio do usuario no negocio dele. Converse em portugues do Brasil, com frases curtas, natural e direto. Ajude a pensar vendas, contatos, follow-up e rotina comercial. Nao diga que e IA ou modelo. Se precisar de dados do CRM que voce nao tem na chamada de voz, diga que vai precisar consultar pelo chat.",
        audio: {
          output: {
            voice: "marin",
          },
          input: {
            transcription: {
              model: "gpt-4o-mini-transcribe",
              language: "pt",
            },
          },
        },
      },
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error("[api/realtime/token]", text);
    return Response.json(
      { error: "Nao consegui iniciar a chamada de voz agora." },
      { status: response.status }
    );
  }

  return new Response(text, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
