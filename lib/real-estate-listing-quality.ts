import type { RealEstateProperty } from "@/lib/supabase/types";

// Score de qualidade do anúncio 0-100 (RE-5xx, Fase 5) — determinístico e
// explicável, mesmo espírito do match score (lib/real-estate-match.ts):
// cada gap vira uma sugestão de tarefa concreta, não só um número.
export type ListingGap = { field: string; points: number; suggestion: string };
export type ListingQualityResult = { score: number; gaps: ListingGap[] };

const POINTS = {
  photos: 30,
  description: 20,
  price: 15,
  address: 15,
  details: 20, // 5 cada: quartos, banheiros, vagas, área
} as const;

export function computeListingQuality(property: RealEstateProperty, photoCount: number): ListingQualityResult {
  const gaps: ListingGap[] = [];
  let score = 0;

  if (photoCount >= 3) {
    score += POINTS.photos;
  } else if (photoCount >= 1) {
    score += Math.round(POINTS.photos / 2);
    gaps.push({ field: "photos", points: POINTS.photos, suggestion: `Adicionar mais fotos (tem ${photoCount}, ideal é 3 ou mais)` });
  } else {
    gaps.push({ field: "photos", points: POINTS.photos, suggestion: "Adicionar foto de capa" });
  }

  const descriptionLength = property.description?.trim().length ?? 0;
  if (descriptionLength >= 100) {
    score += POINTS.description;
  } else if (descriptionLength > 0) {
    score += Math.round(POINTS.description / 2);
    gaps.push({ field: "description", points: POINTS.description, suggestion: "Revisar descrição (está curta demais)" });
  } else {
    gaps.push({ field: "description", points: POINTS.description, suggestion: "Escrever uma descrição" });
  }

  if (property.price_cents !== null || property.rent_price_cents !== null) {
    score += POINTS.price;
  } else {
    gaps.push({ field: "price", points: POINTS.price, suggestion: "Preencher preço" });
  }

  if (property.address_street && property.address_neighborhood && property.address_city) {
    score += POINTS.address;
  } else {
    gaps.push({ field: "address", points: POINTS.address, suggestion: "Completar o endereço (rua, bairro e cidade)" });
  }

  const detailFields: [string, number | null][] = [
    ["bedrooms", property.bedrooms],
    ["bathrooms", property.bathrooms],
    ["parking_spots", property.parking_spots],
    ["area_m2", property.area_m2],
  ];
  const filledDetails = detailFields.filter(([, value]) => value !== null).length;
  score += Math.round((POINTS.details * filledDetails) / detailFields.length);
  if (filledDetails < detailFields.length) {
    gaps.push({ field: "details", points: POINTS.details - Math.round((POINTS.details * filledDetails) / detailFields.length), suggestion: "Preencher quartos/banheiros/vagas/área" });
  }

  // Matrícula pesa na tarefa sugerida (o plano cita "anexar matrícula"
  // como um dos tipos de tarefa), não no score — é documento cartorário,
  // não característica do anúncio em si.
  if (!property.registration_number) {
    gaps.push({ field: "registration_number", points: 0, suggestion: "Anexar/registrar a matrícula do imóvel" });
  }

  return { score: Math.min(100, score), gaps };
}
