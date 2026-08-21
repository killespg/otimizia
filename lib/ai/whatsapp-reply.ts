import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

const MODEL = "claude-sonnet-5";
const HISTORY_LIMIT = 10;
const MAX_MESSAGE_CHARS = 4000;

export type WhatsappHistoryMessage = { role: "user" | "assistant"; content: string };

type OrganizationAiContext = {
  name: string | null;
  business_context: string | null;
  ai_tone: string | null;
  ai_instructions: string | null;
};

// Histórico recente formatado pra Claude — usado tanto pela resposta
// automática quanto pela detecção de intenção de compra, pra não repetir a
// consulta nem a lógica de montagem em cada lugar que precisa dele.
export async function fetchWhatsappHistory(
  supabase: SupabaseClient,
  conversationId: string
): Promise<WhatsappHistoryMessage[]> {
  const { data: recentMessages } = await supabase
    .from("whatsapp_messages")
    .select("direction, content, sent_by")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  return (recentMessages ?? [])
    .slice()
    .reverse()
    .filter((message) => message.content)
    .map((message) => ({
      role: message.direction === "inbound" ? ("user" as const) : ("assistant" as const),
      content: String(message.content).slice(0, MAX_MESSAGE_CHARS),
    }));
}

// Resposta automática de uma conversa de WhatsApp: histórico recente (mesma
// janela do que app/api/assistant/route.ts usa pro chat interno) + contexto
// da organização, sem ferramentas — é uma qualificação/atendimento
// conversacional, não um agente que opera o CRM.
export async function generateWhatsappReply(
  supabase: SupabaseClient,
  orgId: string,
  history: WhatsappHistoryMessage[],
  contactName: string | null,
  options?: { workspaceKey?: string | null; lawyerName?: string | null },
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    // Não há mensagem nova do contato pra responder (segurança extra —
    // o chamador já garante isso, mas evita gastar uma chamada à toa).
    return null;
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("name, business_context, ai_tone, ai_instructions")
    .eq("id", orgId)
    .maybeSingle();

  const client = new Anthropic();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(organization, contactName, options),
    messages: history,
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return text || null;
}

function buildSystemPrompt(
  organization: OrganizationAiContext | null,
  contactName: string | null,
  options?: { workspaceKey?: string | null; lawyerName?: string | null },
): string {
  const businessName = organization?.name ?? "a empresa";
  const contextLines = [
    organization?.business_context ? `Contexto da empresa: ${organization.business_context}` : "",
    organization?.ai_tone ? `Jeito de falar preferido: ${organization.ai_tone}` : "",
    organization?.ai_instructions ? `Instruções internas: ${organization.ai_instructions}` : "",
  ].filter(Boolean);

  if (options?.workspaceKey === "law_office") {
    const lawyer = options.lawyerName?.trim() || "o advogado responsável";
    const lawyerLabel = lawyer === "o advogado responsável" ? lawyer : `Dr. ${lawyer.split(/\s+/)[0]}`;
    return `Você é o Tim, paralegal digital do escritório ${businessName}. Está no WhatsApp com ${contactName ?? "alguém que procurou ajuda jurídica"}.

${contextLines.length > 0 ? contextLines.join("\n") + "\n" : ""}
Como conversar:
- Português do Brasil, humano, empático. Escute a dor primeiro. Frases curtas, como no WhatsApp.
- Se esta for a primeira resposta da conversa, abra no espírito de: "Olá! Seja muito bem-vindo. Sou o Tim, assistente aqui do escritório. Me conte, o que aconteceu para você procurar ajuda jurídica hoje?"
- Uma pergunta por vez. Nunca mande lista, formulário ou bloco longo de perguntas.
- Nunca use as palavras lead, prospect ou telemarketing. A pessoa é um possível cliente.
- Não invente tese jurídica, valor de honorários, prazo processual nem resultado. Se não souber, diga que o advogado confirma.
- Nunca use markdown. Texto corrido.
- Quando já tiver entendido o que aconteceu, a área do direito e se é urgente — ou se a pessoa citar prazo, audiência, juiz, prisão ou liminar — faça o passe de bastão de forma natural: "Entendi perfeitamente os detalhes. Vou repassar o seu caso agora mesmo para ${lawyerLabel}, que vai analisar a situação e te dar um retorno por aqui em instantes, ok?"
- Depois do passe de bastão, não continue a triagem.`;
  }

  return `Você atende o WhatsApp de ${businessName}, conversando com ${contactName ?? "um cliente"} que acabou de mandar uma mensagem.

${contextLines.length > 0 ? contextLines.join("\n") + "\n" : ""}
Como conversar:
- Português do Brasil, natural, como uma pessoa de verdade — frases curtas, sem formalidade de call center.
- Nunca diga que é uma IA, robô ou assistente virtual.
- Qualifique o interesse do contato e ajude a avançar a conversa (entender o que ele precisa, oferecer o próximo passo), sem inventar preços, prazos ou informações que você não tem.
- Se a pergunta exigir algo que você não sabe (preço exato, disponibilidade, dado interno), diga que vai verificar e volta, em vez de inventar.
- Nunca use markdown (sem **negrito**, listas com "-", headings). Texto corrido normal, como no WhatsApp.
- Uma mensagem por resposta, direta ao ponto.`;
}
