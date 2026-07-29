import { sendEmail, welcomeEmail } from "@/lib/email";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

// Duração do teste grátis criada em handle_new_user (migration 0069).
const TRIAL_DAYS = 30;

// Envia o e-mail de boas-vindas uma única vez por conta. A garantia não é o
// "if" daqui e sim o UPDATE condicional: quem consegue marcar
// welcome_email_sent_at (que só estava null uma vez) é quem envia. Dois
// cliques simultâneos em "concluir onboarding" só produzem um e-mail.
export async function sendWelcomeEmailOnce(userId: string, siteUrl: string): Promise<void> {
  const admin = createAdminClient();

  const { data: claimed, error: claimError } = await admin
    .from("profiles")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq("id", userId)
    .is("welcome_email_sent_at", null)
    .select("name, email")
    .maybeSingle();

  if (claimError) {
    logError("welcome-email.claim-failed", claimError, { userId });
    return;
  }
  if (!claimed?.email) return;

  const { subject, html } = welcomeEmail({
    name: claimed.name,
    siteUrl,
    trialDays: TRIAL_DAYS,
  });

  const sent = await sendEmail(claimed.email, subject, html, "human");
  if (!sent) {
    // Devolve a marca para que a próxima oportunidade tente de novo, em vez de
    // a pessoa nunca receber porque o Resend estava fora do ar por um minuto.
    await admin.from("profiles").update({ welcome_email_sent_at: null }).eq("id", userId);
  }
}
