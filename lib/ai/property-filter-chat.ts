import Anthropic from "@anthropic-ai/sdk";
import {
  REAL_ESTATE_PROPERTY_STATUSES,
  REAL_ESTATE_PROPERTY_TYPES,
  REAL_ESTATE_TRANSACTION_TYPES,
} from "@/lib/real-estate/real-estate";

const MODEL = "claude-sonnet-5";

export type FilterChatTurn = { role: "user" | "assistant"; content: string };

export type ParsedPropertyFilters = {
  resposta: string;
  status?: string;
  property_type?: string;
  transaction_type?: string;
  price_min?: number;
  price_max?: number;
  bedrooms_min?: number;
  neighborhood?: string;
};

const STATUS_VALUES = new Set<string>(REAL_ESTATE_PROPERTY_STATUSES.map((s) => s.value));
const PROPERTY_TYPE_VALUES = new Set<string>(REAL_ESTATE_PROPERTY_TYPES.map((t) => t.value));
const TRANSACTION_TYPE_VALUES = new Set<string>(REAL_ESTATE_TRANSACTION_TYPES.map((t) => t.value));

const PARSE_PROPERTY_FILTERS_TOOL: Anthropic.Tool = {
  name: "parse_property_filters",
  description:
    "Converte uma busca em linguagem natural sobre imóveis nos filtros estruturados da carteira. Só inclua um campo se a conversa realmente permitir inferir esse valor com confiança.",
  input_schema: {
    type: "object",
    properties: {
      resposta: {
        type: "string",
        description:
          "Mensagem curta e natural para o corretor: confirma o que foi entendido e aplicado, ou pergunta o que falta (ex: 'qual faixa de preço?'). Nunca mencione JSON, filtro técnico ou nome de campo.",
      },
      status: { type: "string", enum: Array.from(STATUS_VALUES) },
      property_type: { type: "string", enum: Array.from(PROPERTY_TYPE_VALUES) },
      transaction_type: { type: "string", enum: Array.from(TRANSACTION_TYPE_VALUES) },
      price_min: { type: "number", description: "Preço mínimo em reais (não em centavos)" },
      price_max: { type: "number", description: "Preço máximo em reais (não em centavos)" },
      bedrooms_min: { type: "integer", description: "Mínimo de quartos" },
      neighborhood: { type: "string", description: "Bairro, texto livre (busca parcial)" },
    },
    required: ["resposta"],
  },
};

// Chamada separada e barata (tool_choice forçado, sem thinking) — mesmo
// padrão de detectPurchaseIntent em whatsapp-intent.ts. Só interpreta texto
// livre e devolve estrutura; nunca lê nem grava nada no banco. Os campos
// devolvidos são exatamente os que app/(app)/imoveis/page.tsx já aceita via
// query string, então o widget de chat só traduz linguagem natural pra esses
// mesmos parâmetros — reaproveita o motor de busca/filtro que já existe em
// vez de duplicá-lo.
export async function parsePropertyFilters(history: FilterChatTurn[]): Promise<ParsedPropertyFilters | null> {
  if (!process.env.ANTHROPIC_API_KEY || history.length === 0) return null;

  const today = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const client = new Anthropic();
  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: buildSystemPrompt(today),
      tools: [PARSE_PROPERTY_FILTERS_TOOL],
      tool_choice: { type: "tool", name: "parse_property_filters" },
      messages: history.map((turn) => ({ role: turn.role, content: turn.content })),
    });
  } catch {
    return null;
  }

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) return null;

  return sanitizeParsedFilters(toolUse.input);
}

// Defesa em profundidade: o schema já restringe por enum, mas nunca
// confiamos cegamente num campo vindo de fora, nem mesmo de um tool_use
// input — se algo fugir do contrato, o campo é descartado, não repassado.
// Exportada só pra teste unitário (lib/ai/property-filter-chat.test.ts);
// não tem uso fora deste módulo em código de produção.
export function sanitizeParsedFilters(raw: unknown): ParsedPropertyFilters {
  const input = (raw ?? {}) as Record<string, unknown>;
  const result: ParsedPropertyFilters = {
    resposta: typeof input.resposta === "string" ? input.resposta.trim().slice(0, 400) : "",
  };

  if (typeof input.status === "string" && STATUS_VALUES.has(input.status)) result.status = input.status;
  if (typeof input.property_type === "string" && PROPERTY_TYPE_VALUES.has(input.property_type))
    result.property_type = input.property_type;
  if (typeof input.transaction_type === "string" && TRANSACTION_TYPE_VALUES.has(input.transaction_type))
    result.transaction_type = input.transaction_type;

  const priceMin = Number(input.price_min);
  if (Number.isFinite(priceMin) && priceMin >= 0) result.price_min = Math.round(priceMin);
  const priceMax = Number(input.price_max);
  if (Number.isFinite(priceMax) && priceMax >= 0) result.price_max = Math.round(priceMax);
  const bedroomsMin = Number(input.bedrooms_min);
  if (Number.isFinite(bedroomsMin) && bedroomsMin >= 0 && bedroomsMin <= 20) result.bedrooms_min = Math.round(bedroomsMin);

  if (typeof input.neighborhood === "string" && input.neighborhood.trim()) {
    result.neighborhood = input.neighborhood.trim().slice(0, 80);
  }

  return result;
}

function buildSystemPrompt(today: string): string {
  return `Você interpreta buscas em linguagem natural de um corretor de imóveis brasileiro sobre a carteira de imóveis dele, e converte em filtros estruturados pra tela de listagem. Hoje é ${today}.

Regras:
- Preencha um campo só quando a mensagem atual OU uma mensagem anterior nesta mesma conversa disser algo que dá pra mapear com confiança. Nunca invente bairro, preço, tipo de imóvel ou quartos que não foram mencionados.
- Preços em reais, não em centavos. "800 mil" = 800000. "1,2 milhão" = 1200000. "até X" define o máximo (price_max); "a partir de X" ou "acima de X" define o mínimo (price_min).
- "quartos" e "dormitórios" são sinônimos. "2 quartos" sem mais contexto normalmente significa "pelo menos 2" (bedrooms_min), não exatamente 2.
- Se a busca for vaga demais pra aplicar um filtro útil (ex: "tem algo bom pra mostrar?"), não preencha os campos de filtro e use 'resposta' pra perguntar o que falta, de forma curta.
- Isso só ajusta o filtro da tela — não cria, edita nem exclui nenhum imóvel.
- 'resposta' é a única coisa que o corretor vê: seja direto, sem "claro!", sem repetir a pergunta dele, sem markdown.`;
}
