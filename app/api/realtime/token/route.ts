import { createHash } from "crypto";
import { getRecentAssistantMessages } from "@/lib/ai/history";
import { logError } from "@/lib/logger";
import { getActiveOrgId } from "@/lib/org";
import { getUserPlanAccess } from "@/lib/plan-access";
import { createClient } from "@/lib/supabase/server";
import { currentYearMonth, VOICE_MONTHLY_LIMIT_SECONDS } from "@/lib/voice-limit";

export const runtime = "nodejs";

const REALTIME_MODEL = "gpt-realtime-2";

// Quantas trocas recentes do chat de texto entram no contexto da ligação —
// menos que as 30 usadas no chat (a sessão de voz só recebe isso uma vez,
// no instructions, e não pode ficar gigante).
const VOICE_HISTORY_LIMIT = 12;

type OrganizationVoiceContext = {
  name: string | null;
  business_context: string | null;
  business_priorities: string | null;
  ai_tone: string | null;
  ai_instructions: string | null;
  industry: string | null;
  region: string | null;
  team_size: string | null;
  website: string | null;
  extra_notes: string | null;
};

const BASE_INSTRUCTIONS =
  "Voce e socio do usuario no negocio dele. Converse em portugues do Brasil, com frases curtas, natural e direto. Ajude a pensar vendas, contatos, follow-up e rotina comercial. Nao diga que e IA ou modelo. Se precisar de dados do CRM que voce nao tem na chamada de voz, diga que vai precisar consultar pelo chat.";

function buildInstructions(
  recentChat: { role: "user" | "assistant"; content: string }[],
  organization: OrganizationVoiceContext | null
) {
  const orgContextLines = [
    organization?.name ? `Nome da empresa/operacao: ${organization.name}` : "",
    organization?.industry ? `Segmento/setor: ${organization.industry}` : "",
    organization?.region ? `Regiao de atuacao: ${organization.region}` : "",
    organization?.team_size ? `Tamanho da equipe: ${organization.team_size}` : "",
    organization?.website ? `Site/link: ${organization.website}` : "",
    organization?.business_context
      ? `Contexto da empresa: ${organization.business_context}`
      : "",
    organization?.business_priorities
      ? `Prioridades da empresa: ${organization.business_priorities}`
      : "",
    organization?.ai_tone ? `Jeito de falar preferido: ${organization.ai_tone}` : "",
    organization?.ai_instructions
      ? `Instrucoes internas para a IA: ${organization.ai_instructions}`
      : "",
    organization?.extra_notes ? `Outras informacoes: ${organization.extra_notes}` : "",
  ].filter(Boolean);

  const orgContext =
    orgContextLines.length > 0
      ? `\n\nContexto da empresa salvo nas configuracoes. Use para guiar tom, prioridades e proximos passos, sem repetir se nao for util:\n${orgContextLines.join("\n")}`
      : "";

  if (recentChat.length === 0) return `${BASE_INSTRUCTIONS}${orgContext}`;

  const transcript = recentChat
    .map((m) => `${m.role === "user" ? "Usuário" : "Você"}: ${m.content}`)
    .join("\n");

  return `${BASE_INSTRUCTIONS}

Antes desta ligação, vocês vinham conversando pelo chat de texto do app. Aqui está o que foi dito recentemente, pra você continuar com contexto em vez de perguntar de novo o que já foi combinado:
${transcript}${orgContext}`;
}

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

  const { data: sessionId, error: sessionError } = await supabase.rpc("start_voice_session");
  if (sessionError || !sessionId) {
    logError("api/realtime/token.start-session", sessionError, { userId: user.id });
    return Response.json(
      { error: "Nao consegui iniciar a chamada de voz agora." },
      { status: 500 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logError("api/realtime/token", new Error("OPENAI_API_KEY nao configurada no servidor."));
    return Response.json(
      { error: "Nao consegui iniciar a chamada de voz agora." },
      { status: 500 }
    );
  }

  const safetyIdentifier = createHash("sha256")
    .update(user.id)
    .digest("hex")
    .slice(0, 64);

  const orgId = await getActiveOrgId(supabase, user.id);
  const [recentChat, { data: organization }] = await Promise.all([
    getRecentAssistantMessages(supabase, user.id, orgId, VOICE_HISTORY_LIMIT),
    supabase
      .from("organizations")
      .select(
        "name, business_context, business_priorities, ai_tone, ai_instructions, industry, region, team_size, website, extra_notes"
      )
      .eq("id", orgId)
      .maybeSingle(),
  ]);

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
        instructions: buildInstructions(recentChat, organization),
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
    logError("api/realtime/token", text, { userId: user.id, status: response.status });
    return Response.json(
      { error: "Nao consegui iniciar a chamada de voz agora." },
      { status: response.status }
    );
  }

  const payload = { ...JSON.parse(text), session_id: sessionId };
  return Response.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
