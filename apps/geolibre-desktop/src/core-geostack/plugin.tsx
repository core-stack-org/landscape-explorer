import { DEFAULT_PROJECT_NAME, useAppStore } from "@geolibre/core";
import type { GeoLibreAppAPI, GeoLibrePlugin } from "@geolibre/plugins";
import { createRoot, type Root } from "react-dom/client";
import {
  CORE_GEOSTACK_NAME,
  CORE_GEOSTACK_PANEL_ID,
  CORE_GEOSTACK_PLUGIN_ID,
  getCoreGeoStackRuntimeConfig,
  INDIA_VIEW,
} from "./constants";
import { CoreGeoStackWorkspacePanel } from "./CoreGeoStackWorkspacePanel";
import { mountCoreGeoStackBoundaryLayers } from "./boundary-layers";
import { CoreGeoStackExploreRuntime } from "./explore-runtime";
import { CoreGeoStackLayerRuntime } from "./layer-runtime";
import {
  applyCoreGeoStackDurableState,
  coreGeoStackDurableState,
  getCoreGeoStackWorkspaceSnapshot,
  parseCoreGeoStackUrl,
  subscribeCoreGeoStackWorkspace,
  type CoreGeoStackDurableState,
} from "./workspace-state";

let unregisterPanel: (() => void) | null = null;
let unsubscribeWorkspace: (() => void) | null = null;
let boundaryCleanup: (() => void) | null = null;
let layerRuntime: CoreGeoStackLayerRuntime | null = null;
let exploreRuntime: CoreGeoStackExploreRuntime | null = null;
let activeApp: GeoLibreAppAPI | null = null;
let lastMode: string | null = null;
let previousProjection: "globe" | "mercator" | null = null;

function renderWorkspacePanel(container: HTMLElement): () => void {
  const root: Root = createRoot(container);
  root.render(<CoreGeoStackWorkspacePanel />);
  return () => root.unmount();
}

function syncWorkspaceChrome(app: GeoLibreAppAPI): void {
  const snapshot = getCoreGeoStackWorkspaceSnapshot();
  if (lastMode !== snapshot.mode) {
    lastMode = snapshot.mode;
    app.openRightPanel?.(CORE_GEOSTACK_PANEL_ID);
  }
  void layerRuntime?.sync(snapshot);
  void exploreRuntime?.sync(snapshot);
}

function attachToCurrentMap(app: GeoLibreAppAPI): void {
  boundaryCleanup?.();
  boundaryCleanup = null;
  const map = app.getMap?.();
  if (!map) return;
  boundaryCleanup = mountCoreGeoStackBoundaryLayers(map);

  const store = useAppStore.getState();
  const hasExplicitView =
    typeof window !== "undefined" &&
    ["state", "district", "tehsil", "url"].some((key) =>
      new URLSearchParams(window.location.search).has(key),
    );
  if (
    store.projectName === DEFAULT_PROJECT_NAME &&
    store.projectGeneration === 0 &&
    !hasExplicitView
  ) {
    map.jumpTo(INDIA_VIEW);
    store.setMapView(INDIA_VIEW);
  }
}

function activateCoreGeoStack(app: GeoLibreAppAPI): void {
  activeApp = app;
  previousProjection ??= app.getMapProjection?.() ?? "globe";
  app.setMapProjection?.("mercator");
  const config = getCoreGeoStackRuntimeConfig();
  if (config.basemapStyleUrl) app.setBasemap(config.basemapStyleUrl);
  app.setBuiltInMapControlVisible("navigation", true);
  app.setBuiltInMapControlVisible("geolocate", true);
  app.setBuiltInMapControlVisible("scale", true);

  unregisterPanel?.();
  unregisterPanel =
    app.registerRightPanel?.({
      id: CORE_GEOSTACK_PANEL_ID,
      title: "KYL workspace",
      dock: "replace-layers",
      defaultWidth: 360,
      render: renderWorkspacePanel,
    }) ?? null;

  layerRuntime?.dispose();
  layerRuntime = new CoreGeoStackLayerRuntime(app);
  exploreRuntime?.dispose();
  exploreRuntime = new CoreGeoStackExploreRuntime(app);
  unsubscribeWorkspace?.();
  unsubscribeWorkspace = subscribeCoreGeoStackWorkspace(() => syncWorkspaceChrome(app));
  lastMode = null;
  attachToCurrentMap(app);
  syncWorkspaceChrome(app);
}

function deactivateCoreGeoStack(): void {
  unsubscribeWorkspace?.();
  unsubscribeWorkspace = null;
  unregisterPanel?.();
  unregisterPanel = null;
  boundaryCleanup?.();
  boundaryCleanup = null;
  layerRuntime?.dispose();
  layerRuntime = null;
  exploreRuntime?.dispose();
  exploreRuntime = null;
  if (previousProjection) activeApp?.setMapProjection?.(previousProjection);
  activeApp = null;
  lastMode = null;
  previousProjection = null;
}

export function restoreCoreGeoStack(app: GeoLibreAppAPI): void {
  if (!activeApp) return;
  activeApp = app;
  attachToCurrentMap(app);
  layerRuntime?.dispose();
  layerRuntime = new CoreGeoStackLayerRuntime(app);
  exploreRuntime?.dispose();
  exploreRuntime = new CoreGeoStackExploreRuntime(app);
  const snapshot = getCoreGeoStackWorkspaceSnapshot();
  void layerRuntime.sync(snapshot);
  void exploreRuntime.sync(snapshot);
}

export const coreGeoStackPlugin: GeoLibrePlugin = {
  id: CORE_GEOSTACK_PLUGIN_ID,
  name: CORE_GEOSTACK_NAME,
  version: "0.1.0",
  urlParameterNames: ["mode", "state", "district", "tehsil", "layer", "filter"],
  activate(app) {
    activateCoreGeoStack(app);
  },
  deactivate() {
    deactivateCoreGeoStack();
  },
  handleUrlParameters(app, params) {
    const parsed = parseCoreGeoStackUrl(params, getCoreGeoStackWorkspaceSnapshot());
    applyCoreGeoStackDurableState({
      mode: parsed.mode,
      location: parsed.location,
      selectedLayerIds: parsed.selectedLayerIds,
      selectedFilterIds: parsed.selectedFilterIds,
    });
    syncWorkspaceChrome(app);
  },
  getProjectState(): CoreGeoStackDurableState {
    return coreGeoStackDurableState();
  },
  applyProjectState(_app, state) {
    if (!state || typeof state !== "object") return false;
    applyCoreGeoStackDurableState(state as CoreGeoStackDurableState);
    return true;
  },
};
