import { useAppStore } from "@geolibre/core";
import type { CoreGeoStackLayerRuntime } from "./layer-runtime";
import { CORE_GEOSTACK_LAYERS, coreGeoStackLayer } from "./layer-catalog";
import type { LulcNotebookSelection } from "./notebook-artifacts";
import {
  applyCoreGeoStackDurableState,
  getCoreGeoStackWorkspaceSnapshot,
} from "./workspace-state";

let layerRuntime: CoreGeoStackLayerRuntime | null = null;
let activeComparison: { beforeId: string; afterId: string } | null = null;

export function bindCoreGeoStackComparisonRuntime(
  runtime: CoreGeoStackLayerRuntime | null,
): void {
  layerRuntime = runtime;
}

async function waitForLayerIds(
  beforeDefinitionId: string,
  afterDefinitionId: string,
): Promise<[string, string]> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const beforeId = layerRuntime?.getLayerId(beforeDefinitionId);
    const afterId = layerRuntime?.getLayerId(afterDefinitionId);
    if (beforeId && afterId) return [beforeId, afterId];
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  throw new Error("The two LULC layers did not become ready. Try the comparison again.");
}

export async function openCoreGeoStackLulcComparison(
  selection: LulcNotebookSelection,
): Promise<void> {
  if (!layerRuntime) throw new Error("The KYL layer runtime is not ready.");
  if (selection.beforeYear === selection.afterYear) {
    throw new Error("Choose two different LULC years.");
  }
  const beforeDefinitionId = `lulc_level_${selection.level}_${selection.beforeYear}`;
  const afterDefinitionId = `lulc_level_${selection.level}_${selection.afterYear}`;
  const beforeDefinition = coreGeoStackLayer(beforeDefinitionId);
  const afterDefinition = coreGeoStackLayer(afterDefinitionId);
  if (!beforeDefinition || !afterDefinition) {
    throw new Error("The selected LULC comparison is not available.");
  }

  const workspace = getCoreGeoStackWorkspaceSnapshot();
  applyCoreGeoStackDurableState({
    selectedLayerIds: [
      ...new Set([
        ...workspace.selectedLayerIds,
        "administrative_boundaries",
        beforeDefinitionId,
        afterDefinitionId,
      ]),
    ],
  });

  const [beforeId, afterId] = await waitForLayerIds(
    beforeDefinitionId,
    afterDefinitionId,
  );
  const store = useAppStore.getState();
  for (const definition of CORE_GEOSTACK_LAYERS) {
    if (!definition.year) continue;
    const id = layerRuntime.getLayerId(definition.id);
    if (id) store.setLayerVisibility(id, false);
  }
  store.setLayerVisibility(beforeId, true);
  store.setLayerVisibility(afterId, false);
  store.setMapGrid(1, 2);
  store.setSyncView(true);
  store.setPrimaryMapLabel(beforeDefinition.label);
  const pane = useAppStore.getState().secondaryMapViews[0];
  if (!pane) throw new Error("GeoLibre could not create the comparison pane.");
  store.setSecondaryLayerVisibility(pane.id, beforeId, false);
  store.setSecondaryLayerVisibility(pane.id, afterId, true);
  store.setSecondaryMapLabel(pane.id, afterDefinition.label);
  activeComparison = { beforeId, afterId };
}

export function closeCoreGeoStackLulcComparison(): void {
  const store = useAppStore.getState();
  store.setMapGrid(1, 1);
  store.setPrimaryMapLabel("");
  if (activeComparison) {
    store.setLayerVisibility(activeComparison.beforeId, false);
    store.setLayerVisibility(activeComparison.afterId, true);
  }
  activeComparison = null;
}
