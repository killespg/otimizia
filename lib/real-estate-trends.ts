import type { RealEstatePropertyType } from "@/lib/supabase/types";

// 4.5 (Fase 4): tendências e inteligência de portfólio. Depende de 1.5
// (infraestrutura de relatório) e 2.3 (dados limpos). A porta de saída do
// item exige, antes de qualquer previsão avançada: "regras de mínimo
// amostral, intervalos de confiança e feedback provam utilidade" — por
// isso todo resultado aqui vem com `sufficientSample`, e nenhum número é
// omitido silenciosamente quando a amostra é pequena (mostra "dados
// insuficientes" em vez de esconder ou, pior, mostrar um número
// enganosamente preciso). Mesmo princípio da seção 6 do roadmap ("machine
// learning sem amostra").
export const MIN_SAMPLE_SIZE = 5;

export type DemandRow = {
  key: string;
  count: number;
  sufficientSample: boolean;
};

function groupCount<T>(items: T[], keyOf: (item: T) => string | null): DemandRow[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count, sufficientSample: count >= MIN_SAMPLE_SIZE }))
    .sort((a, b) => b.count - a.count);
}

// Demanda = preferências de cliente registradas (real_estate_lead_preferences),
// não o portfólio em si — "o que os clientes pedem", pra comparar contra
// "o que a carteira tem" em computePortfolioGaps.
export function computeDemandByNeighborhood(preferences: { neighborhoods: string[] }[]): DemandRow[] {
  const flattened = preferences.flatMap((p) => p.neighborhoods.map((n) => ({ neighborhood: n })));
  return groupCount(flattened, (item) => item.neighborhood || null);
}

export function computeDemandByPropertyType(preferences: { property_types: RealEstatePropertyType[] }[]): DemandRow[] {
  const flattened = preferences.flatMap((p) => p.property_types.map((t) => ({ propertyType: t })));
  return groupCount(flattened, (item) => item.propertyType || null);
}

export type VelocityRow = {
  propertyType: RealEstatePropertyType;
  avgDaysToClose: number | null;
  sampleSize: number;
  sufficientSample: boolean;
};

// Velocidade = tempo médio entre criação e fechamento (vendido/alugado)
// por tipo de imóvel. Só considera imóveis já fechados — em aberto não
// tem "tempo até fechar" ainda.
export function computeVelocityByType(
  properties: { propertyType: RealEstatePropertyType; createdAt: string; closedAt: string | null }[]
): VelocityRow[] {
  const byType = new Map<RealEstatePropertyType, number[]>();
  for (const property of properties) {
    if (!property.closedAt) continue;
    const days = (new Date(property.closedAt).getTime() - new Date(property.createdAt).getTime()) / 86_400_000;
    const arr = byType.get(property.propertyType) ?? [];
    arr.push(days);
    byType.set(property.propertyType, arr);
  }
  return Array.from(byType.entries())
    .map(([propertyType, days]) => ({
      propertyType,
      avgDaysToClose: days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
      sampleSize: days.length,
      sufficientSample: days.length >= MIN_SAMPLE_SIZE,
    }))
    .sort((a, b) => b.sampleSize - a.sampleSize);
}

export type PortfolioGap = {
  key: string;
  demandCount: number;
  portfolioCount: number;
  gap: number; // demanda - portfólio; positivo = falta estoque, negativo = sobra
  sufficientSample: boolean;
};

// Cruza demanda (o que clientes pedem) com o que a carteira tem — a
// "lacuna de estoque" que o roadmap pede. Só compara dimensões (bairro,
// tipo) que aparecem nos dois lados; sufficientSample exige amostra
// mínima nos DOIS lados, não só na demanda.
export function computePortfolioGaps(demand: DemandRow[], portfolio: DemandRow[]): PortfolioGap[] {
  const portfolioByKey = new Map(portfolio.map((row) => [row.key, row]));
  return demand.map((demandRow) => {
    const portfolioRow = portfolioByKey.get(demandRow.key);
    const portfolioCount = portfolioRow?.count ?? 0;
    return {
      key: demandRow.key,
      demandCount: demandRow.count,
      portfolioCount,
      gap: demandRow.count - portfolioCount,
      sufficientSample: demandRow.sufficientSample && (portfolioRow?.sufficientSample ?? portfolioCount >= MIN_SAMPLE_SIZE),
    };
  });
}
