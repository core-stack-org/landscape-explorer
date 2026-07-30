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
  buildKylExploreWfsUrl,
} from "../apps/geolibre-desktop/src/core-geostack/explore-runtime";
import {
  buildExploreResultsNotebook,
  buildHydrologyNotebook,
  buildLulcNotebook,
  notebookSourceText,
} from "../apps/geolibre-desktop/src/core-geostack/notebook-artifacts";
import {
  buildCoreGeoStackTehsilStory,
  isCoreGeoStackTehsilStory,
  summarizeCoreGeoStackTehsilStory,
} from "../apps/geolibre-desktop/src/core-geostack/story-builder";
import {
  CORE_GEOSTACK_MODES,
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

  it("removes Present and migrates old Present links to Stories", () => {
    assert.deepEqual(CORE_GEOSTACK_MODES, ["focus", "explore", "stories"]);
    assert.equal(parseCoreGeoStackUrl(new URLSearchParams("mode=present")).mode, "stories");
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

describe("CoRE-GeoStack direct notebook contract", () => {
  const snapshot = {
    ...DEFAULT_CORE_GEOSTACK_WORKSPACE,
    mode: "explore" as const,
    location: {
      state: "Assam",
      district: "Cachar",
      tehsil: "Lakhipur",
    },
    selectedFilterIds: ["MWS:relief:0"],
  };

  it("generates a scoped hydrology workbook without a credential", () => {
    const artifact = buildHydrologyNotebook(snapshot);
    const source = notebookSourceText(artifact.notebook);
    assert.equal(
      artifact.fileName,
      "KYL_assam_cachar_lakhipur_hydrology_and_cropping.ipynb",
    );
    assert.match(source, /download_kyl_data/);
    assert.match(source, /deltaG_well_depth_cachar_lakhipur/);
    assert.match(source, /get_mwsid_by_latlon/);
    assert.match(source, /get_tehsil_data/);
    assert.doesNotMatch(source, /CS_API=/);
  });

  it("generates a two-year LULC inspection workbook", () => {
    const artifact = buildLulcNotebook(snapshot, {
      level: "3",
      beforeYear: "17_18",
      afterYear: "24_25",
    });
    const source = notebookSourceText(artifact.notebook);
    assert.match(source, /LULC_17_18_cachar_lakhipur_level_3/);
    assert.match(source, /LULC_24_25_cachar_lakhipur_level_3/);
    assert.match(source, /GetFeatureInfo/);
  });

  it("captures active Explore selections in a reproducible notebook", () => {
    const artifact = buildExploreResultsNotebook(snapshot, [
      { source: "MWS", total: 86, matched: 12 },
    ]);
    const source = notebookSourceText(artifact.notebook);
    assert.match(source, /OR within one indicator/);
    assert.match(source, /MWS:relief:0/);
    assert.match(source, /filter_records/);
  });

  it("exposes the matching tehsil WFS used by notebook generation", () => {
    const url = new URL(buildKylExploreWfsUrl("MWS", snapshot.location) as string);
    assert.equal(url.searchParams.get("typeName"), "mws_layers:deltaG_well_depth_cachar_lakhipur");
  });
});

describe("CoRE-GeoStack tehsil story contract", () => {
  const input = {
    location: {
      state: "Andhra Pradesh",
      district: "Ananthapur",
      tehsil: "Nambulipulikunta",
    },
    selectedLayerIds: [
      "administrative_boundaries",
      "demographics",
      "mws_layers",
    ],
    selectedFilterIds: ["MWS:relief:2"],
    mapView: {
      center: [78.36, 14.03] as [number, number],
      zoom: 10.5,
      pitch: 0,
      bearing: 0,
    },
    layers: [
      {
        id: "admin-live",
        name: "Administrative Boundaries",
        visible: true,
        opacity: 1,
      },
      {
        id: "demographic-live",
        name: "Socio-Economic Profile",
        visible: true,
        opacity: 0.9,
      },
      {
        id: "mws-live",
        name: "Micro-watersheds and Hydrological Variables",
        visible: true,
        opacity: 0.8,
      },
      {
        id: "explore-mws-live",
        name: "Explore · Micro-watersheds",
        visible: true,
        opacity: 0.7,
      },
    ],
    results: [{ source: "MWS" as const, total: 45, matched: 42 }],
  };

  it("builds deterministic scenes from location, layers, filters, and live results", () => {
    const story = buildCoreGeoStackTehsilStory(input);
    assert.equal(story.title, "Nambulipulikunta — Know Your Landscape");
    assert.equal(story.startSlide, "none");
    assert.deepEqual(
      story.chapters.map((chapter) => chapter.id.split(":").at(-1)),
      ["orientation", "people", "hydrology", "mws", "synthesis"],
    );
    assert.match(story.chapters[3].description, /42 of 45 matching features/);
    assert.ok(
      story.chapters[3].onChapterEnter.some(
        (change) => change.layerId === "explore-mws-live" && change.opacity >= 0.82,
      ),
    );
    assert.equal(
      story.chapters.at(-1)?.onChapterEnter.find(
        (change) => change.layerId === "explore-mws-live",
      )?.opacity,
      0.7,
    );
  });

  it("identifies generated tehsil stories without claiming custom stories", () => {
    const story = buildCoreGeoStackTehsilStory(input);
    assert.equal(isCoreGeoStackTehsilStory(story), true);
    assert.equal(
      isCoreGeoStackTehsilStory({
        ...story,
        chapters: [{ ...story.chapters[0], id: "custom-story:first" }],
      }),
      false,
    );
  });

  it("summarizes the proposed scene before replacing an existing story", () => {
    assert.deepEqual(summarizeCoreGeoStackTehsilStory(input), {
      chapterCount: 5,
      domainCount: 1,
      filterCount: 1,
      liveLayerCount: 4,
    });
  });
});
