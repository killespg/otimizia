import { describe, expect, it } from "vitest";
import {
  computeDemandByNeighborhood,
  computeDemandByPropertyType,
  computePortfolioGaps,
  computeVelocityByType,
  MIN_SAMPLE_SIZE,
} from "@/lib/real-estate-trends";

describe("computeDemandByNeighborhood", () => {
  it("agrupa e conta bairros, marcando amostra insuficiente abaixo do mínimo", () => {
    const preferences = [
      { neighborhoods: ["Centro"] },
      { neighborhoods: ["Centro"] },
      { neighborhoods: ["Zona Sul"] },
    ];
    const rows = computeDemandByNeighborhood(preferences);
    const centro = rows.find((r) => r.key === "Centro")!;
    expect(centro.count).toEqual(2);
    expect(centro.sufficientSample).toBe(false);
  });

  it("marca amostra suficiente quando atinge o mínimo", () => {
    const preferences = Array.from({ length: MIN_SAMPLE_SIZE }, () => ({ neighborhoods: ["Centro"] }));
    const rows = computeDemandByNeighborhood(preferences);
    expect(rows[0].sufficientSample).toBe(true);
  });

  it("ignora contatos sem bairro declarado", () => {
    const rows = computeDemandByNeighborhood([{ neighborhoods: [] }]);
    expect(rows).toHaveLength(0);
  });
});

describe("computeDemandByPropertyType", () => {
  it("agrupa por tipo de imóvel", () => {
    const rows = computeDemandByPropertyType([
      { property_types: ["apartamento", "casa"] },
      { property_types: ["apartamento"] },
    ]);
    expect(rows.find((r) => r.key === "apartamento")?.count).toEqual(2);
    expect(rows.find((r) => r.key === "casa")?.count).toEqual(1);
  });
});

describe("computeVelocityByType", () => {
  it("calcula dias médios até fechar, só com imóveis já fechados", () => {
    const rows = computeVelocityByType([
      { propertyType: "apartamento", createdAt: "2026-01-01T00:00:00.000Z", closedAt: "2026-01-11T00:00:00.000Z" },
      { propertyType: "apartamento", createdAt: "2026-01-01T00:00:00.000Z", closedAt: "2026-01-21T00:00:00.000Z" },
      { propertyType: "casa", createdAt: "2026-01-01T00:00:00.000Z", closedAt: null },
    ]);
    const apartamento = rows.find((r) => r.propertyType === "apartamento")!;
    expect(apartamento.avgDaysToClose).toEqual(15);
    expect(apartamento.sufficientSample).toBe(false);

    expect(rows.find((r) => r.propertyType === "casa")).toBeUndefined();
  });
});

describe("computePortfolioGaps", () => {
  it("calcula a diferença entre demanda e portfólio por dimensão", () => {
    const demand = [{ key: "Centro", count: 10, sufficientSample: true }];
    const portfolio = [{ key: "Centro", count: 2, sufficientSample: false }];
    const gaps = computePortfolioGaps(demand, portfolio);
    expect(gaps[0].gap).toEqual(8);
    expect(gaps[0].sufficientSample).toBe(false);
  });

  it("trata dimensão sem nenhum imóvel no portfólio como gap total", () => {
    const demand = [{ key: "Bairro Novo", count: 6, sufficientSample: true }];
    const gaps = computePortfolioGaps(demand, []);
    expect(gaps[0].portfolioCount).toEqual(0);
    expect(gaps[0].gap).toEqual(6);
  });
});
