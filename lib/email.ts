import { Resend } from "resend";
import { logError } from "@/lib/logger";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (resendClient) return resendClient;
  if (!process.env.RESEND_API_KEY) return null;
  resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  const from = process.env.RESEND_FROM_EMAIL || "OtimizIA <avisos@useotimizia.com>";
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) {
    logError("email.send-failed", error, { to, subject });
    return false;
  }
  return true;
}

function emailShell(preheader: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917;">
    <span style="display:none;">${preheader}</span>
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e7e5e4;">
      ${bodyHtml}
      <p style="margin-top:28px;font-size:12px;color:#78716c;">
        Você está recebendo isso porque ativou avisos por e-mail no OtimizIA.
        Pode desativar a qualquer momento em Configurações → Notificações.
      </p>
    </div>
  </body>
</html>`;
}

export function dailySummaryEmail(params: {
  overdueCount: number;
  todayCount: number;
  siteUrl: string;
}): { subject: string; html: string } {
  const parts: string[] = [];
  if (params.overdueCount > 0) {
    parts.push(`<strong>${params.overdueCount} ${params.overdueCount === 1 ? "atrasado" : "atrasados"}</strong>`);
  }
  if (params.todayCount > 0) {
    parts.push(`<strong>${params.todayCount}</strong> para hoje`);
  }
  const subject =
    params.overdueCount > 0
      ? `Você tem ${params.overdueCount} ${params.overdueCount === 1 ? "retorno atrasado" : "retornos atrasados"}`
      : "Seus retornos de hoje";

  return {
    subject,
    html: emailShell(
      subject,
      `<p style="font-size:15px;line-height:1.5;">Bom dia! Hoje você tem ${parts.join(" e ")} esperando resposta.</p>
      <a href="${params.siteUrl}/tasks" style="display:inline-block;margin-top:16px;background:#7c3aed;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;font-size:14px;">Ver meus lembretes</a>`
    ),
  };
}

export function stalledDealEmail(params: {
  deals: { title: string; contactName: string | null }[];
  siteUrl: string;
}): { subject: string; html: string } {
  const subject =
    params.deals.length === 1
      ? "Uma venda está parada há alguns dias"
      : `${params.deals.length} vendas estão paradas há alguns dias`;
  const items = params.deals
    .slice(0, 10)
    .map(
      (d) =>
        `<li style="margin-bottom:4px;">${escapeHtml(d.title)}${d.contactName ? ` — ${escapeHtml(d.contactName)}` : ""}</li>`
    )
    .join("");

  return {
    subject,
    html: emailShell(
      subject,
      `<p style="font-size:15px;line-height:1.5;">Sem retorno registrado há mais de 5 dias:</p>
      <ul style="font-size:14px;padding-left:20px;">${items}</ul>
      <a href="${params.siteUrl}/pipeline" style="display:inline-block;margin-top:16px;background:#7c3aed;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;font-size:14px;">Ver o funil</a>`
    ),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// 2.1 (Fase 2): e-mail do corretor para o cliente final — não é uma
// notificação interna do produto (emailShell acima), por isso não usa o
// rodapé "você ativou avisos no OtimizIA". O opt-out aqui é uma linha
// simples pedindo pra responder avisando, mediado por humano — ainda não
// existe um link de descadastro de um clique (precisaria de um token
// público, no mesmo espírito de real_estate_public_page_token; fica como
// lacuna documentada em docs/roadmap-imobiliario/2.1-email-integrado.md).
export function contactMessageEmail(bodyText: string, senderName: string): string {
  const paragraphs = bodyText
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p style="font-size:15px;line-height:1.6;margin:0 0 12px;">${escapeHtml(line)}</p>`)
    .join("");
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e7e5e4;">
      ${paragraphs}
      <p style="margin-top:24px;font-size:13px;color:#78716c;">— ${escapeHtml(senderName)}</p>
      <p style="margin-top:20px;font-size:11px;color:#a8a29e;">
        Se preferir não receber mais e-mails, responda avisando.
      </p>
    </div>
  </body>
</html>`;
}
