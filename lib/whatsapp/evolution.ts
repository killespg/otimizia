import { evolutionWebhookSecret } from "@/lib/whatsapp/evolution-webhook";

// Cliente mínimo para a Evolution API (self-hosted). Contrato do v2:
// - POST /instance/create -> { qrcode: { base64 } }, aceita webhook inline
// - GET  /instance/connectionState/{instance} -> { instance: { state } }
// - POST /message/sendText/{instance} -> { number, text }
// Se a instância do VPS estiver numa versão com contrato diferente, o ajuste
// fica isolado aqui — nenhuma outra camada da aplicação conhece esse shape.

export type EvolutionConnectionState = "open" | "close" | "connecting";

class EvolutionApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "EvolutionApiError";
  }
}

function baseUrl() {
  const url = process.env.EVOLUTION_API_URL;
  if (!url) throw new EvolutionApiError("EVOLUTION_API_URL não configurada no servidor.");
  return url.replace(/\/+$/, "");
}

function apiKey() {
  const key = process.env.EVOLUTION_API_KEY;
  if (!key) throw new EvolutionApiError("EVOLUTION_API_KEY não configurada no servidor.");
  return key;
}

async function evolutionFetch(path: string, init: RequestInit) {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey(),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new EvolutionApiError(
      `Evolution API respondeu ${response.status} em ${path}: ${body.slice(0, 300)}`,
      response.status
    );
  }
  return response.json();
}

export async function createEvolutionInstance(
  instanceName: string,
  webhookUrl: string
): Promise<{ qrcodeBase64: string | null }> {
  const data = await evolutionFetch("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: {
        enabled: true,
        url: webhookUrl,
        headers: {
          Authorization: `Bearer ${evolutionWebhookSecret()}`,
        },
        events: ["MESSAGES_UPSERT"],
      },
    }),
  });
  return { qrcodeBase64: data?.qrcode?.base64 ?? null };
}

export async function getEvolutionConnectionState(
  instanceName: string
): Promise<EvolutionConnectionState> {
  const data = await evolutionFetch(`/instance/connectionState/${instanceName}`, {
    method: "GET",
  });
  const state = data?.instance?.state;
  return state === "open" || state === "connecting" ? state : "close";
}

export async function sendEvolutionText(
  instanceName: string,
  number: string,
  text: string
): Promise<void> {
  await evolutionFetch(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number, text }),
  });
}

// POST /message/sendMedia/{instance} -> { number, mediatype, media, caption }
// `media` aceita URL ou base64. Para anexos do inbox enviamos base64 direto:
// nenhuma URL pública temporária ou permanente precisa existir.
export async function sendEvolutionMedia(
  instanceName: string,
  number: string,
  media: string,
  caption?: string
): Promise<void> {
  await evolutionFetch(`/message/sendMedia/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number,
      mediatype: "image",
      media,
      ...(caption ? { caption } : {}),
    }),
  });
}

// POST /chat/fetchProfilePictureUrl/{instance} -> { wuid, profilePictureUrl }
// Contato sem foto, número que a instância ainda não sincronizou, ou a
// própria Evolution fora do ar: qualquer um desses casos é normal (nem todo
// número tem foto pública) — devolve null em vez de propagar erro, pra não
// travar quem chamou (criação de conversa/contato) por causa de um avatar.
export async function fetchEvolutionProfilePicture(
  instanceName: string,
  number: string
): Promise<string | null> {
  try {
    const data = await evolutionFetch(`/chat/fetchProfilePictureUrl/${instanceName}`, {
      method: "POST",
      body: JSON.stringify({ number }),
    });
    return typeof data?.profilePictureUrl === "string" ? data.profilePictureUrl : null;
  } catch {
    return null;
  }
}

export type EvolutionMessageRecord = {
  id: string;
  key: {
    id: string;
    fromMe: boolean;
    remoteJid: string;
    remoteJidAlt?: string;
  };
  pushName: string | null;
  message: unknown;
  messageTimestamp: number;
};

// Histórico já sincronizado internamente pela Evolution (Baileys guarda uma
// cópia local do WhatsApp conectado) — usado pra importar as conversas de um
// número que já tinha uso antes de conectar no OtimizIA. page/offset é o
// contrato real da instância (não bate com o "take/skip" documentado).
export async function findEvolutionMessages(
  instanceName: string,
  page: number,
  offset: number
): Promise<{ records: EvolutionMessageRecord[]; total: number; pages: number }> {
  const data = await evolutionFetch(`/chat/findMessages/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ page, offset }),
  });
  return {
    records: data?.messages?.records ?? [],
    total: data?.messages?.total ?? 0,
    pages: data?.messages?.pages ?? 0,
  };
}

export { EvolutionApiError };
