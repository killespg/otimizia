import { Resend } from "resend";
import { logError } from "@/lib/utils/logger";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (resendClient) return resendClient;
  if (!process.env.RESEND_API_KEY) return null;
  resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

// Dois remetentes de propósito. "human" é para e-mail que faz sentido a pessoa
// responder (convite, boas-vindas) — a resposta chega em alguém. "automated" é
// para disparo em massa e recorrente (resumo diário, alerta de venda parada):
// vai do alias noreply@, que existe justamente para não acumular respostas num
// endereço que ninguém lê e para separar a reputação de envio dos dois fluxos.
export type EmailSender = "human" | "automated";

function fromAddress(sender: EmailSender): string {
  const human = process.env.RESEND_FROM_EMAIL || "OtimizIA <avisos@useotimizia.com>";
  if (sender === "human") return human;
  return process.env.RESEND_NOREPLY_EMAIL || "OtimizIA <noreply@useotimizia.com>";
}

// O endereço vem de `profiles.email`, que aceita o que a pessoa digitou no
// cadastro. Endereço sem domínio válido ("corretor@corretor") é recusado pelo
// Resend com 422 — uma chamada de rede queimada por dia, todo dia, e um
// `email.send-failed` no log que se mistura com falha de entrega de verdade.
// A checagem é de forma, não de existência: só descarta o que nunca poderia
// ser entregue. Validar e-mail por regex "completa" é um caminho conhecido de
// falso negativo, então o critério fica no mínimo.
//
// O Resend também aceita `Nome <pessoa@dominio.com>`, mas aqui não: todo
// chamador passa um endereço puro vindo do cadastro, e um `<` no meio do que
// deveria ser só o endereço é sinal de dado sujo, não de destinatário nomeado.
export function isDeliverableAddress(value: string): boolean {
  const endereco = value.trim();
  if (endereco.length === 0 || endereco.length > 254) return false;
  if (/[\s<>,;]/.test(endereco)) return false;

  const arroba = endereco.lastIndexOf("@");
  if (arroba <= 0 || arroba === endereco.length - 1) return false;

  const dominio = endereco.slice(arroba + 1);
  // Sem ponto no domínio não existe TLD, então não há para onde entregar.
  if (!dominio.includes(".")) return false;
  if (dominio.startsWith(".") || dominio.endsWith(".") || dominio.includes("..")) return false;

  return true;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  sender: EmailSender = "automated"
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  if (!isDeliverableAddress(to)) {
    // Escopo próprio de propósito: isto é cadastro errado, não indisponibilidade
    // do provedor, e os dois pedem ações diferentes de quem lê o log.
    logError("email.invalid-address", new Error("Endereço sem formato entregável"), { to, subject });
    return false;
  }
  const { error } = await resend.emails.send({ from: fromAddress(sender), to, subject, html });
  if (error) {
    logError("email.send-failed", error, { to, subject });
    return false;
  }
  return true;
}

export function organizationInvitationEmail(params: {
  organizationName: string;
  inviterName: string;
  invitationUrl: string;
  expiresInDays: number;
}): { subject: string; html: string } {
  const organizationName = escapeHtml(params.organizationName);
  const inviterName = escapeHtml(params.inviterName);
  const invitationUrl = escapeHtml(params.invitationUrl);
  const subject = `${params.inviterName} convidou você para o OtimizIA`;

  return {
    subject,
    html: `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#151419;font-family:Arial,Helvetica,sans-serif;color:#f7f5f9;">
    <span style="display:none;">Convite para participar de ${organizationName} no OtimizIA.</span>
    <div style="max-width:520px;margin:0 auto;background:#1e1d22;padding:32px;border:1px solid rgba(255,255,255,.1);">
      <p style="margin:0 0 12px;font-size:13px;color:#a9a2b1;">OtimizIA</p>
      <h1 style="margin:0;font-size:24px;line-height:1.25;">Entre na equipe de ${organizationName}</h1>
      <p style="margin:18px 0 0;font-size:15px;line-height:1.6;color:#c9c3cf;">
        ${inviterName} convidou você para compartilhar contatos, negociações e lembretes dessa organização.
        O acesso só será ativado depois que você entrar ou criar sua conta com este mesmo e-mail.
      </p>
      <a href="${invitationUrl}" style="display:inline-block;margin-top:24px;background:#5c22e8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;font-weight:700;font-size:14px;">
        Revisar e aceitar convite
      </a>
      <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#918a97;">
        Este convite expira em ${params.expiresInDays} dias e só pode ser usado uma vez.
        Se você não esperava este e-mail, ignore-o.
      </p>
    </div>
  </body>
</html>`,
  };
}

export function welcomeEmail(params: {
  name: string | null;
  siteUrl: string;
  trialDays: number;
}): { subject: string; html: string } {
  const firstName = (params.name ?? "").trim().split(/\s+/)[0];
  const greeting = firstName ? `Boas-vindas, ${escapeHtml(firstName)}!` : "Boas-vindas!";
  const subject = "Sua conta no OtimizIA está pronta";

  return {
    subject,
    html: `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#151419;font-family:Arial,Helvetica,sans-serif;color:#f7f5f9;">
    <span style="display:none;">Três coisas para fazer nos primeiros minutos no OtimizIA.</span>
    <div style="max-width:520px;margin:0 auto;background:#1e1d22;padding:32px;border:1px solid rgba(255,255,255,.1);">
      <p style="margin:0 0 12px;font-size:13px;color:#a9a2b1;">OtimizIA</p>
      <h1 style="margin:0;font-size:24px;line-height:1.25;">${greeting}</h1>
      <p style="margin:18px 0 0;font-size:15px;line-height:1.6;color:#c9c3cf;">
        Sua conta está ativa e o teste de ${params.trialDays} dias já começou — sem cartão,
        sem cobrança automática no fim. O jeito mais rápido de sentir se o sistema serve
        para você é fazer estas três coisas hoje:
      </p>
      <ol style="margin:18px 0 0;padding-left:20px;font-size:15px;line-height:1.8;color:#c9c3cf;">
        <li>Cadastre <strong>um</strong> cliente de verdade, não um teste.</li>
        <li>Crie a negociação dele e marque o próximo retorno.</li>
        <li>Deixe o painel aberto amanhã de manhã: ele abre no que está atrasado.</li>
      </ol>
      <a href="${escapeHtml(params.siteUrl)}/painel" style="display:inline-block;margin-top:24px;background:#5c22e8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;font-weight:700;font-size:14px;">
        Abrir meu painel
      </a>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#918a97;">
        Ficou com dúvida ou faltou alguma coisa? Responda este e-mail — ele chega em uma
        pessoa, não numa caixa automática.
      </p>
    </div>
  </body>
</html>`,
  };
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
