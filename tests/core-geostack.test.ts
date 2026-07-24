import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CORE_GEOSTACK_LAYERS,
  CORE_GEOSTACK_LULC_YEARS,
  CORE_GEOSTACK_RASTER_LAYERS,
  CORE_GEOSTACK_VECTOR_LAYERS,
  slugLocationPart,
} from "../apps/geolibre-desktop/src/core-geostack/layer-catalog";
import {
  DEFAULT_CORE_GEOSTACK_WORKSPACE,
  getCoreGeoStackWorkspaceSnapshot,
  parseCoreGeoStackUrl,
  serializeCoreGeoStackUrl,
  setCoreGeoStackDataStatus,
} from "../apps/geolibre-desktop/src/core-geostack/workspace-state";

describe("CoRE-GeoStack KYL layer contract", () => {
  it("preserves the validated 45-layer catalogue shape", () => {
    assert.equal(CORE_GEOSTACK_LAYERS.length, 45);
    assert.equal(CORE_GEOSTACK_VECTOR_LAYERS.length, 13);
    assert.equal(CORE_GEOSTACK_RASTER_LAYERS.length, 32);
    assert.equal(
      CORE_GEOSTACK_LAYERS.filter((layer) => layer.year).length,
      CORE_GEOSTACK_LULC_YEARS.length * 3,
    );
  });

  it("keeps hydrological boundary layers in Hydrology", () => {
    for (const id of [
      "mws_layers",
      "hydrological_boundaries",
      "mws_layers_fortnight",
    ]) {
      assert.equal(CORE_GEOSTACK_LAYERS.find((layer) => layer.id === id)?.domain, "Hydrology");
    }
  });

  it("loads only the two proven default KYL layers initially", () => {
    assert.deepEqual(
      CORE_GEOSTACK_LAYERS.filter((layer) => layer.defaultVisible).map((layer) => layer.id),
      ["administrative_boundaries", "demographics"],
    );
    assert.deepEqual(DEFAULT_CORE_GEOSTACK_WORKSPACE.selectedLayerIds, [
      "administrative_boundaries",
      "demographics",
    ]);
  });

  it("normalizes legacy location labels to GeoServer layer-name parts", () => {
    assert.equal(slugLocationPart("Bengaluru Urban"), "bengaluru_urban");
    assert.equal(slugLocationPart("  Anekal (South) "), "anekal_south");
  });
});

describe("CoRE-GeoStack URL state", () => {
  it("parses committed analysis state and removes duplicate selections", () => {
    const parsed = parseCoreGeoStackUrl(
      new URLSearchParams(
        "mode=explore&state=Karnataka&district=Bengaluru+Urban&tehsil=Anekal&layer=demographics&layer=demographics&filter=relief",
      ),
    );
    assert.equal(parsed.mode, "explore");
    assert.deepEqual(parsed.location, {
      state: "Karnataka",
      district: "Bengaluru Urban",
      tehsil: "Anekal",
    });
    assert.deepEqual(parsed.selectedLayerIds, ["demographics"]);
    assert.deepEqual(parsed.selectedFilterIds, ["relief"]);
  });

  it("falls back to Focus for invalid modes", () => {
    assert.equal(parseCoreGeoStackUrl(new URLSearchParams("mode=unknown")).mode, "focus");
  });

  it("preserves unrelated GeoLibre parameters while serializing stable state", () => {
    const serialized = serializeCoreGeoStackUrl(
      {
        ...DEFAULT_CORE_GEOSTACK_WORKSPACE,
        mode: "stories",
        location: {
          state: "Karnataka",
          district: "Bengaluru Urban",
          tehsil: "Anekal",
        },
        selectedLayerIds: ["demographics", "administrative_boundaries"],
        selectedFilterIds: ["relief"],
      },
      new URLSearchParams("url=https%3A%2F%2Fexample.test%2Fproject.geolibre.json"),
    );
    assert.equal(serialized.get("mode"), "stories");
    assert.equal(serialized.get("url"), "https://example.test/project.geolibre.json");
    assert.deepEqual(serialized.getAll("layer"), [
      "demographics",
      "administrative_boundaries",
    ]);
  });
});

describe("CoRE-GeoStack readiness state", () => {
  it("keeps boundary degradation visible when tehsil layers are live", () => {
    setCoreGeoStackDataStatus("boundary", {
      kind: "partial",
      message: "Pan-India tehsil index is not configured",
    });
    setCoreGeoStackDataStatus("layers", {
      kind: "live",
      message: "2 KYL layers ready for Anekal",
    });
    const status = getCoreGeoStackWorkspaceSnapshot().dataStatus;
    assert.equal(status.kind, "partial");
    assert.match(status.message, /2 KYL layers ready/);
    assert.match(status.message, /tehsil index is not configured/);
  });
});
