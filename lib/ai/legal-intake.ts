import Anthropic from "@anthropic-ai/sdk";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { WhatsappHistoryMessage } from "@/lib/ai/whatsapp-reply";
import { findSensitiveLegalTerms, mergeLegalIntakeDetails } from "@/lib/law/legal-pipeline";
import { logError } from "@/lib/utils/logger";

const AREA_OPTIONS = ["Trabalhista", "Cível", "Família", "Tributário", "Criminal", "Empresarial", "Outra"] as const;
const URGENCY_OPTIONS = ["Baixa", "Média", "Alta"] as const;

export type LegalIntakeFields = {
  area?: string;
  summary?: string;
  urgency?: string;
  sensitiveTerms: string[];
};

export async function extractLegalIntake(history: WhatsappHistoryMessage[]): Promise<LegalIntakeFields> {
  const userText = history
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");
  const sensitiveTerms = findSensitiveLegalTerms(userText);
  const extracted = await extractWithModel(history);
  return {
    area: extracted.area,
    summary: extracted.summary,
    urgency: extracted.urgency,
    sensitiveTerms,
  };
}

export async function syncLegalIntakeToDeal(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  contactId: string,
  history: WhatsappHistoryMessage[],
) {
  const { data: deal } = await admin
    .from("deals")
    .select("id, details")
    .eq("org_id", orgId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!deal) return;

  const intake = await extractLegalIntake(history);
  const details = mergeLegalIntakeDetails(
    (deal.details ?? {}) as Record<string, string>,
    intake,
  );
  const { error } = await admin.from("deals").update({ details }).eq("id", deal.id);
  if (error) logError("legal-intake.deal-update-failed", error, { orgId, contactId, dealId: deal.id });
}

export async function findLawOfficeLawyerName(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
) {
  const { data: members } = await admin
    .from("organization_members")
    .select("user_id, job_role")
    .eq("org_id", orgId);
  const lawyerIds = (members ?? [])
    .filter((member) => ["owner", "managing_partner", "lawyer"].includes(String(member.job_role)))
    .map((member) => member.user_id as string);
  if (lawyerIds.length === 0) return null;
  const { data: profiles } = await admin.from("profiles").select("id, name").in("id", lawyerIds);
  const named = (profiles ?? []).find((profile) => typeof profile.name === "string" && profile.name.trim());
  return named?.name?.trim() ?? null;
}

async function extractWithModel(history: WhatsappHistoryMessage[]) {
  if (!process.env.ANTHROPIC_API_KEY) return {};
  const userText = history
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n")
    .trim();
  if (userText.length < 12) return {};

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 220,
      system: `Extraia metadados de um relato jurídico em português. Responda só um JSON: {"area":"Trabalhista|Cível|Família|Tributário|Criminal|Empresarial|Outra","summary":"uma frase","urgency":"Baixa|Média|Alta"}. Sem texto extra. Se faltar dado, omita a chave.`,
      messages: [{ role: "user", content: userText.slice(0, 4000) }],
    });
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const area = AREA_OPTIONS.find((option) => option === parsed.area);
    const urgency = URGENCY_OPTIONS.find((option) => option === parsed.urgency);
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    return {
      ...(area ? { area } : {}),
      ...(summary ? { summary } : {}),
      ...(urgency ? { urgency } : {}),
    };
  } catch (error) {
    logError("legal-intake.extract-failed", error);
    return {};
  }
}
