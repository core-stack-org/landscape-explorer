export const CORE_GEOSTACK_MODES = ["focus", "explore", "stories", "present"] as const;
export type CoreGeoStackMode = (typeof CORE_GEOSTACK_MODES)[number];

export interface CoreGeoStackLocation {
  state?: string;
  district?: string;
  tehsil?: string;
}

export type CoreGeoStackDataStatusKind =
  | "idle"
  | "loading"
  | "live"
  | "cached"
  | "partial"
  | "offline"
  | "error";

export interface CoreGeoStackDataStatus {
  kind: CoreGeoStackDataStatusKind;
  message: string;
  updatedAt?: string;
}

export type CoreGeoStackDataChannel = "boundary" | "layers";

export interface CoreGeoStackWorkspaceSnapshot {
  mode: CoreGeoStackMode;
  location: CoreGeoStackLocation;
  selectedLayerIds: readonly string[];
  selectedFilterIds: readonly string[];
  dataStatus: CoreGeoStackDataStatus;
}

export interface CoreGeoStackDurableState {
  mode?: CoreGeoStackMode;
  location?: CoreGeoStackLocation;
  selectedLayerIds?: readonly string[];
  selectedFilterIds?: readonly string[];
}

const DEFAULT_SELECTED_LAYERS = ["administrative_boundaries", "demographics"] as const;

export const DEFAULT_CORE_GEOSTACK_WORKSPACE: CoreGeoStackWorkspaceSnapshot = Object.freeze({
  mode: "focus",
  location: Object.freeze({}),
  selectedLayerIds: DEFAULT_SELECTED_LAYERS,
  selectedFilterIds: Object.freeze([]),
  dataStatus: Object.freeze({
    kind: "idle",
    message: "Preparing the Pan-India boundary view",
  }),
});

function normalizedMode(value: string | null): CoreGeoStackMode {
  return CORE_GEOSTACK_MODES.includes(value as CoreGeoStackMode)
    ? (value as CoreGeoStackMode)
    : "focus";
}

function unique(values: Iterable<string>): string[] {
  return [...new Set([...values].map((value) => value.trim()).filter(Boolean))];
}

export function parseCoreGeoStackUrl(
  params: URLSearchParams,
  fallback: CoreGeoStackWorkspaceSnapshot = DEFAULT_CORE_GEOSTACK_WORKSPACE,
): CoreGeoStackWorkspaceSnapshot {
  const location = {
    state: params.get("state")?.trim() || undefined,
    district: params.get("district")?.trim() || undefined,
    tehsil: params.get("tehsil")?.trim() || undefined,
  };
  const layers = unique(params.getAll("layer"));
  const filters = unique(params.getAll("filter"));
  return {
    ...fallback,
    mode: normalizedMode(params.get("mode")),
    location,
    selectedLayerIds: layers.length ? layers : fallback.selectedLayerIds,
    selectedFilterIds: filters,
  };
}

export function serializeCoreGeoStackUrl(
  snapshot: CoreGeoStackWorkspaceSnapshot,
  initial?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(initial);
  for (const key of ["mode", "state", "district", "tehsil", "layer", "filter"]) {
    params.delete(key);
  }
  params.set("mode", snapshot.mode);
  if (snapshot.location.state) params.set("state", snapshot.location.state);
  if (snapshot.location.district) params.set("district", snapshot.location.district);
  if (snapshot.location.tehsil) params.set("tehsil", snapshot.location.tehsil);
  for (const layerId of unique(snapshot.selectedLayerIds)) params.append("layer", layerId);
  for (const filterId of unique(snapshot.selectedFilterIds)) params.append("filter", filterId);
  params.sort();
  return params;
}

let snapshot: CoreGeoStackWorkspaceSnapshot =
  typeof window === "undefined"
    ? DEFAULT_CORE_GEOSTACK_WORKSPACE
    : parseCoreGeoStackUrl(new URLSearchParams(window.location.search));
const listeners = new Set<() => void>();
const dataStatusChannels: Record<CoreGeoStackDataChannel, CoreGeoStackDataStatus> = {
  boundary: {
    kind: "idle",
    message: "Preparing the Pan-India boundary view",
  },
  layers: {
    kind: "idle",
    message: "Choose an active tehsil to load KYL layers",
  },
};

function combinedDataStatus(): CoreGeoStackDataStatus {
  const statuses = [
    dataStatusChannels.layers,
    dataStatusChannels.boundary,
  ].filter((status) => status.kind !== "idle");
  if (!statuses.length) return DEFAULT_CORE_GEOSTACK_WORKSPACE.dataStatus;

  const kinds = new Set(statuses.map((status) => status.kind));
  let kind: CoreGeoStackDataStatusKind;
  if (kinds.has("loading")) kind = "loading";
  else if (kinds.has("error"))
    kind = statuses.length > 1 ? "partial" : "error";
  else if (kinds.has("offline")) kind = "offline";
  else if (kinds.has("partial")) kind = "partial";
  else if (kinds.has("live")) kind = "live";
  else kind = "cached";

  const updatedAt = statuses
    .map((status) => status.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  return {
    kind,
    message: unique(statuses.map((status) => status.message)).join(" · "),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function publish(next: CoreGeoStackWorkspaceSnapshot, historyMode?: "push" | "replace"): void {
  snapshot = {
    ...next,
    location: { ...next.location },
    selectedLayerIds: [...next.selectedLayerIds],
    selectedFilterIds: [...next.selectedFilterIds],
    dataStatus: { ...next.dataStatus },
  };
  if (historyMode && typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.search = serializeCoreGeoStackUrl(snapshot, url.searchParams).toString();
    window.history[historyMode === "push" ? "pushState" : "replaceState"](
      { coreGeoStack: true },
      "",
      url,
    );
  }
  for (const listener of listeners) listener();
}

export function getCoreGeoStackWorkspaceSnapshot(): CoreGeoStackWorkspaceSnapshot {
  return snapshot;
}

export function subscribeCoreGeoStackWorkspace(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setCoreGeoStackMode(mode: CoreGeoStackMode): void {
  if (snapshot.mode === mode) return;
  publish({ ...snapshot, mode }, "push");
}

export function setCoreGeoStackLocation(location: CoreGeoStackLocation): void {
  publish({ ...snapshot, location }, "push");
}

export function toggleCoreGeoStackLayer(layerId: string): void {
  const selected = new Set(snapshot.selectedLayerIds);
  if (selected.has(layerId)) selected.delete(layerId);
  else selected.add(layerId);
  publish({ ...snapshot, selectedLayerIds: [...selected] }, "push");
}

export function toggleCoreGeoStackFilter(filterId: string): void {
  const selected = new Set(snapshot.selectedFilterIds);
  if (selected.has(filterId)) selected.delete(filterId);
  else selected.add(filterId);
  publish({ ...snapshot, selectedFilterIds: [...selected] }, "push");
}

export function setCoreGeoStackDataStatus(
  channel: CoreGeoStackDataChannel,
  dataStatus: CoreGeoStackDataStatus,
): void {
  dataStatusChannels[channel] = { ...dataStatus };
  publish({ ...snapshot, dataStatus: combinedDataStatus() });
}

export function applyCoreGeoStackDurableState(state: CoreGeoStackDurableState): void {
  publish(
    {
      ...snapshot,
      mode: state.mode ?? snapshot.mode,
      location: state.location ? { ...state.location } : snapshot.location,
      selectedLayerIds: state.selectedLayerIds
        ? unique(state.selectedLayerIds)
        : snapshot.selectedLayerIds,
      selectedFilterIds: state.selectedFilterIds
        ? unique(state.selectedFilterIds)
        : snapshot.selectedFilterIds,
    },
    "replace",
  );
}

export function coreGeoStackDurableState(): CoreGeoStackDurableState {
  return {
    mode: snapshot.mode,
    location: { ...snapshot.location },
    selectedLayerIds: [...snapshot.selectedLayerIds],
    selectedFilterIds: [...snapshot.selectedFilterIds],
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    publish(
      parseCoreGeoStackUrl(new URLSearchParams(window.location.search), {
        ...snapshot,
        dataStatus: snapshot.dataStatus,
      }),
    );
  });
}
