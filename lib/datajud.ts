// Cliente da API Pública do DataJud (CNJ) — metadados processuais oficiais,
// gratuitos, cobrindo praticamente todos os tribunais do Brasil.
// Doc: https://datajud-wiki.cnj.jus.br/api-publica/
//
// A chave pública é compartilhada por todo mundo (não é uma credencial da
// nossa aplicação) — o CNJ avisa que pode trocá-la a qualquer momento, por
// isso fica em env var (DATAJUD_API_KEY) em vez de hardcoded, pra atualizar
// sem precisar mexer no código.

const DATAJUD_BASE_URL = "https://api-publica.datajud.cnj.jus.br";

export class DatajudApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "DatajudApiError";
  }
}

export type DatajudMovimento = {
  codigo: number;
  nome: string;
  dataHora: string;
};

export type DatajudProcess = {
  numeroProcesso: string;
  dataAjuizamento: string | null;
  classe: { codigo: number; nome: string } | null;
  orgaoJulgador: { nome: string } | null;
  movimentos: DatajudMovimento[];
};

// Normaliza pro formato que a API espera: só dígitos, sem
// pontuação/hífen/barra (ex: "0000832-35.2018.4.01.3202" -> 20 dígitos).
export function normalizeProcessNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

// Datas do DataJud nem sempre são um ISO 8601 válido — usado em todo lugar
// que precisa comparar/formatar dataHora antes de confiar nela.
export function isValidDate(value: string | null | undefined): value is string {
  return Boolean(value) && !Number.isNaN(new Date(value as string).getTime());
}

export function latestMovimento(movimentos: DatajudMovimento[]): DatajudMovimento | null {
  const withValidDate = movimentos.filter((m) => isValidDate(m.dataHora));
  if (withValidDate.length === 0) return null;
  return withValidDate.reduce((latest, current) =>
    new Date(current.dataHora).getTime() > new Date(latest.dataHora).getTime() ? current : latest
  );
}

const MAX_ATTEMPTS = 4;
// Status que valem retry: 429 (fila cheia, o "es_rejected_execution_exception"
// que motivou isso) e 5xx (instabilidade momentânea do serviço do CNJ).
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, init);
    if (response.ok || !RETRYABLE_STATUS.has(response.status) || attempt === MAX_ATTEMPTS) {
      return response;
    }
    lastResponse = response;
    // Backoff exponencial com jitter — a fila do DataJud costuma liberar em
    // poucos segundos, não faz sentido tentar de novo instantaneamente.
    const backoffMs = 500 * 2 ** (attempt - 1) + Math.random() * 300;
    await sleep(backoffMs);
  }
  return lastResponse!;
}

export async function searchDatajudProcess(
  tribunalAlias: string,
  numeroProcessoRaw: string
): Promise<DatajudProcess | null> {
  const apiKey = process.env.DATAJUD_API_KEY;
  if (!apiKey) {
    throw new DatajudApiError("DATAJUD_API_KEY não configurada no servidor.");
  }
  const numeroProcesso = normalizeProcessNumber(numeroProcessoRaw);
  if (numeroProcesso.length !== 20) {
    throw new DatajudApiError("Número de processo inválido — o formato CNJ tem 20 dígitos.");
  }

  const response = await fetchWithRetry(`${DATAJUD_BASE_URL}/api_publica_${tribunalAlias}/_search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `APIKey ${apiKey}`,
    },
    body: JSON.stringify({ query: { match: { numeroProcesso } } }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const friendly =
      response.status === 429
        ? "O DataJud está sobrecarregado agora (fila cheia do lado deles). Tentei de novo algumas vezes automaticamente, mas ainda não conseguiu — tente novamente em instantes."
        : `DataJud respondeu ${response.status} para ${tribunalAlias}: ${body.slice(0, 300)}`;
    throw new DatajudApiError(friendly, response.status);
  }
  const data = await response.json();
  const hit = data?.hits?.hits?.[0]?._source;
  if (!hit) return null;

  return {
    numeroProcesso: hit.numeroProcesso,
    dataAjuizamento: hit.dataAjuizamento ?? null,
    classe: hit.classe ? { codigo: hit.classe.codigo, nome: hit.classe.nome } : null,
    orgaoJulgador: hit.orgaoJulgador ? { nome: hit.orgaoJulgador.nome } : null,
    movimentos: Array.isArray(hit.movimentos)
      ? hit.movimentos
          .filter((m: unknown) => m && typeof m === "object")
          .map((m: any) => ({ codigo: m.codigo, nome: m.nome, dataHora: m.dataHora }))
      : [],
  };
}
