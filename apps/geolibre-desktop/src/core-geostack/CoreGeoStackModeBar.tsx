import { useAppStore } from "@geolibre/core";
import { collapseRightPanel, openRightPanel } from "@geolibre/plugins";
import { Button, cn } from "@geolibre/ui";
import { BookOpen, Compass, Crosshair, MonitorPlay } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  CORE_GEOSTACK_NAME,
  CORE_GEOSTACK_PANEL_ID,
  CORE_GEOSTACK_TAGLINE,
} from "./constants";
import {
  getCoreGeoStackWorkspaceSnapshot,
  setCoreGeoStackMode,
  subscribeCoreGeoStackWorkspace,
  type CoreGeoStackMode,
} from "./workspace-state";

const modes = [
  { id: "focus" as const, label: "Focus", icon: Crosshair },
  { id: "explore" as const, label: "Explore", icon: Compass },
  { id: "stories" as const, label: "Stories", icon: BookOpen },
  { id: "present" as const, label: "Present", icon: MonitorPlay },
];

function statusColor(kind: string): string {
  if (kind === "live") return "bg-emerald-400";
  if (kind === "loading" || kind === "cached") return "bg-cyan-400";
  if (kind === "partial" || kind === "idle") return "bg-amber-400";
  return "bg-red-400";
}

function CoreGeoStackMark() {
  return (
    <span className="grid h-5 w-5 shrink-0 grid-cols-3 gap-0.5" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span
          key={index}
          className={cn(
            "rounded-full bg-primary",
            index === 1 || index === 5 || index === 6 ? "opacity-35" : "opacity-100",
          )}
        />
      ))}
    </span>
  );
}
export function CoreGeoStackModeBar({ showIdentity = true }: { showIdentity?: boolean }) {
  const snapshot = useSyncExternalStore(
    subscribeCoreGeoStackWorkspace,
    getCoreGeoStackWorkspaceSnapshot,
    getCoreGeoStackWorkspaceSnapshot,
  );

  const activateMode = (mode: CoreGeoStackMode) => {
    setCoreGeoStackMode(mode);
    const app = useAppStore.getState();
    if (mode === "focus" || mode === "explore") {
      openRightPanel(CORE_GEOSTACK_PANEL_ID);
      return;
    }
    collapseRightPanel(CORE_GEOSTACK_PANEL_ID);
    if (mode === "stories") {
      app.setStorymapPresenting(false);
      app.setStorymapPanelOpen(true);
      return;
    }
    if (mode === "present") {
      if (app.storymap?.chapters.length) app.setStorymapPresenting(true, true);
      else app.setStorymapPanelOpen(true);
    }
  };

  return (
    <>
      {showIdentity ? (
        <span className="me-1 flex shrink-0 items-center gap-2 md:me-2">
          <CoreGeoStackMark />
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-semibold leading-4 text-foreground">
              {CORE_GEOSTACK_NAME}
            </span>
            <span className="hidden text-[10px] leading-3 text-muted-foreground xl:block">
              {CORE_GEOSTACK_TAGLINE}
            </span>
          </span>
        </span>
      ) : null}
      <nav
        className="flex shrink-0 items-center gap-0.5 rounded-md border bg-muted/45 p-0.5"
        aria-label="CoRE-GeoStack workspace mode"
      >
        {modes.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={snapshot.mode === id ? "secondary" : "ghost"}
            className={cn(
              "h-8 min-w-8 px-2 text-xs",
              snapshot.mode === id && "bg-background text-primary shadow-sm",
            )}
            aria-pressed={snapshot.mode === id}
            title={`${label} mode`}
            onClick={() => activateMode(id)}
          >
            <Icon className="h-3.5 w-3.5 lg:me-1.5" />
            <span className="hidden lg:inline">{label}</span>
          </Button>
        ))}
      </nav>
      <span
        className="ms-1 hidden shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] text-muted-foreground 2xl:flex"
        title={snapshot.dataStatus.message}
        aria-label={`Data status: ${snapshot.dataStatus.kind}. ${snapshot.dataStatus.message}`}
      >
        <span className={cn("h-2 w-2 rounded-full", statusColor(snapshot.dataStatus.kind))} />
        {snapshot.dataStatus.kind === "live" ? "Live" : snapshot.dataStatus.kind}
      </span>
    </>
  );
}
