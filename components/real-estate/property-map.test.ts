import { describe, expect, it } from "vitest";
import * as propertyMapModule from "@/components/real-estate/PropertyMap";

type MarkerVisual = {
  fill: string;
  tone: string;
};

describe("PropertyMap color semantics", () => {
  it("uses a colored basemap instead of the monochrome dark layer", () => {
    const tileUrl = Reflect.get(
      propertyMapModule,
      "PROPERTY_MAP_TILE_URL",
    ) as string | undefined;

    expect(tileUrl).toBeTypeOf("string");
    expect(tileUrl).toContain("/voyager/");
    expect(tileUrl).not.toContain("dark_all");
  });

  it("gives active, reserved, completed and inactive properties distinct tones", () => {
    const propertyMarkerVisual = Reflect.get(
      propertyMapModule,
      "propertyMarkerVisual",
    ) as ((status: string) => MarkerVisual) | undefined;

    expect(propertyMarkerVisual).toBeTypeOf("function");
    if (!propertyMarkerVisual) return;

    const active = propertyMarkerVisual("ativo");
    const reserved = propertyMarkerVisual("reservado");
    const sold = propertyMarkerVisual("vendido");
    const rented = propertyMarkerVisual("alugado");
    const inactive = propertyMarkerVisual("inativo");
    const draft = propertyMarkerVisual("rascunho");

    expect(active.tone).toBe("active");
    expect(reserved.tone).toBe("reserved");
    expect(sold.tone).toBe("completed");
    expect(rented.tone).toBe("completed");
    expect(inactive.tone).toBe("inactive");
    expect(draft.tone).toBe("inactive");
    expect(new Set([active.fill, reserved.fill, sold.fill, inactive.fill]).size).toBe(4);
  });
});
