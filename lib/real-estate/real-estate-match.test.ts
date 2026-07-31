import { describe, expect, it } from "vitest";
import { computeMatchScore } from "./real-estate-match";
import type { RealEstateLeadPreferences, RealEstateProperty } from "@/lib/supabase/types";

function preferences(overrides: Partial<RealEstateLeadPreferences>): RealEstateLeadPreferences {
  return {
    id: "pref-1",
    org_id: "org-1",
    contact_id: "contact-1",
    deal_id: "deal-1",
    transaction_type: null,
    property_types: [],
    min_price_cents: null,
    max_price_cents: null,
    neighborhoods: [],
    cities: [],
    min_bedrooms: null,
    min_bathrooms: null,
    min_parking_spots: null,
    min_area_m2: null,
    required_features: {},
    desired_features: {},
    financing_needed: null,
    move_deadline: null,
    notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function property(overrides: Partial<RealEstateProperty>): RealEstateProperty {
  return {
    id: "prop-1",
    org_id: "org-1",
    workspace_key: "real_estate_broker",
    created_by: "u1",
    assignee_id: null,
    owner_contact_id: null,
    captured_by: null,
    capture_source: null,
    exclusive_listing: false,
    exclusive_until: null,
    commission_percent: null,
    registration_number: null,
    occupancy_status: null,
    key_location: null,
    listing_quality_score: null,
    title: "Imóvel de teste",
    property_type: "apartamento",
    transaction_type: "venda",
    status: "ativo",
    price_cents: 50000000,
    rent_price_cents: null,
    condo_fee_cents: null,
    iptu_cents: null,
    bedrooms: 2,
    bathrooms: 1,
    parking_spots: 1,
    area_m2: 60,
    address_street: null,
    address_number: null,
    address_neighborhood: "Jardins",
    address_city: "São Paulo",
    address_state: "SP",
    address_zip: null,
    latitude: null,
    longitude: null,
    description: null,
    ai_suggested_fields: {},
    extra_features: {},
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeMatchScore", () => {
  it("dá 100 pontos quando o imóvel bate em tudo e o cliente não restringiu nada", () => {
    const result = computeMatchScore(preferences({}), property({}));
    expect(result.matchable).toBe(true);
    expect(result.score).toBe(100);
  });

  it("bloqueia totalmente (score 0, matchable false) quando o tipo de transação é incompatível", () => {
    const result = computeMatchScore(
      preferences({ transaction_type: "aluguel" }),
      property({ transaction_type: "venda" })
    );
    expect(result.matchable).toBe(false);
    expect(result.score).toBe(0);
  });

  it("venda_aluguel no imóvel é compatível com preferência de venda OU aluguel", () => {
    const wantsSale = computeMatchScore(preferences({ transaction_type: "venda" }), property({ transaction_type: "venda_aluguel" }));
    const wantsRent = computeMatchScore(preferences({ transaction_type: "aluguel" }), property({ transaction_type: "venda_aluguel" }));
    expect(wantsSale.matchable).toBe(true);
    expect(wantsRent.matchable).toBe(true);
  });

  it("dá 0 no critério de tipo quando o tipo do imóvel não está na lista aceita", () => {
    const result = computeMatchScore(
      preferences({ property_types: ["casa", "terreno"] }),
      property({ property_type: "apartamento" })
    );
    expect(result.explanation.property_type.points).toBe(0);
    expect(result.explanation.property_type.max).toBe(20);
  });

  it("preço dentro da faixa dá pontuação cheia", () => {
    const result = computeMatchScore(
      preferences({ min_price_cents: 40000000, max_price_cents: 60000000 }),
      property({ price_cents: 50000000 })
    );
    expect(result.explanation.price.points).toBe(25);
  });

  it("preço abaixo do mínimo ainda pontua cheio (mais barato não é penalizado)", () => {
    const result = computeMatchScore(
      preferences({ min_price_cents: 40000000, max_price_cents: 60000000 }),
      property({ price_cents: 20000000 })
    );
    expect(result.explanation.price.points).toBe(25);
  });

  it("preço até 15% acima do teto perde pontos gradualmente, sem zerar", () => {
    // 10% acima do teto de 60000000 = 66000000.
    const result = computeMatchScore(
      preferences({ max_price_cents: 60000000 }),
      property({ price_cents: 66000000 })
    );
    expect(result.explanation.price.points).toBeGreaterThan(0);
    expect(result.explanation.price.points).toBeLessThan(25);
  });

  it("preço mais de 15% acima do teto zera o critério", () => {
    const result = computeMatchScore(
      preferences({ max_price_cents: 60000000 }),
      property({ price_cents: 80000000 }) // 33% acima
    );
    expect(result.explanation.price.points).toBe(0);
  });

  it("imóvel sem preço cadastrado para a transação desejada zera o critério de preço", () => {
    const result = computeMatchScore(
      preferences({ transaction_type: "aluguel", max_price_cents: 300000 }),
      property({ transaction_type: "venda_aluguel", price_cents: 50000000, rent_price_cents: null })
    );
    expect(result.explanation.price.points).toBe(0);
  });

  it("bairro exato dá pontuação cheia de localização", () => {
    const result = computeMatchScore(
      preferences({ neighborhoods: ["Jardins", "Pinheiros"] }),
      property({ address_neighborhood: "Jardins" })
    );
    expect(result.explanation.location.points).toBe(20);
  });

  it("mesma cidade mas bairro fora da lista dá pontuação parcial de localização", () => {
    const result = computeMatchScore(
      preferences({ neighborhoods: ["Pinheiros"], cities: ["São Paulo"] }),
      property({ address_neighborhood: "Jardins", address_city: "São Paulo" })
    );
    expect(result.explanation.location.points).toBe(10);
  });

  it("fora de cidade e bairro desejados zera localização", () => {
    const result = computeMatchScore(
      preferences({ neighborhoods: ["Pinheiros"], cities: ["São Paulo"] }),
      property({ address_neighborhood: "Centro", address_city: "Campinas" })
    );
    expect(result.explanation.location.points).toBe(0);
  });

  it("quartos/vagas/área abaixo do mínimo zeram só o próprio critério, não bloqueiam o match", () => {
    const result = computeMatchScore(
      preferences({ min_bedrooms: 3, min_parking_spots: 2, min_area_m2: 100 }),
      property({ bedrooms: 2, parking_spots: 1, area_m2: 60 })
    );
    expect(result.matchable).toBe(true);
    expect(result.explanation.bedrooms.points).toBe(0);
    expect(result.explanation.parking_spots.points).toBe(0);
    expect(result.explanation.area_m2.points).toBe(0);
    expect(result.score).toBeLessThan(100);
  });

  it("característica obrigatória ausente bloqueia o match inteiro, mesmo com tudo o mais perfeito", () => {
    const result = computeMatchScore(
      preferences({ required_features: { piscina: "sim" } }),
      property({ extra_features: {} })
    );
    expect(result.matchable).toBe(false);
    expect(result.score).toBe(0);
  });

  it("característica obrigatória presente com valor certo pontua e não bloqueia", () => {
    const result = computeMatchScore(
      preferences({ required_features: { piscina: "sim" } }),
      property({ extra_features: { piscina: "sim" } })
    );
    expect(result.matchable).toBe(true);
    expect(result.explanation.required_features.points).toBe(10);
  });

  it("toda explicação sempre tem um motivo em texto (nunca só o número)", () => {
    const result = computeMatchScore(preferences({ min_bedrooms: 3 }), property({ bedrooms: 1 }));
    for (const criterion of Object.values(result.explanation)) {
      expect(typeof criterion.reason).toBe("string");
      expect(criterion.reason.length).toBeGreaterThan(0);
    }
  });
});
