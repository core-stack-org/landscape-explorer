import { useAppStore, type LayerStyle } from "@geolibre/core";
import type { GeoLibreAppAPI } from "@geolibre/plugins";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
} from "geojson";
import { getCoreGeoStackRuntimeConfig } from "./constants";
import {
  filterKylRecords,
  resolveKylFilterSelections,
  waterbodyExploreRecord,
  type KylDataRecord,
  type KylExploreSource,
  type ResolvedKylFilterSelection,
} from "./explore-filters";
import { slugLocationPart } from "./layer-catalog";
import {
  setCoreGeoStackDataStatus,
  type CoreGeoStackLocation,
  type CoreGeoStackWorkspaceSnapshot,
} from "./workspace-state";

type KylFeatureCollection = FeatureCollection<Geometry, GeoJsonProperties>;

export interface KylExploreResultSummary {
  source: KylExploreSource;
  total: number;
  matched: number;
  derived?: boolean;
}

export interface KylExploreRuntimeSnapshot {
  kind: "idle" | "loading" | "live" | "error";
  message: string;
  results: readonly KylExploreResultSummary[];
}

const DEFAULT_EXPLORE_RUNTIME_SNAPSHOT: KylExploreRuntimeSnapshot = Object.freeze({
  kind: "idle",
  message: "Choose one or more filter ranges to begin",
  results: Object.freeze([]),
});

let runtimeSnapshot = DEFAULT_EXPLORE_RUNTIME_SNAPSHOT;
const runtimeListeners = new Set<() => void>();

function publishRuntimeSnapshot(next: KylExploreRuntimeSnapshot): void {
  runtimeSnapshot = {
    ...next,
    results: next.results.map((result) => ({ ...result })),
  };
  for (const listener of runtimeListeners) listener();
}

export function getKylExploreRuntimeSnapshot(): KylExploreRuntimeSnapshot {
  return runtimeSnapshot;
}

export function subscribeKylExploreRuntime(listener: () => void): () => void {
  runtimeListeners.add(listener);
  return () => runtimeListeners.delete(listener);
}

function locationParts(location: CoreGeoStackLocation) {
  if (!location.state || !location.district || !location.tehsil) return null;
  return {
    state: slugLocationPart(location.state),
    district: slugLocationPart(location.district),
    tehsil: slugLocationPart(location.tehsil),
  };
}

export function buildKylExploreDataUrl(
  source: Extract<KylExploreSource, "MWS" | "Village">,
  location: CoreGeoStackLocation,
): string | null {
  const parts = locationParts(location);
  if (!parts) return null;
  const config = getCoreGeoStackRuntimeConfig();
  const endpoint =
    source === "MWS" ? "download_kyl_data/" : "download_kyl_village_data";
  const url = new URL(endpoint, config.apiUrl);
  url.search = new URLSearchParams({
    state: parts.state,
    district: parts.district,
    block: parts.tehsil,
    file_type: "json",
  }).toString();
  return url.href;
}

function buildKylExploreWfsUrl(
  source: KylExploreSource,
  location: CoreGeoStackLocation,
): string | null {
  const parts = locationParts(location);
  if (!parts) return null;
  const config = getCoreGeoStackRuntimeConfig();
  const geometrySource = {
    MWS: {
      workspace: "mws_layers",
      layer: `deltaG_well_depth_${parts.district}_${parts.tehsil}`,
    },
    Village: {
      workspace: "panchayat_boundaries",
      layer: `${parts.district}_${parts.tehsil}`,
    },
    Waterbody: {
      workspace: "swb",
      layer: `surface_waterbodies_${parts.district}_${parts.tehsil}`,
    },
  }[source];
  const url = new URL(`${config.geoserverUrl}${geometrySource.workspace}/ows`);
  url.search = new URLSearchParams({
    service: "WFS",
    version: "1.0.0",
    request: "GetFeature",
    typeName: `${geometrySource.workspace}:${geometrySource.layer}`,
    outputFormat: "application/json",
    screen: "main",
  }).toString();
  return url.href;
}

function isRecordArray(value: unknown): value is KylDataRecord[] {
  return (
    Array.isArray(value) &&
    value.every((record) => Boolean(record) && typeof record === "object" && !Array.isArray(record))
  );
}

function isFeatureCollection(value: unknown): value is KylFeatureCollection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<KylFeatureCollection>;
  return candidate.type === "FeatureCollection" && Array.isArray(candidate.features);
}

function selectionsFor(
  selections: readonly ResolvedKylFilterSelection[],
  source: KylExploreSource,
): ResolvedKylFilterSelection[] {
  return selections.filter((selection) => selection.source === source);
}

function valuesFromMws(
  records: readonly KylDataRecord[],
  key: "mws_intersect_villages" | "mws_intersect_swb",
): Set<string> {
  const values = new Set<string>();
  for (const record of records) {
    const raw = record[key];
    if (!Array.isArray(raw)) continue;
    for (const value of raw) {
      if (value && typeof value === "object" && "swbId" in value) {
        values.add(String((value as { swbId: unknown }).swbId));
      } else if (value !== null && value !== undefined) {
        values.add(String(value));
      }
    }
  }
  return values;
}

const SOURCE_STYLE: Record<
  KylExploreSource,
  {
    contextFill: string;
    contextStroke: string;
    matchFill: string;
    matchStroke: string;
  }
> = {
  MWS: {
    contextFill: "#0ea5e9",
    contextStroke: "#38bdf8",
    matchFill: "#8b5cf6",
    matchStroke: "#4c1d95",
  },
  Village: {
    contextFill: "#f8fafc",
    contextStroke: "#64748b",
    matchFill: "#facc15",
    matchStroke: "#713f12",
  },
  Waterbody: {
    contextFill: "#38bdf8",
    contextStroke: "#0369a1",
    matchFill: "#06b6d4",
    matchStroke: "#164e63",
  },
};

function styledFeatureCollection(
  source: KylExploreSource,
  collection: KylFeatureCollection,
  matchedIds: ReadonlySet<string>,
  idProperties: readonly string[],
): KylFeatureCollection {
  const colors = SOURCE_STYLE[source];
  return {
    ...collection,
    features: collection.features.map((feature) => {
      const properties = { ...(feature.properties ?? {}) };
      const featureId = idProperties
        .map((property) => properties[property])
        .find((value) => value !== null && value !== undefined);
      const matched = featureId !== undefined && matchedIds.has(String(featureId));
      return {
        ...feature,
        properties: {
          ...properties,
          coreMatch: matched ? 1 : 0,
          fill: matched ? colors.matchFill : colors.contextFill,
          "fill-opacity": matched ? 0.68 : 0.08,
          stroke: matched ? colors.matchStroke : colors.contextStroke,
          "stroke-width": matched ? 2.2 : 0.8,
          "stroke-opacity": matched ? 1 : 0.72,
        },
      } satisfies Feature<Geometry, GeoJsonProperties>;
    }),
  };
}

const EXPLORE_LAYER_STYLE: Partial<LayerStyle> = {
  fillOpacity: 0.55,
  strokeWidth: 1,
  simpleStyleEnabled: true,
};

function sourceLabel(source: KylExploreSource): string {
  if (source === "MWS") return "Micro-watersheds";
  if (source === "Village") return "Villages";
  return "Waterbodies";
}

export class CoreGeoStackExploreRuntime {
  private syncKey = "";
  private generation = 0;
  private controller: AbortController | null = null;
  private layerIds = new Map<KylExploreSource, string>();
  private jsonCache = new Map<string, unknown>();

  constructor(private readonly app: GeoLibreAppAPI) {}

  async sync(snapshot: CoreGeoStackWorkspaceSnapshot): Promise<void> {
    const selections = resolveKylFilterSelections(snapshot.selectedFilterIds);
    const nextKey = JSON.stringify({
      mode: snapshot.mode === "stories" ? "explore" : snapshot.mode,
      location: snapshot.location,
      filters: selections.map((selection) => selection.id).sort(),
    });
    if (nextKey === this.syncKey) return;
    this.syncKey = nextKey;
    const generation = ++this.generation;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;

    if (snapshot.mode !== "explore" && snapshot.mode !== "stories") {
      this.clearLoadedLayers();
      publishRuntimeSnapshot(DEFAULT_EXPLORE_RUNTIME_SNAPSHOT);
      setCoreGeoStackDataStatus("explore", {
        kind: "idle",
        message: "Choose Explore filters to begin an analysis",
      });
      return;
    }
    if (!locationParts(snapshot.location)) {
      this.clearLoadedLayers();
      publishRuntimeSnapshot({
        kind: "idle",
        message: "Choose an active tehsil before exploring",
        results: [],
      });
      setCoreGeoStackDataStatus("explore", {
        kind: "idle",
        message: "Choose an active tehsil before exploring",
      });
      return;
    }
    if (!selections.length) {
      this.clearLoadedLayers();
      publishRuntimeSnapshot(DEFAULT_EXPLORE_RUNTIME_SNAPSHOT);
      setCoreGeoStackDataStatus("explore", {
        kind: "idle",
        message: "Choose Explore filters to begin an analysis",
      });
      return;
    }

    const tehsil = snapshot.location.tehsil as string;
    publishRuntimeSnapshot({
      kind: "loading",
      message: `Filtering ${tehsil} using the KYL indicator contract`,
      results: [],
    });
    setCoreGeoStackDataStatus("explore", {
      kind: "loading",
      message: `Filtering ${tehsil} using the KYL indicator contract`,
    });

    try {
      const prepared = await this.prepareResults(
        snapshot.location,
        selections,
        controller.signal,
      );
      if (controller.signal.aborted || generation !== this.generation) return;

      const added = new Map<KylExploreSource, string>();
      try {
        for (const result of prepared) {
          const id = this.app.addGeoJsonLayer(
            `Explore · ${sourceLabel(result.summary.source)}`,
            result.collection,
            result.sourceUrl,
          );
          useAppStore.getState().setLayerStyle(id, EXPLORE_LAYER_STYLE);
          added.set(result.summary.source, id);
        }
      } catch (error) {
        for (const id of added.values()) useAppStore.getState().removeLayer(id);
        throw error;
      }

      const previous = this.layerIds;
      this.layerIds = added;
      for (const id of previous.values()) useAppStore.getState().removeLayer(id);

      const summaries = prepared.map((result) => result.summary);
      const matchTotal = summaries.reduce((total, result) => total + result.matched, 0);
      const message = `${matchTotal} matched features across ${summaries.length} Explore page${summaries.length === 1 ? "" : "s"} for ${tehsil}`;
      publishRuntimeSnapshot({ kind: "live", message, results: summaries });
      setCoreGeoStackDataStatus("explore", {
        kind: "live",
        message,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (controller.signal.aborted || generation !== this.generation) return;
      const message =
        error instanceof Error ? error.message : "The Explore data could not be loaded";
      this.clearLoadedLayers();
      publishRuntimeSnapshot({ kind: "error", message, results: [] });
      setCoreGeoStackDataStatus("explore", {
        kind: "error",
        message: `Explore unavailable for ${tehsil}: ${message}`,
      });
    }
  }

  dispose(): void {
    this.generation += 1;
    this.controller?.abort();
    this.clearLoadedLayers();
    this.jsonCache.clear();
    publishRuntimeSnapshot(DEFAULT_EXPLORE_RUNTIME_SNAPSHOT);
  }

  private clearLoadedLayers(): void {
    for (const id of this.layerIds.values()) useAppStore.getState().removeLayer(id);
    this.layerIds.clear();
  }

  private async fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
    if (this.jsonCache.has(url)) return this.jsonCache.get(url);
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`${response.status} from ${new URL(url).pathname}`);
    const value = (await response.json()) as unknown;
    this.jsonCache.set(url, value);
    return value;
  }

  private async records(
    source: Extract<KylExploreSource, "MWS" | "Village">,
    location: CoreGeoStackLocation,
    signal: AbortSignal,
  ): Promise<{ records: KylDataRecord[]; url: string }> {
    const url = buildKylExploreDataUrl(source, location);
    if (!url) throw new Error("A complete tehsil location is required");
    const value = await this.fetchJson(url, signal);
    if (!isRecordArray(value)) throw new Error(`${source} data is not a record array`);
    return { records: value, url };
  }

  private async geometry(
    source: KylExploreSource,
    location: CoreGeoStackLocation,
    signal: AbortSignal,
  ): Promise<{ collection: KylFeatureCollection; url: string }> {
    const url = buildKylExploreWfsUrl(source, location);
    if (!url) throw new Error("A complete tehsil location is required");
    const value = await this.fetchJson(url, signal);
    if (!isFeatureCollection(value)) throw new Error(`${source} WFS is not GeoJSON`);
    return { collection: value, url };
  }

  private async prepareResults(
    location: CoreGeoStackLocation,
    selections: readonly ResolvedKylFilterSelection[],
    signal: AbortSignal,
  ): Promise<
    Array<{
      collection: KylFeatureCollection;
      sourceUrl: string;
      summary: KylExploreResultSummary;
    }>
  > {
    const mwsSelections = selectionsFor(selections, "MWS");
    const villageSelections = selectionsFor(selections, "Village");
    const waterbodySelections = selectionsFor(selections, "Waterbody");
    const needsMws = mwsSelections.length > 0;
    const needsVillage = villageSelections.length > 0 || needsMws;
    const needsWaterbody = waterbodySelections.length > 0;

    const [mwsData, mwsGeometry, villageData, villageGeometry, waterbodyGeometry] =
      await Promise.all([
        needsMws ? this.records("MWS", location, signal) : null,
        needsMws ? this.geometry("MWS", location, signal) : null,
        villageSelections.length ? this.records("Village", location, signal) : null,
        needsVillage ? this.geometry("Village", location, signal) : null,
        needsWaterbody ? this.geometry("Waterbody", location, signal) : null,
      ]);

    const prepared: Array<{
      collection: KylFeatureCollection;
      sourceUrl: string;
      summary: KylExploreResultSummary;
    }> = [];

    const matchedMwsRecords =
      mwsData && mwsSelections.length
        ? filterKylRecords(mwsData.records, mwsSelections)
        : [];
    if (mwsData && mwsGeometry) {
      const matchedIds = new Set(matchedMwsRecords.map((record) => String(record.mws_id)));
      const collection = styledFeatureCollection(
        "MWS",
        mwsGeometry.collection,
        matchedIds,
        ["uid", "mws_id"],
      );
      prepared.push({
        collection,
        sourceUrl: mwsGeometry.url,
        summary: {
          source: "MWS",
          total: mwsGeometry.collection.features.length,
          matched: collection.features.filter((feature) => feature.properties?.coreMatch === 1)
            .length,
        },
      });
    }

    const candidateVillageIds = valuesFromMws(
      matchedMwsRecords,
      "mws_intersect_villages",
    );
    if (villageGeometry) {
      const villageRecords = villageData
        ? filterKylRecords(villageData.records, villageSelections)
        : [];
      const matchedIds = new Set(
        (villageSelections.length
          ? villageRecords.map((record) => String(record.village_id))
          : [...candidateVillageIds]
        ).filter((id) => !needsMws || candidateVillageIds.has(id)),
      );
      const collection = styledFeatureCollection(
        "Village",
        villageGeometry.collection,
        matchedIds,
        ["vill_ID", "village_id"],
      );
      prepared.push({
        collection,
        sourceUrl: villageGeometry.url,
        summary: {
          source: "Village",
          total: villageGeometry.collection.features.length,
          matched: collection.features.filter((feature) => feature.properties?.coreMatch === 1)
            .length,
          derived: !villageSelections.length,
        },
      });
    }

    if (waterbodyGeometry) {
      const allowedWaterbodyIds = valuesFromMws(
        matchedMwsRecords,
        "mws_intersect_swb",
      );
      const records = waterbodyGeometry.collection.features.map((feature) =>
        waterbodyExploreRecord({ ...(feature.properties ?? {}) }),
      );
      const matchedRecords = filterKylRecords(records, waterbodySelections).filter(
        (record) =>
          !needsMws ||
          allowedWaterbodyIds.has(
            String(
              record.UID ??
                record.swb_id ??
                record.SWB_UID ??
                record.swb_uid ??
                record.uid ??
                record.id ??
                "",
            ),
          ),
      );
      const matchedIds = new Set(
        matchedRecords.map((record) =>
          String(
            record.UID ??
              record.swb_id ??
              record.SWB_UID ??
              record.swb_uid ??
              record.uid ??
              record.id ??
              "",
          ),
        ),
      );
      const collection = styledFeatureCollection(
        "Waterbody",
        waterbodyGeometry.collection,
        matchedIds,
        ["UID", "swb_id", "SWB_UID", "swb_uid", "uid", "id"],
      );
      prepared.push({
        collection,
        sourceUrl: waterbodyGeometry.url,
        summary: {
          source: "Waterbody",
          total: waterbodyGeometry.collection.features.length,
          matched: collection.features.filter((feature) => feature.properties?.coreMatch === 1)
            .length,
        },
      });
    }

    return prepared;
  }
}
