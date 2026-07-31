import { describe, expect, it } from "vitest";
import { computeListingQuality } from "./real-estate-listing-quality";
import type { RealEstateProperty } from "@/lib/supabase/types";

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
    price_cents: null,
    rent_price_cents: null,
    condo_fee_cents: null,
    iptu_cents: null,
    bedrooms: null,
    bathrooms: null,
    parking_spots: null,
    area_m2: null,
    address_street: null,
    address_number: null,
    address_neighborhood: null,
    address_city: null,
    address_state: null,
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

describe("computeListingQuality", () => {
  it("anúncio completo (fotos, descrição longa, preço, endereço e detalhes) chega em 100", () => {
    const result = computeListingQuality(
      property({
        description: "a".repeat(120),
        price_cents: 50000000,
        address_street: "Rua X",
        address_neighborhood: "Bairro Y",
        address_city: "Cidade Z",
        bedrooms: 2,
        bathrooms: 1,
        parking_spots: 1,
        area_m2: 60,
      }),
      5
    );
    expect(result.score).toBe(100);
  });

  it("anúncio vazio (sem nada preenchido) fica em 0 e lista todos os gaps", () => {
    const result = computeListingQuality(property({}), 0);
    expect(result.score).toBe(0);
    expect(result.gaps.map((g) => g.field)).toEqual(
      expect.arrayContaining(["photos", "description", "price", "address", "details", "registration_number"])
    );
  });

  it("1-2 fotos pontua metade do critério de fotos, não zero", () => {
    const result = computeListingQuality(property({}), 1);
    const photosGap = result.gaps.find((g) => g.field === "photos");
    expect(photosGap).toBeDefined();
    expect(result.score).toBeGreaterThan(0);
  });

  it("descrição curta pontua metade do critério, descrição longa pontua cheio", () => {
    const short = computeListingQuality(property({ description: "curta" }), 0);
    const long = computeListingQuality(property({ description: "a".repeat(150) }), 0);
    expect(long.score).toBeGreaterThan(short.score);
    expect(long.gaps.some((g) => g.field === "description")).toBe(false);
  });

  it("matrícula ausente vira gap sem tirar pontos do score", () => {
    const withReg = computeListingQuality(property({ registration_number: "12345" }), 0);
    const withoutReg = computeListingQuality(property({ registration_number: null }), 0);
    expect(withReg.score).toEqual(withoutReg.score);
    expect(withoutReg.gaps.some((g) => g.field === "registration_number")).toBe(true);
    expect(withReg.gaps.some((g) => g.field === "registration_number")).toBe(false);
  });

  it("score nunca passa de 100", () => {
    const result = computeListingQuality(
      property({
        description: "a".repeat(300),
        price_cents: 1,
        rent_price_cents: 1,
        address_street: "R", address_neighborhood: "B", address_city: "C",
        bedrooms: 1, bathrooms: 1, parking_spots: 1, area_m2: 1,
      }),
      99
    );
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
