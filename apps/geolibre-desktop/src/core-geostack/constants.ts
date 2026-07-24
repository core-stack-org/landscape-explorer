export const CORE_GEOSTACK_NAME = "CoRE-GeoStack";
export const CORE_GEOSTACK_TAGLINE = "Know Your Landscape";
export const CORE_GEOSTACK_PLUGIN_ID = "core-geostack-kyl";
export const CORE_GEOSTACK_PANEL_ID = "core-geostack-focus";

export const INDIA_VIEW = Object.freeze({
  center: [78.9629, 22.5937] as [number, number],
  zoom: 4.35,
  bearing: 0,
  pitch: 0,
});

export const CORE_GEOSTACK_COLORS = Object.freeze({
  boundary: "#41d9e8",
  selection: "#8b5cf6",
  selectionFill: "rgba(139, 92, 246, 0.22)",
  context: "#94a3b8",
  live: "#4ade80",
  warning: "#f59e0b",
  error: "#ef4444",
});

export interface CoreGeoStackRuntimeConfig {
  basemapStyleUrl: string | null;
  geoserverUrl: string;
  tehsilPmtilesUrl: string | null;
  tehsilSourceLayer: string;
  villagePmtilesUrl: string | null;
  villageSourceLayer: string;
  villageMinZoom: number;
}

const DEFAULT_GEOSERVER_URL = "https://geoserver.core-stack.org:8443/geoserver/";
const DEFAULT_BASEMAP_STYLE_URL = "/basemaps/google-hybrid.json";

function envValue(name: string): string | null {
  const meta = import.meta as ImportMeta & { env?: Record<string, unknown> };
  const value = meta.env?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function serviceRoot(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function numericEnv(name: string, fallback: number): number {
  const value = Number(envValue(name));
  return Number.isFinite(value) ? value : fallback;
}

export function getCoreGeoStackRuntimeConfig(): CoreGeoStackRuntimeConfig {
  return {
    // Preserve KYL's existing Google hybrid context by default. Deployments can
    // replace it with an authorized Google style or any MapLibre style URL.
    basemapStyleUrl:
      envValue("VITE_CORE_GEOSTACK_BASEMAP_STYLE_URL") ?? DEFAULT_BASEMAP_STYLE_URL,
    geoserverUrl: serviceRoot(
      envValue("VITE_CORE_GEOSTACK_GEOSERVER_URL") ?? DEFAULT_GEOSERVER_URL,
    ),
    tehsilPmtilesUrl: envValue("VITE_CORE_GEOSTACK_TEHSIL_PMTILES_URL"),
    tehsilSourceLayer:
      envValue("VITE_CORE_GEOSTACK_TEHSIL_SOURCE_LAYER") ?? "tehsils",
    villagePmtilesUrl: envValue("VITE_CORE_GEOSTACK_VILLAGE_PMTILES_URL"),
    villageSourceLayer:
      envValue("VITE_CORE_GEOSTACK_VILLAGE_SOURCE_LAYER") ?? "villages",
    villageMinZoom: numericEnv("VITE_CORE_GEOSTACK_VILLAGE_MIN_ZOOM", 9.5),
  };
}
