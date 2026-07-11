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

export { EvolutionApiError };
