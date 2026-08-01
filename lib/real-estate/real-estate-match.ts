import type { RealEstateLeadPreferences, RealEstateMatchExplanation, RealEstateProperty } from "@/lib/supabase/types";

// Match determinístico e explicável (RE-1xx, Fase 1) — sem ML de propósito:
// cada critério é auditável e o corretor precisa sempre poder ver POR QUE
// um imóvel deu 92% e outro 61%, não só o número. Pontuação máxima = 100
// (20 tipo + 25 preço + 20 localização + 10 quartos + 8 vagas + 7 área +
// 10 características obrigatórias).
export type MatchResult = {
  score: number;
  matchable: boolean;
  explanation: RealEstateMatchExplanation;
};

const POINTS = {
  propertyType: 20,
  price: 25,
  location: 20,
  bedrooms: 10,
  parking: 8,
  area: 7,
  requiredFeatures: 10,
} as const;

const PRICE_OVERAGE_TOLERANCE = 0.15; // 15% acima do teto ainda pontua, gradualmente até 0.

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function transactionCompatible(
  wanted: RealEstateLeadPreferences["transaction_type"],
  actual: RealEstateProperty["transaction_type"]
): boolean {
  if (!wanted) return true; // sem preferência declarada = qualquer transação serve.
  if (wanted === actual) return true;
  // "venda_aluguel" no imóvel ou na preferência é compatível com qualquer um dos dois lados.
  return wanted === "venda_aluguel" || actual === "venda_aluguel";
}

function relevantPriceCents(
  preferences: RealEstateLeadPreferences,
  property: RealEstateProperty
): number | null {
  const wantsRent = preferences.transaction_type === "aluguel";
  const wantsSale = preferences.transaction_type === "venda";
  if (wantsRent) return property.rent_price_cents;
  if (wantsSale) return property.price_cents;
  // Sem transação declarada (ou "venda_aluguel"): usa o que o imóvel tiver,
  // preferindo o preço de venda quando os dois existem.
  return property.price_cents ?? property.rent_price_cents;
}

function scorePropertyType(preferences: RealEstateLeadPreferences, property: RealEstateProperty) {
  if (preferences.property_types.length === 0) {
    return { points: POINTS.propertyType, max: POINTS.propertyType, reason: "Nenhum tipo de imóvel exigido pelo cliente." };
  }
  const match = preferences.property_types.includes(property.property_type);
  return {
    points: match ? POINTS.propertyType : 0,
    max: POINTS.propertyType,
    reason: match
      ? `Tipo "${property.property_type}" está na lista aceita pelo cliente.`
      : `Tipo "${property.property_type}" não está entre os aceitos pelo cliente.`,
  };
}

function scorePrice(preferences: RealEstateLeadPreferences, property: RealEstateProperty) {
  const price = relevantPriceCents(preferences, property);
  if (price === null) {
    return { points: 0, max: POINTS.price, reason: "Imóvel sem preço cadastrado para a transação desejada." };
  }
  if (preferences.min_price_cents === null && preferences.max_price_cents === null) {
    return { points: POINTS.price, max: POINTS.price, reason: "Cliente não informou faixa de preço." };
  }
  if (preferences.max_price_cents !== null && price > preferences.max_price_cents) {
    const overageRatio = (price - preferences.max_price_cents) / preferences.max_price_cents;
    if (overageRatio > PRICE_OVERAGE_TOLERANCE) {
      return { points: 0, max: POINTS.price, reason: `Preço ${(overageRatio * 100).toFixed(0)}% acima do teto — fora da tolerância de 15%.` };
    }
    const points = Math.round(POINTS.price * (1 - overageRatio / PRICE_OVERAGE_TOLERANCE));
    return { points, max: POINTS.price, reason: `Preço ${(overageRatio * 100).toFixed(0)}% acima do teto — dentro da tolerância de 15%, pontuação reduzida.` };
  }
  return { points: POINTS.price, max: POINTS.price, reason: "Preço dentro da faixa desejada pelo cliente." };
}

function scoreLocation(preferences: RealEstateLeadPreferences, property: RealEstateProperty) {
  const neighborhoods = preferences.neighborhoods.map(normalize);
  const cities = preferences.cities.map(normalize);
  if (neighborhoods.length === 0 && cities.length === 0) {
    return { points: POINTS.location, max: POINTS.location, reason: "Cliente não informou bairro/cidade de interesse." };
  }
  const propertyNeighborhood = property.address_neighborhood ? normalize(property.address_neighborhood) : "";
  const propertyCity = property.address_city ? normalize(property.address_city) : "";
  if (propertyNeighborhood && neighborhoods.includes(propertyNeighborhood)) {
    return { points: POINTS.location, max: POINTS.location, reason: `Bairro "${property.address_neighborhood}" é um dos desejados.` };
  }
  if (propertyCity && cities.includes(propertyCity)) {
    return { points: Math.round(POINTS.location / 2), max: POINTS.location, reason: `Cidade "${property.address_city}" bate, mas o bairro não é um dos preferidos.` };
  }
  return { points: 0, max: POINTS.location, reason: "Fora das cidades/bairros de interesse do cliente." };
}

function scoreMinimum(
  label: string,
  points: number,
  min: number | null,
  actual: number | null
) {
  if (min === null) return { points, max: points, reason: `Cliente não exigiu mínimo de ${label}.` };
  if (actual !== null && actual >= min) {
    return { points, max: points, reason: `${label} (${actual}) atende o mínimo exigido (${min}).` };
  }
  return { points: 0, max: points, reason: `${label} (${actual ?? "não informado"}) abaixo do mínimo exigido (${min}).` };
}

function scoreRequiredFeatures(preferences: RealEstateLeadPreferences, property: RealEstateProperty) {
  const required = Object.entries(preferences.required_features);
  if (required.length === 0) {
    return { criterion: { points: POINTS.requiredFeatures, max: POINTS.requiredFeatures, reason: "Nenhuma característica obrigatória." }, blocked: false };
  }
  const missing = required.filter(([key, value]) => {
    const actual = property.extra_features[key];
    return !actual || normalize(actual) !== normalize(value);
  });
  if (missing.length > 0) {
    const missingLabels = missing.map(([key]) => key).join(", ");
    return {
      criterion: { points: 0, max: POINTS.requiredFeatures, reason: `Não atende característica(s) obrigatória(s): ${missingLabels}.` },
      blocked: true,
    };
  }
  return { criterion: { points: POINTS.requiredFeatures, max: POINTS.requiredFeatures, reason: "Atende todas as características obrigatórias." }, blocked: false };
}

export function computeMatchScore(
  preferences: RealEstateLeadPreferences,
  property: RealEstateProperty
): MatchResult {
  if (!transactionCompatible(preferences.transaction_type, property.transaction_type)) {
    return {
      score: 0,
      matchable: false,
      explanation: {
        transaction_type: {
          points: 0,
          max: 0,
          reason: `Cliente quer "${preferences.transaction_type}", imóvel é só "${property.transaction_type}" — incompatível.`,
        },
      },
    };
  }

  const requiredFeatures = scoreRequiredFeatures(preferences, property);
  const explanation: RealEstateMatchExplanation = {
    property_type: scorePropertyType(preferences, property),
    price: scorePrice(preferences, property),
    location: scoreLocation(preferences, property),
    bedrooms: scoreMinimum("quartos", POINTS.bedrooms, preferences.min_bedrooms, property.bedrooms),
    parking_spots: scoreMinimum("vagas", POINTS.parking, preferences.min_parking_spots, property.parking_spots),
    area_m2: scoreMinimum("área (m²)", POINTS.area, preferences.min_area_m2, property.area_m2),
    required_features: requiredFeatures.criterion,
  };

  if (requiredFeatures.blocked) {
    return { score: 0, matchable: false, explanation };
  }

  const score = Object.values(explanation).reduce((sum, criterion) => sum + criterion.points, 0);
  return { score, matchable: true, explanation };
}
