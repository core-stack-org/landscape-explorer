import { Button, cn } from "@geolibre/ui";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Compass,
  Droplets,
  FilterX,
  House,
  MapPin,
  Mountain,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  KYL_EXPLORE_PAGES,
  kylFilterSelectionId,
  resolveKylFilterSelections,
  type KylExploreSource,
} from "./explore-filters";
import {
  getKylExploreRuntimeSnapshot,
  subscribeKylExploreRuntime,
} from "./explore-runtime";
import {
  clearCoreGeoStackFilters,
  getCoreGeoStackWorkspaceSnapshot,
  setCoreGeoStackMode,
  subscribeCoreGeoStackWorkspace,
  toggleCoreGeoStackFilter,
} from "./workspace-state";

const PAGE_ICONS = {
  MWS: Mountain,
  Village: House,
  Waterbody: Droplets,
} as const;

function locationLabel(location: {
  state?: string;
  district?: string;
  tehsil?: string;
}): string {
  return [location.tehsil, location.district, location.state].filter(Boolean).join(" · ");
}

function runtimeClasses(kind: string): string {
  if (kind === "live") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  if (kind === "loading") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-700";
  if (kind === "error") return "border-red-500/30 bg-red-500/10 text-red-700";
  return "border-border bg-muted/40 text-muted-foreground";
}

export function CoreGeoStackExplorePanel() {
  const snapshot = useSyncExternalStore(
    subscribeCoreGeoStackWorkspace,
    getCoreGeoStackWorkspaceSnapshot,
    getCoreGeoStackWorkspaceSnapshot,
  );
  const runtime = useSyncExternalStore(
    subscribeKylExploreRuntime,
    getKylExploreRuntimeSnapshot,
    getKylExploreRuntimeSnapshot,
  );
  const resolvedSelections = useMemo(
    () => resolveKylFilterSelections(snapshot.selectedFilterIds),
    [snapshot.selectedFilterIds],
  );
  const [activeSource, setActiveSource] = useState<KylExploreSource>(
    () => resolvedSelections[0]?.source ?? "MWS",
  );
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const activePage =
    KYL_EXPLORE_PAGES.find((page) => page.id === activeSource) ?? KYL_EXPLORE_PAGES[0];
  const activeCategory =
    activePage.categories.find((category) => category.id === activeCategoryId) ?? null;
  const selectedIds = new Set(snapshot.selectedFilterIds);
  const activePageSelections = resolvedSelections.filter(
    (selection) => selection.source === activePage.id,
  );
  const activeResult = runtime.results.find((result) => result.source === activePage.id);
  const hasTehsil = Boolean(
    snapshot.location.state && snapshot.location.district && snapshot.location.tehsil,
  );

  const selectPage = (source: KylExploreSource) => {
    setActiveSource(source);
    setActiveCategoryId(null);
  };

  if (!hasTehsil) {
    return (
      <section className="flex h-full min-h-0 flex-col bg-card text-card-foreground">
        <div className="border-b px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Explore workspace
          </p>
          <h2 className="mt-0.5 text-sm font-semibold">Choose a tehsil first</h2>
        </div>
        <div className="grid min-h-0 flex-1 place-items-center p-6 text-center">
          <div className="max-w-64">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold">Explore is tehsil-specific</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Select an active tehsil in Focus, then return here to apply the proven KYL
              micro-watershed, village, and waterbody filters.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-4 min-h-10"
              onClick={() => setCoreGeoStackMode("focus")}
            >
              <Compass className="me-2 h-4 w-4" />
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
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              Explore workspace
            </p>
            <h2 className="mt-0.5 truncate text-sm font-semibold">
              {locationLabel(snapshot.location)}
            </h2>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 shrink-0 px-2 text-xs"
            onClick={() => setCoreGeoStackMode("focus")}
          >
            Change
          </Button>
        </div>

        <div
          className={cn(
            "mt-2 rounded-md border px-2.5 py-2 text-xs",
            runtimeClasses(runtime.kind),
          )}
          role="status"
          aria-live="polite"
        >
          <span className="font-semibold capitalize">{runtime.kind}</span>
          <span className="mx-1">·</span>
          {runtime.message}
        </div>

        {runtime.results.length ? (
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {KYL_EXPLORE_PAGES.map((page) => {
              const result = runtime.results.find((entry) => entry.source === page.id);
              return (
                <div key={page.id} className="rounded border bg-background px-2 py-1.5">
                  <span className="block text-[10px] text-muted-foreground">
                    {page.shortLabel}
                  </span>
                  <span className="block text-xs font-semibold tabular-nums">
                    {result ? `${result.matched}/${result.total}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </header>

      <div
        className="grid grid-cols-3 gap-1 border-b bg-muted/25 p-1.5"
        role="tablist"
        aria-label="KYL Explore pages"
      >
        {KYL_EXPLORE_PAGES.map((page) => {
          const Icon = PAGE_ICONS[page.id];
          const activeCount = resolvedSelections.filter(
            (selection) => selection.source === page.id,
          ).length;
          return (
            <button
              key={page.id}
              type="button"
              role="tab"
              aria-selected={activePage.id === page.id}
              className={cn(
                "relative flex min-h-11 items-center justify-center gap-1 rounded px-1.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activePage.id === page.id
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-background/70",
              )}
              onClick={() => selectPage(page.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{page.shortLabel}</span>
              {activeCount ? (
                <span className="absolute end-1 top-1 rounded-full bg-primary px-1 text-[9px] leading-4 text-primary-foreground">
                  {activeCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {activeCategory ? (
              <button
                type="button"
                className="mb-1 flex min-h-8 items-center gap-1 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setActiveCategoryId(null)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {activePage.label}
              </button>
            ) : null}
            <h3 className="text-sm font-semibold">
              {activeCategory?.label ?? activePage.label}
            </h3>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {activeCategory
                ? `${activeCategory.filters.length} KYL indicators`
                : activePage.description}
            </p>
          </div>
          {snapshot.selectedFilterIds.length ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 shrink-0 px-2 text-xs"
              onClick={clearCoreGeoStackFilters}
            >
              <FilterX className="me-1 h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}
        </div>

        {!activeCategory ? (
          <div className="space-y-1.5">
            {activePage.categories.map((category) => {
              const categoryFilterNames = new Set(
                category.filters.map((filter) => filter.name),
              );
              const count = activePageSelections.filter((selection) =>
                categoryFilterNames.has(selection.definition.name),
              ).length;
              return (
                <button
                  key={category.id}
                  type="button"
                  className="flex min-h-12 w-full items-center gap-2 rounded-md border bg-background px-3 py-2.5 text-start hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setActiveCategoryId(category.id)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium">{category.label}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {category.filters.length} indicators
                    </span>
                  </span>
                  {count ? (
                    <span className="rounded-full bg-primary px-1.5 text-[10px] leading-5 text-primary-foreground">
                      {count}
                    </span>
                  ) : null}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {activeCategory.filters.map((definition) => (
              <fieldset key={definition.name} className="rounded-md border bg-background p-2.5">
                <legend className="px-1 text-xs font-semibold">{definition.label}</legend>
                <div className="mt-1 space-y-0.5">
                  {definition.values.map((option, optionIndex) => {
                    const selectionId = kylFilterSelectionId(definition, optionIndex);
                    const checked = selectedIds.has(selectionId);
                    return (
                      <label
                        key={selectionId}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted",
                          checked && "bg-primary/10 text-foreground",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={checked}
                          onChange={() => toggleCoreGeoStackFilter(selectionId)}
                        />
                        <span
                          className={cn(
                            "grid h-4 w-4 shrink-0 place-items-center rounded border",
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background",
                          )}
                          aria-hidden="true"
                        >
                          {checked ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span className="min-w-0 flex-1 leading-4">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t bg-muted/25 px-3 py-2.5">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {runtime.kind === "loading" ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Compass className="h-3.5 w-3.5" />
          )}
          <span className="min-w-0 flex-1 truncate">
            {activeResult
              ? `${activeResult.matched} of ${activeResult.total} ${activePage.label.toLowerCase()} match`
              : "OR within an indicator · AND across indicators"}
          </span>
        </div>
      </footer>
    </section>
  );
}
