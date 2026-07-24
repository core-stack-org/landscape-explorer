import {
  GEOLIBRE_RUST_LAYERS,
  addBboxToWfsUrl,
  buildGeoLibreRustSource,
  formatGeoServerName,
} from "./geolibreRustLayers";

describe("GeoLibre Rust KYL layer catalog", () => {
  test("covers the complete vector and raster/year catalog", () => {
    const vectors = GEOLIBRE_RUST_LAYERS.filter(
      (layer) => layer.sourceType === "vector"
    );
    const rasters = GEOLIBRE_RUST_LAYERS.filter(
      (layer) => layer.sourceType === "raster"
    );

    expect(GEOLIBRE_RUST_LAYERS).toHaveLength(45);
    expect(vectors).toHaveLength(13);
    expect(rasters).toHaveLength(32);
  });

  test("keeps micro-watershed datasets in Hydrology", () => {
    const hydrologicalIds = [
      "mws_layers",
      "hydrological_boundaries",
      "mws_layers_fortnight",
    ];

    hydrologicalIds.forEach((id) => {
      expect(
        GEOLIBRE_RUST_LAYERS.find((layer) => layer.id === id)?.domain
      ).toBe("Hydrology");
    });
  });

  test("builds a live WFS source for the selected tehsil", () => {
    const layer = GEOLIBRE_RUST_LAYERS.find(
      (entry) => entry.id === "drainage"
    );
    const source = buildGeoLibreRustSource(layer, {
      district: "Banas Kantha",
      tehsil: "Palanpur",
    });
    const url = new URL(source.sourceUrl);

    expect(source.qualifiedName).toBe("drainage:banas_kantha_palanpur");
    expect(url.searchParams.get("typeName")).toBe(
      "drainage:banas_kantha_palanpur"
    );
    expect(url.searchParams.get("srsName")).toBe("EPSG:4326");
    expect(
      Object.values(source).some((value) => typeof value === "function")
    ).toBe(false);
  });

  test("builds year-specific LULC WMS identities", () => {
    const layer = GEOLIBRE_RUST_LAYERS.find(
      (entry) => entry.id === "lulc_level_3_24_25"
    );
    const source = buildGeoLibreRustSource(layer, {
      district: "Banas Kantha",
      tehsil: "Palanpur",
    });

    expect(source.qualifiedName).toBe(
      "LULC_level_3:LULC_24_25_banas_kantha_palanpur_level_3"
    );
    expect(source.endpoint).toBe(
      "https://geoserver.core-stack.org:8443/geoserver/LULC_level_3/wms"
    );
  });

  test("normalizes names and scopes WFS requests to a map extent", () => {
    expect(formatGeoServerName("  Bengaluru Urban (North) ")).toBe(
      "bengaluru_urban_north"
    );

    const scoped = new URL(
      addBboxToWfsUrl("https://example.test/wfs?service=WFS", [
        72.1, 21.2, 73.4, 22.5,
      ])
    );
    expect(scoped.searchParams.get("bbox")).toBe(
      "72.1,21.2,73.4,22.5,EPSG:4326"
    );
  });
});
