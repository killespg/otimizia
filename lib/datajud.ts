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

  const response = await fetch(`${DATAJUD_BASE_URL}/api_publica_${tribunalAlias}/_search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `APIKey ${apiKey}`,
    },
    body: JSON.stringify({ query: { match: { numeroProcesso } } }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new DatajudApiError(
      `DataJud respondeu ${response.status} para ${tribunalAlias}: ${body.slice(0, 300)}`,
      response.status
    );
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
