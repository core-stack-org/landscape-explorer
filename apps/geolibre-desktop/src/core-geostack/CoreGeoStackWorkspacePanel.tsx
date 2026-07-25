import { useSyncExternalStore } from "react";
import { CoreGeoStackExplorePanel } from "./CoreGeoStackExplorePanel";
import { CoreGeoStackFocusPanel } from "./CoreGeoStackFocusPanel";
import {
  getCoreGeoStackWorkspaceSnapshot,
  subscribeCoreGeoStackWorkspace,
} from "./workspace-state";

export function CoreGeoStackWorkspacePanel() {
  const snapshot = useSyncExternalStore(
    subscribeCoreGeoStackWorkspace,
    getCoreGeoStackWorkspaceSnapshot,
    getCoreGeoStackWorkspaceSnapshot,
  );
  return snapshot.mode === "explore" ? (
    <CoreGeoStackExplorePanel />
  ) : (
    <CoreGeoStackFocusPanel />
  );
}
