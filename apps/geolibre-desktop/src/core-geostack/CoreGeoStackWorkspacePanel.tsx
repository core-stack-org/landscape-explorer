import { useSyncExternalStore } from "react";
import { CoreGeoStackExplorePanel } from "./CoreGeoStackExplorePanel";
import { CoreGeoStackFocusPanel } from "./CoreGeoStackFocusPanel";
import { CoreGeoStackStoryPanel } from "./CoreGeoStackStoryPanel";
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
  if (snapshot.mode === "explore") return <CoreGeoStackExplorePanel />;
  if (snapshot.mode === "stories") return <CoreGeoStackStoryPanel />;
  return <CoreGeoStackFocusPanel />;
}
