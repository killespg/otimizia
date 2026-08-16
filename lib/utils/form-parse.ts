// Parsers genéricos de FormData usados pelas server actions do vertical
// imobiliário (app/(app)/imoveis/actions.ts e match-actions.ts) — extraído
// pra cá na Fase 1 (RE-1xx) quando um segundo arquivo de actions passou a
// precisar dos mesmos parsers de dinheiro/número/uuid.
export function text(v: FormDataEntryValue | null, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > max ? s.slice(0, max) : s;
}

export function requiredText(v: FormDataEntryValue | null, label: string, max: number): string {
  const s = text(v, max);
  if (!s) throw new Error(`${label} obrigatório.`);
  return s;
}

export function optionalUuid(v: FormDataEntryValue | null): string | null {
  const s = text(v, 80);
  return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(s) ? s : null;
}

// Ids que chegam de uma seleção múltipla na interface: vêm como array de
// argumento (não de FormData), então o que importa aqui é tirar duplicata,
// recusar lixo e travar o tamanho do lote antes de virar um `in (...)` no banco.
export function normalizeBulkIds(ids: unknown, limit = 200): string[] {
  if (!Array.isArray(ids)) throw new Error("Seleção inválida.");
  const unique = Array.from(
    new Set(
      ids.filter(
        (id): id is string => typeof id === "string" && id.length > 0 && id.length <= 80
      )
    )
  );
  if (unique.length > limit) {
    throw new Error(`Selecione no máximo ${limit} itens por vez.`);
  }
  return unique;
}

export function moneyToCentsOrNull(v: FormDataEntryValue | null): number | null {
  const raw = text(v, 32).replace(/R\$|\s/g, "");
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Informe um valor válido.");
  return Math.round(amount * 100);
}

export function intOrNull(v: FormDataEntryValue | null): number | null {
  const raw = text(v, 8);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error("Informe um número válido.");
  return value;
}

export function decimalOrNull(v: FormDataEntryValue | null): number | null {
  const raw = text(v, 16);
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) throw new Error("Informe um número válido.");
  return value;
}

// Como decimalOrNull, mas aceita negativo — latitude/longitude (RE-7xx)
// são negativas no Brasil inteiro (ex: -23.561684), decimalOrNull rejeitaria.
export function signedDecimalOrNull(v: FormDataEntryValue | null): number | null {
  const raw = text(v, 16);
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value)) throw new Error("Informe um número válido.");
  return value;
}

// "a, b,  c" -> ["a", "b", "c"] — usado pros campos de lista em texto livre
// (bairros/cidades) do formulário de preferências do cliente.
export function stringListOrEmpty(v: FormDataEntryValue | null, maxItems = 20): string[] {
  const raw = text(v, 600);
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

// "piscina=sim, varanda = sim" -> { piscina: "sim", varanda: "sim" } —
// mesmo formato "chave: valor" usado por extra_features/details em outras
// partes do produto, só que digitado como texto livre num único campo.
export function keyValueListOrEmpty(v: FormDataEntryValue | null, maxItems = 20): Record<string, string> {
  const raw = text(v, 1000);
  if (!raw) return {};
  const result: Record<string, string> = {};
  for (const pair of raw.split(",").slice(0, maxItems)) {
    const [key, ...rest] = pair.split("=");
    const cleanKey = key?.trim().slice(0, 60);
    const cleanValue = rest.join("=").trim().slice(0, 120);
    if (cleanKey && cleanValue) result[cleanKey] = cleanValue;
  }
  return result;
}
