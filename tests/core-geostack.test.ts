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
  KYL_EXPLORE_PAGES,
  filterKylRecords,
  kylFilterSelectionId,
  resolveKylFilterSelections,
  waterbodyExploreRecord,
} from "../apps/geolibre-desktop/src/core-geostack/explore-filters";
import {
  buildKylExploreDataUrl,
} from "../apps/geolibre-desktop/src/core-geostack/explore-runtime";
import {
  DEFAULT_CORE_GEOSTACK_WORKSPACE,
  applyCoreGeoStackDurableState,
  getCoreGeoStackWorkspaceSnapshot,
  parseCoreGeoStackUrl,
  serializeCoreGeoStackUrl,
  setCoreGeoStackDataStatus,
  setCoreGeoStackLocation,
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

  it("surfaces Explore loading without hiding existing readiness context", () => {
    setCoreGeoStackDataStatus("explore", {
      kind: "loading",
      message: "Filtering Nambulipulikunta",
    });
    const status = getCoreGeoStackWorkspaceSnapshot().dataStatus;
    assert.equal(status.kind, "loading");
    assert.match(status.message, /Filtering Nambulipulikunta/);
    assert.match(status.message, /tehsil index is not configured/);
    setCoreGeoStackDataStatus("explore", {
      kind: "idle",
      message: "Choose Explore filters to begin an analysis",
    });
  });
});

describe("CoRE-GeoStack Explore contract", () => {
  it("preserves the KYL filter pages and all choice buckets", () => {
    assert.deepEqual(
      KYL_EXPLORE_PAGES.map((page) => [
        page.id,
        page.categories.flatMap((category) => category.filters).length,
        page.categories
          .flatMap((category) => category.filters)
          .reduce((count, filter) => count + filter.values.length, 0),
      ]),
      [
        ["MWS", 27, 80],
        ["Village", 16, 47],
        ["Waterbody", 4, 11],
      ],
    );
  });

  it("uses OR within an indicator and AND across indicators", () => {
    const terrain = KYL_EXPLORE_PAGES[0].categories
      .flatMap((category) => category.filters)
      .find((filter) => filter.name === "terrainCluster_ID");
    const relief = KYL_EXPLORE_PAGES[0].categories
      .flatMap((category) => category.filters)
      .find((filter) => filter.name === "relief");
    assert.ok(terrain);
    assert.ok(relief);

    const selectionIds = [
      kylFilterSelectionId(terrain, 0),
      kylFilterSelectionId(relief, 0),
      kylFilterSelectionId(relief, 2),
    ];
    const matches = filterKylRecords(
      [
        { id: "low-hills", terrainCluster_ID: 2, relief: 6 },
        { id: "moderate-hills", terrainCluster_ID: 2, relief: 50 },
        { id: "high-plains", terrainCluster_ID: 1, relief: 200 },
        { id: "high-hills", terrainCluster_ID: 2, relief: 200 },
      ],
      resolveKylFilterSelections(selectionIds),
    );
    assert.deepEqual(
      matches.map((record) => record.id),
      ["low-hills", "high-hills"],
    );
  });

  it("derives the legacy waterbody filter fields before matching", () => {
    const record = waterbodyExploreRecord({
      UID: "wb-1",
      waterbody_type: "river",
      area_ored: 4,
      on_drainage_line: 1,
      "area_17-18": 1,
      "area_18-19": 2,
      "area_19-20": 3,
    });
    assert.equal(record.waterbody_type, 1);
    assert.equal(record.waterbody_size, 4);
    assert.equal(record.surface_water_trend, 1);
    assert.equal(record.drainage_line, 1);
  });

  it("builds the established tehsil-filtered KYL data endpoint", () => {
    const url = new URL(
      buildKylExploreDataUrl("MWS", {
        state: "Andhra Pradesh",
        district: "Ananthapur",
        tehsil: "Nambulipulikunta",
      }) as string,
    );
    assert.equal(url.pathname, "/api/v1/download_kyl_data/");
    assert.equal(url.searchParams.get("state"), "andhra_pradesh");
    assert.equal(url.searchParams.get("district"), "ananthapur");
    assert.equal(url.searchParams.get("block"), "nambulipulikunta");
  });

  it("clears filters when the selected tehsil changes, matching KYL", () => {
    applyCoreGeoStackDurableState({
      selectedFilterIds: ["MWS:relief:0"],
    });
    setCoreGeoStackLocation({
      state: "Andhra Pradesh",
      district: "Ananthapur",
      tehsil: "Nambulipulikunta",
    });
    assert.deepEqual(getCoreGeoStackWorkspaceSnapshot().selectedFilterIds, []);
  });
});
