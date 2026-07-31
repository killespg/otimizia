// Aliases de tribunal aceitos pela API Pública do DataJud (CNJ), conforme
// https://datajud-wiki.cnj.jus.br/api-publica/endpoints/ — TJs primeiro por
// serem o caso de uso mais comum na advocacia geral.
export const DATAJUD_TRIBUNALS: { alias: string; label: string }[] = [
  { alias: "tjac", label: "TJAC — Acre" },
  { alias: "tjal", label: "TJAL — Alagoas" },
  { alias: "tjam", label: "TJAM — Amazonas" },
  { alias: "tjap", label: "TJAP — Amapá" },
  { alias: "tjba", label: "TJBA — Bahia" },
  { alias: "tjce", label: "TJCE — Ceará" },
  { alias: "tjdft", label: "TJDFT — Distrito Federal e Territórios" },
  { alias: "tjes", label: "TJES — Espírito Santo" },
  { alias: "tjgo", label: "TJGO — Goiás" },
  { alias: "tjma", label: "TJMA — Maranhão" },
  { alias: "tjmg", label: "TJMG — Minas Gerais" },
  { alias: "tjms", label: "TJMS — Mato Grosso do Sul" },
  { alias: "tjmt", label: "TJMT — Mato Grosso" },
  { alias: "tjpa", label: "TJPA — Pará" },
  { alias: "tjpb", label: "TJPB — Paraíba" },
  { alias: "tjpe", label: "TJPE — Pernambuco" },
  { alias: "tjpi", label: "TJPI — Piauí" },
  { alias: "tjpr", label: "TJPR — Paraná" },
  { alias: "tjrj", label: "TJRJ — Rio de Janeiro" },
  { alias: "tjrn", label: "TJRN — Rio Grande do Norte" },
  { alias: "tjro", label: "TJRO — Rondônia" },
  { alias: "tjrr", label: "TJRR — Roraima" },
  { alias: "tjrs", label: "TJRS — Rio Grande do Sul" },
  { alias: "tjsc", label: "TJSC — Santa Catarina" },
  { alias: "tjse", label: "TJSE — Sergipe" },
  { alias: "tjsp", label: "TJSP — São Paulo" },
  { alias: "tjto", label: "TJTO — Tocantins" },
  { alias: "trf1", label: "TRF1 — Justiça Federal (1ª Região)" },
  { alias: "trf2", label: "TRF2 — Justiça Federal (2ª Região)" },
  { alias: "trf3", label: "TRF3 — Justiça Federal (3ª Região)" },
  { alias: "trf4", label: "TRF4 — Justiça Federal (4ª Região)" },
  { alias: "trf5", label: "TRF5 — Justiça Federal (5ª Região)" },
  { alias: "trf6", label: "TRF6 — Justiça Federal (6ª Região)" },
  ...Array.from({ length: 24 }, (_, i) => ({
    alias: `trt${i + 1}`,
    label: `TRT${i + 1} — Justiça do Trabalho`,
  })),
  { alias: "tst", label: "TST — Tribunal Superior do Trabalho" },
  { alias: "stj", label: "STJ — Superior Tribunal de Justiça" },
  { alias: "tse", label: "TSE — Tribunal Superior Eleitoral" },
  { alias: "stm", label: "STM — Superior Tribunal Militar" },
  ...[
    "ac", "al", "am", "ap", "ba", "ce", "dft", "es", "go", "ma", "mg", "ms", "mt",
    "pa", "pb", "pe", "pi", "pr", "rj", "rn", "ro", "rr", "rs", "sc", "se", "sp", "to",
  ].map((uf) => ({ alias: `tre-${uf}`, label: `TRE-${uf.toUpperCase()} — Justiça Eleitoral` })),
  { alias: "tjmmg", label: "TJM-MG — Justiça Militar de Minas Gerais" },
  { alias: "tjmrs", label: "TJM-RS — Justiça Militar do Rio Grande do Sul" },
  { alias: "tjmsp", label: "TJM-SP — Justiça Militar de São Paulo" },
];

export const DATAJUD_TRIBUNAL_ALIASES = new Set(DATAJUD_TRIBUNALS.map((t) => t.alias));

// Favoritos primeiro (na ordem em que foram favoritados), resto na ordem
// padrão da lista — usado nos seletores de tribunal pra quem sempre atua
// nos mesmos 1-2 estados não ficar rolando a lista toda vez.
export function sortTribunalsByFavorites(favorites: string[]) {
  const favoriteSet = new Set(favorites);
  const favored = favorites
    .map((alias) => DATAJUD_TRIBUNALS.find((t) => t.alias === alias))
    .filter((t): t is { alias: string; label: string } => Boolean(t));
  const rest = DATAJUD_TRIBUNALS.filter((t) => !favoriteSet.has(t.alias));
  return [...favored, ...rest];
}
