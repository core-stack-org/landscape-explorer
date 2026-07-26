import { useAppStore } from "@geolibre/core";
import { Button, cn } from "@geolibre/ui";
import {
  BookOpen,
  FilePenLine,
  Layers3,
  MapPin,
  Play,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  getKylExploreRuntimeSnapshot,
  subscribeKylExploreRuntime,
} from "./explore-runtime";
import {
  buildCoreGeoStackTehsilStory,
  isCoreGeoStackTehsilStory,
  summarizeCoreGeoStackTehsilStory,
  type CoreGeoStackTehsilStorySummary,
} from "./story-builder";
import {
  getCoreGeoStackWorkspaceSnapshot,
  setCoreGeoStackMode,
  subscribeCoreGeoStackWorkspace,
} from "./workspace-state";

function storyStatusClass(kind: string): string {
  if (kind === "live") return "border-emerald-500/30 bg-emerald-500/10";
  if (kind === "loading") return "border-cyan-500/30 bg-cyan-500/10";
  if (kind === "error") return "border-red-500/30 bg-red-500/10";
  return "border-border bg-muted/30";
}

interface StoryPlan {
  story: ReturnType<typeof buildCoreGeoStackTehsilStory>;
  summary: CoreGeoStackTehsilStorySummary;
}

export function CoreGeoStackStoryPanel() {
  const workspace = useSyncExternalStore(
    subscribeCoreGeoStackWorkspace,
    getCoreGeoStackWorkspaceSnapshot,
    getCoreGeoStackWorkspaceSnapshot,
  );
  const explore = useSyncExternalStore(
    subscribeKylExploreRuntime,
    getKylExploreRuntimeSnapshot,
    getKylExploreRuntimeSnapshot,
  );
  const layers = useAppStore((state) => state.layers);
  const mapView = useAppStore((state) => state.mapView);
  const storymap = useAppStore((state) => state.storymap);
  const setStorymap = useAppStore((state) => state.setStorymap);
  const setStorymapPanelOpen = useAppStore((state) => state.setStorymapPanelOpen);
  const setStorymapPresenting = useAppStore((state) => state.setStorymapPresenting);
  const [buildError, setBuildError] = useState<string | null>(null);

  const hasTehsil = Boolean(
    workspace.location.state && workspace.location.district && workspace.location.tehsil,
  );
  const plan = useMemo<StoryPlan | null>(() => {
    const { state, district, tehsil } = workspace.location;
    if (!state || !district || !tehsil) return null;
    const input = {
      location: { state, district, tehsil },
      selectedLayerIds: workspace.selectedLayerIds,
      selectedFilterIds: workspace.selectedFilterIds,
      mapView,
      layers,
      results: explore.results,
    };
    return {
      story: buildCoreGeoStackTehsilStory(input),
      summary: summarizeCoreGeoStackTehsilStory(input),
    };
  }, [explore.results, layers, mapView, workspace]);

  const activeStory = storymap;
  const generatedForTehsil = isCoreGeoStackTehsilStory(activeStory);
  const waitingForResults =
    workspace.selectedFilterIds.length > 0 && explore.kind === "loading";

  const buildStory = () => {
    if (!plan) return;
    if (
      activeStory?.chapters.length &&
      !window.confirm(
        "Replace the current story with a new story generated from this tehsil workspace?",
      )
    ) {
      return;
    }
    setBuildError(null);
    try {
      setStorymap(plan.story);
    } catch (error) {
      const summary = error instanceof Error ? error.message : String(error);
      setBuildError(summary);
    }
  };

  const readStory = () => {
    if (!activeStory?.chapters.length) return;
    setStorymapPresenting(true);
  };

  const editStory = () => {
    setStorymapPanelOpen(true);
  };

  if (!hasTehsil) {
    return (
      <section className="flex h-full min-h-0 flex-col bg-card text-card-foreground">
        <header className="border-b px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Stories workspace
          </p>
          <h2 className="mt-0.5 text-sm font-semibold">Choose a tehsil first</h2>
        </header>
        <div className="grid min-h-0 flex-1 place-items-center p-6 text-center">
          <div className="max-w-64">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold">Every story starts from place</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Select a tehsil in Focus. Stories will reuse its KYL layers, filters,
              map camera, and evidence summaries.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-4 min-h-10"
              onClick={() => setCoreGeoStackMode("focus")}
            >
              Choose a tehsil
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-card text-card-foreground">
      <header className="border-b px-3 pb-3 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          Stories workspace
        </p>
        <h2 className="mt-0.5 truncate text-sm font-semibold">
          {workspace.location.tehsil} · {workspace.location.district}
        </h2>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          Generate an editable, scroll-driven GeoLibre story from the current KYL
          workspace.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-md border bg-background px-2.5 py-2">
            <span className="block text-[10px] text-muted-foreground">Layers</span>
            <span className="block text-sm font-semibold tabular-nums">
              {plan?.summary.liveLayerCount ?? 0}
            </span>
          </div>
          <div className="rounded-md border bg-background px-2.5 py-2">
            <span className="block text-[10px] text-muted-foreground">Filters</span>
            <span className="block text-sm font-semibold tabular-nums">
              {plan?.summary.filterCount ?? 0}
            </span>
          </div>
          <div className="rounded-md border bg-background px-2.5 py-2">
            <span className="block text-[10px] text-muted-foreground">Evidence</span>
            <span className="block text-sm font-semibold tabular-nums">
              {explore.results.length}
            </span>
          </div>
        </div>

        {workspace.selectedFilterIds.length ? (
          <div
            className={cn(
              "mt-3 rounded-md border px-3 py-2 text-xs",
              storyStatusClass(explore.kind),
            )}
            role="status"
            aria-live="polite"
          >
            <span className="font-semibold capitalize">{explore.kind}</span>
            <span className="mx-1">·</span>
            {explore.message}
          </div>
        ) : null}

        <div className="mt-3 rounded-md border bg-background p-3">
          <div className="flex items-start gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold">
                {activeStory
                  ? generatedForTehsil
                    ? "Tehsil story ready"
                    : "Current project story"
                  : "Build a tehsil story"}
              </h3>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                {activeStory
                  ? `${activeStory.chapters.length} chapters · ${activeStory.title || "Untitled story"}`
                  : `${plan?.story.chapters.length ?? 0} evidence-bearing chapters are ready to generate.`}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {activeStory?.chapters.length ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={readStory}
                >
                  <Play className="me-1.5 h-3.5 w-3.5" />
                  Read story
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={editStory}
                >
                  <FilePenLine className="me-1.5 h-3.5 w-3.5" />
                  Edit chapters
                </Button>
              </div>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant={activeStory ? "outline" : "default"}
              disabled={!plan || waitingForResults}
              onClick={buildStory}
            >
              {activeStory ? (
                <RefreshCw className="me-1.5 h-3.5 w-3.5" />
              ) : (
                <ScrollText className="me-1.5 h-3.5 w-3.5" />
              )}
              {waitingForResults
                ? "Waiting for Explore evidence"
                : activeStory
                  ? "Rebuild from workspace"
                  : "Build tehsil story"}
            </Button>
          </div>
          {buildError ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {buildError}
            </p>
          ) : null}
        </div>

        {(activeStory ?? plan?.story)?.chapters.length ? (
          <div className="mt-3">
            <div className="mb-2 flex items-center gap-2">
              <Layers3 className="h-3.5 w-3.5 text-primary" />
              <h3 className="text-xs font-semibold">Scene sequence</h3>
            </div>
            <ol className="space-y-1.5">
              {(activeStory ?? plan?.story)?.chapters.map((chapter, index) => (
                <li
                  key={chapter.id}
                  className="flex min-h-11 items-center gap-2 rounded-md border bg-background px-2.5 py-2"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 truncate text-xs font-medium">
                    {chapter.title}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <footer className="border-t bg-muted/25 px-3 py-2.5">
        <p className="text-[11px] leading-4 text-muted-foreground">
          One tehsil workspace · one editable GeoLibre story
        </p>
      </footer>
    </section>
  );
}
