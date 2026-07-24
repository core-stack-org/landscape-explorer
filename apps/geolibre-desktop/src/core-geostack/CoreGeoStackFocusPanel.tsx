import { Button, cn } from "@geolibre/ui";
import {
  Check,
  ChevronRight,
  Database,
  Filter,
  Layers3,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  CORE_GEOSTACK_LAYERS,
  type CoreGeoStackDomain,
} from "./layer-catalog";
import {
  ACTIVE_LOCATION_OPTIONS,
  KYL_FILTER_DEFINITIONS,
  KYL_PATTERN_DEFINITIONS,
  type ActiveLocationOption,
} from "./legacy-contracts";
import {
  getCoreGeoStackWorkspaceSnapshot,
  setCoreGeoStackLocation,
  subscribeCoreGeoStackWorkspace,
  toggleCoreGeoStackLayer,
} from "./workspace-state";

const domainOrder: CoreGeoStackDomain[] = [
  "Demographic",
  "Hydrology",
  "Land",
  "Agriculture",
  "Restoration",
  "NREGA",
];

function dataStatusClasses(kind: string): string {
  if (kind === "live") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-700";
  if (kind === "loading" || kind === "cached")
    return "border-cyan-500/35 bg-cyan-500/10 text-cyan-700";
  if (kind === "error" || kind === "offline")
    return "border-red-500/35 bg-red-500/10 text-red-700";
  return "border-amber-500/35 bg-amber-500/10 text-amber-700";
}

function selectedLocationLabel(location: {
  state?: string;
  district?: string;
  tehsil?: string;
}): string {
  const values = [location.state, location.district, location.tehsil].filter(Boolean);
  return values.length ? values.join(" · ") : "Pan India";
}

function locationState(option: ActiveLocationOption) {
  return {
    state: option.state.label,
    district: option.district?.label,
    tehsil: option.tehsil?.label,
  };
}

export function CoreGeoStackFocusPanel() {
  const snapshot = useSyncExternalStore(
    subscribeCoreGeoStackWorkspace,
    getCoreGeoStackWorkspaceSnapshot,
    getCoreGeoStackWorkspaceSnapshot,
  );
  const [query, setQuery] = useState("");
  const [openDomains, setOpenDomains] = useState<Set<CoreGeoStackDomain>>(
    () => new Set(["Demographic"]),
  );

  const locationResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return ACTIVE_LOCATION_OPTIONS.filter((option) => option.kind === "tehsil").slice(0, 8);
    return ACTIVE_LOCATION_OPTIONS.filter((option) =>
      `${option.label} ${option.context}`.toLocaleLowerCase().includes(normalized),
    ).slice(0, 12);
  }, [query]);

  const layersByDomain = useMemo(
    () =>
      domainOrder.map((domain) => ({
        domain,
        layers: CORE_GEOSTACK_LAYERS.filter((layer) => layer.domain === domain),
      })),
    [],
  );

  const selectedLayerIds = new Set(snapshot.selectedLayerIds);

  return (
    <section className="flex h-full min-h-0 flex-col bg-card text-card-foreground">
      <div className="border-b px-3 pb-3 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              Focus workspace
            </p>
            <h2 className="mt-0.5 truncate text-sm font-semibold">
              {selectedLocationLabel(snapshot.location)}
            </h2>
          </div>
          {snapshot.location.state ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 shrink-0 p-0"
              title="Return to Pan India"
              aria-label="Return to Pan India"
              onClick={() => setCoreGeoStackLocation({})}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <div
          className={cn(
            "mt-2 rounded-md border px-2.5 py-2 text-xs",
            dataStatusClasses(snapshot.dataStatus.kind),
          )}
          role="status"
          aria-live="polite"
        >
          <span className="font-semibold capitalize">{snapshot.dataStatus.kind}</span>
          <span className="mx-1">·</span>
          {snapshot.dataStatus.message}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <section className="border-b p-3" aria-labelledby="core-geostack-location-heading">
          <div className="mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 id="core-geostack-location-heading" className="text-xs font-semibold">
              Active locations
            </h3>
          </div>
          <label className="relative block">
            <span className="sr-only">Search active locations</span>
            <Search className="pointer-events-none absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search state, district, or tehsil"
              className="h-10 w-full rounded-md border bg-background ps-9 pe-3 text-sm outline-none ring-primary/25 placeholder:text-muted-foreground focus:ring-2"
            />
          </label>
          <div className="mt-2 max-h-52 overflow-y-auto rounded-md border">
            {locationResults.map((option) => {
              const selected =
                snapshot.location.state === option.state.label &&
                snapshot.location.district === option.district?.label &&
                snapshot.location.tehsil === option.tehsil?.label;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 border-b px-2.5 py-2 text-start last:border-b-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                    selected && "bg-primary/10",
                  )}
                  onClick={() => {
                    setCoreGeoStackLocation(locationState(option));
                    setQuery(option.label);
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{option.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {option.kind === "tehsil" ? "Tehsil" : option.kind} · {option.context}
                    </span>
                  </span>
                  {selected ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-b p-3" aria-labelledby="core-geostack-layers-heading">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" />
              <h3 id="core-geostack-layers-heading" className="text-xs font-semibold">
                KYL layers
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {selectedLayerIds.size}/{CORE_GEOSTACK_LAYERS.length} selected
            </span>
          </div>
          <div className="space-y-1.5">
            {layersByDomain.map(({ domain, layers }) => (
              <details
                key={domain}
                className="group rounded-md border bg-background"
                open={openDomains.has(domain)}
                onToggle={(event) => {
                  const isOpen = event.currentTarget.open;
                  setOpenDomains((current) => {
                    if (current.has(domain) === isOpen) return current;
                    const next = new Set(current);
                    if (isOpen) next.add(domain);
                    else next.delete(domain);
                    return next;
                  });
                }}
              >
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
                  <span>{domain}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {layers.filter((layer) => selectedLayerIds.has(layer.id)).length}/{layers.length}
                  </span>
                </summary>
                <div className="border-t px-1.5 py-1">
                  {layers.map((layer) => {
                    const selected = selectedLayerIds.has(layer.id);
                    return (
                      <button
                        key={layer.id}
                        type="button"
                        className="flex min-h-11 w-full items-center gap-2 rounded px-2 py-1.5 text-start text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-pressed={selected}
                        onClick={() => toggleCoreGeoStackLayer(layer.id)}
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background",
                          )}
                        >
                          {selected ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block">{layer.label}</span>
                          {layer.year ? (
                            <span className="block text-[10px] text-muted-foreground">
                              Time-enabled raster
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="border-b p-3" aria-labelledby="core-geostack-filters-heading">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h3 id="core-geostack-filters-heading" className="text-xs font-semibold">
              KYL analysis contract
            </h3>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {KYL_FILTER_DEFINITIONS.length} proven filter definitions and{" "}
            {KYL_PATTERN_DEFINITIONS.length} thematic patterns are carried forward as the
            authoritative migration source. Choice-level execution is the next runtime slice.
          </p>
        </section>
      </div>

      <footer className="border-t bg-muted/25 px-3 py-2.5">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Database className="h-3.5 w-3.5" />
          <span className="min-w-0 flex-1 truncate">
            CoRE Stack GeoServer · QGIS styles · multiscale boundary indexes
          </span>
        </div>
      </footer>
    </section>
  );
}
