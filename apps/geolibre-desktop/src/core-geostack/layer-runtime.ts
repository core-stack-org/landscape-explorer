import { useAppStore, type LayerStyle } from "@geolibre/core";
import type { GeoLibreAppAPI } from "@geolibre/plugins";
import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import { getCoreGeoStackRuntimeConfig } from "./constants";
import {
  coreGeoStackLayer,
  slugLocationPart,
  type CoreGeoStackLayerDefinition,
} from "./layer-catalog";
import {
  setCoreGeoStackDataStatus,
  type CoreGeoStackWorkspaceSnapshot,
} from "./workspace-state";

type FeatureData = FeatureCollection<Geometry, GeoJsonProperties>;

const vectorStyleProfiles: Record<string, Partial<LayerStyle>> = {
  boundary: {
    fillColor: "#ffffff",
    fillOpacity: 0,
    strokeColor: "#41d9e8",
    strokeWidth: 1.5,
  },
  demographics: {
    fillColor: "#98fb98",
    fillOpacity: 0.65,
    strokeColor: "#0f172a",
    strokeWidth: 0.8,
    vectorStyleMode: "expression",
    vectorStyleExpression: JSON.stringify([
      "step",
      [
        "*",
        [
          "/",
          ["to-number", ["get", "P_LIT"], 0],
          ["max", ["to-number", ["get", "TOT_P"], 1], 1],
        ],
        100,
      ],
      "#98fb98",
      46,
      "#32cd32",
      59,
      "#228b22",
      70,
      "#006400",
    ]),
  },
  mws: {
    fillColor: "#25b63c",
    fillOpacity: 0.55,
    strokeColor: "#172554",
    strokeWidth: 0.8,
  },
  drainage: {
    fillOpacity: 0,
    strokeColor: "#38bdf8",
    strokeWidth: 2,
  },
  waterbodies: {
    fillColor: "#38bdf8",
    fillOpacity: 0.55,
    strokeColor: "#0369a1",
    strokeWidth: 1.5,
  },
  nrega: {
    fillColor: "#8b5cf6",
    fillOpacity: 0.9,
    strokeColor: "#ffffff",
    strokeWidth: 1,
    circleRadius: 6,
  },
};

function isFeatureCollection(value: unknown): value is FeatureData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FeatureData>;
  return candidate.type === "FeatureCollection" && Array.isArray(candidate.features);
}

function wfsUrl(
  definition: CoreGeoStackLayerDefinition,
  district: string,
  tehsil: string,
): string {
  const config = getCoreGeoStackRuntimeConfig();
  const layerName = definition.layerName({ district, tehsil });
  const url = new URL(`${config.geoserverUrl}${definition.workspace}/ows`);
  url.search = new URLSearchParams({
    service: "WFS",
    version: "1.0.0",
    request: "GetFeature",
    typeName: `${definition.workspace}:${layerName}`,
    outputFormat: "application/json",
    screen: "main",
  }).toString();
  return url.href;
}

function wmsUrl(definition: CoreGeoStackLayerDefinition): string {
  const config = getCoreGeoStackRuntimeConfig();
  return `${config.geoserverUrl}${definition.workspace}/wms`;
}

function visitCoordinates(value: unknown, visit: (lng: number, lat: number) => void): void {
  if (!Array.isArray(value)) return;
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1])
  ) {
    visit(value[0], value[1]);
    return;
  }
  for (const child of value) visitCoordinates(child, visit);
}

function featureBounds(data: FeatureData): [number, number, number, number] | null {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const feature of data.features) {
    if (!feature.geometry) continue;
    const geometry = feature.geometry as Geometry & { coordinates?: unknown; geometries?: Geometry[] };
    if (geometry.type === "GeometryCollection") {
      for (const child of geometry.geometries ?? []) {
        visitCoordinates((child as Geometry & { coordinates?: unknown }).coordinates, update);
      }
    } else {
      visitCoordinates(geometry.coordinates, update);
    }
  }
  function update(lng: number, lat: number) {
    west = Math.min(west, lng);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    north = Math.max(north, lat);
  }
  return [west, south, east, north].every(Number.isFinite)
    ? [west, south, east, north]
    : null;
}

export class CoreGeoStackLayerRuntime {
  private syncKey = "";
  private generation = 0;
  private controller: AbortController | null = null;
  private layerIds = new Map<string, string>();
  private vectorCache = new Map<string, FeatureData>();

  constructor(private readonly app: GeoLibreAppAPI) {}

  async sync(snapshot: CoreGeoStackWorkspaceSnapshot): Promise<void> {
    const districtLabel = snapshot.location.district;
    const tehsilLabel = snapshot.location.tehsil;
    const desired = snapshot.selectedLayerIds
      .map(coreGeoStackLayer)
      .filter((layer): layer is CoreGeoStackLayerDefinition => layer !== null);
    const nextKey = JSON.stringify({
      districtLabel,
      tehsilLabel,
      layers: desired.map((layer) => layer.id).sort(),
    });
    if (nextKey === this.syncKey) return;
    this.syncKey = nextKey;
    const generation = ++this.generation;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;

    if (!districtLabel || !tehsilLabel) {
      this.clearLoadedLayers();
      setCoreGeoStackDataStatus("layers", {
        kind: "idle",
        message: "Choose an active tehsil to load KYL layers",
      });
      return;
    }

    const district = slugLocationPart(districtLabel);
    const tehsil = slugLocationPart(tehsilLabel);
    setCoreGeoStackDataStatus("layers", {
      kind: "loading",
      message: `Loading ${desired.length} KYL layer${desired.length === 1 ? "" : "s"} for ${tehsilLabel}`,
    });

    const added = new Map<string, string>();
    const errors: string[] = [];
    await Promise.all(
      desired.map(async (definition) => {
        try {
          const id =
            definition.sourceType === "wfs"
              ? await this.addVectorLayer(definition, district, tehsil, controller.signal)
              : this.addRasterLayer(definition, district, tehsil);
          if (id) added.set(definition.id, id);
        } catch (error) {
          if (controller.signal.aborted) return;
          errors.push(
            `${definition.label}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }),
    );

    if (generation !== this.generation || controller.signal.aborted) {
      for (const id of added.values()) useAppStore.getState().removeLayer(id);
      return;
    }

    const previous = this.layerIds;
    this.layerIds = added;
    for (const id of previous.values()) useAppStore.getState().removeLayer(id);

    setCoreGeoStackDataStatus("layers", {
      kind: errors.length ? (added.size ? "partial" : "error") : "live",
      message: errors.length
        ? `${added.size}/${desired.length} layers ready · ${errors.length} unavailable`
        : `${added.size} KYL layer${added.size === 1 ? "" : "s"} ready for ${tehsilLabel}`,
      updatedAt: new Date().toISOString(),
    });
  }

  dispose(): void {
    this.generation += 1;
    this.controller?.abort();
    this.clearLoadedLayers();
    this.vectorCache.clear();
  }

  private clearLoadedLayers(): void {
    for (const id of this.layerIds.values()) useAppStore.getState().removeLayer(id);
    this.layerIds.clear();
  }

  private async addVectorLayer(
    definition: CoreGeoStackLayerDefinition,
    district: string,
    tehsil: string,
    signal: AbortSignal,
  ): Promise<string> {
    const url = wfsUrl(definition, district, tehsil);
    let data = this.vectorCache.get(url);
    if (!data) {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`WFS returned HTTP ${response.status}`);
      const parsed = (await response.json()) as unknown;
      if (!isFeatureCollection(parsed)) throw new Error("WFS response is not GeoJSON");
      data = parsed;
      this.vectorCache.set(url, data);
    }
    const id = this.app.addGeoJsonLayer(definition.label, data, url);
    const style = vectorStyleProfiles[definition.styleProfile ?? ""];
    if (style) useAppStore.getState().setLayerStyle(id, style);
    const bounds = featureBounds(data);
    if (definition.id === "administrative_boundaries" && bounds) this.app.fitBounds?.(bounds);
    return id;
  }

  private addRasterLayer(
    definition: CoreGeoStackLayerDefinition,
    district: string,
    tehsil: string,
  ): string {
    if (!this.app.addWmsLayer) throw new Error("This GeoLibre host cannot add WMS layers");
    const layerName = definition.layerName({ district, tehsil });
    return this.app.addWmsLayer(definition.label, {
      url: wmsUrl(definition),
      layers: `${definition.workspace}:${layerName}`,
      styles: definition.wmsStyle ?? "",
      format: "image/png",
      transparent: true,
      version: "1.1.1",
      attribution: "CoRE Stack GeoServer",
    });
  }
}
