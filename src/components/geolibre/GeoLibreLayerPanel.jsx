import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Layers3,
  Search,
  Sparkles,
} from "lucide-react";
import SelectButton from "../buttons/select_button";
import {
  GEOLIBRE_LAYER_BY_ID,
  GEOLIBRE_LULC_YEARS,
  LATEST_GEOLIBRE_LULC_YEAR,
  getGeoLibreNonLulcGroups,
} from "../../config/geolibreLayers";

const LULC_LEVELS = [
  { id: "lulc_level_1", shortLabel: "Level 1", label: "Broad classes" },
  { id: "lulc_level_2", shortLabel: "Level 2", label: "Detailed classes" },
  { id: "lulc_level_3", shortLabel: "Level 3", label: "Crop-season classes" },
];

const LAYER_GROUPS = getGeoLibreNonLulcGroups();

const GeoLibreLayerPanel = ({
  statesData,
  state,
  district,
  tehsil,
  setState,
  setDistrict,
  setTehsil,
  handleLocationSelect,
  selectedLayerIds,
  onLayerToggle,
  lulcSelections,
  onLulcToggle,
  selectedCount,
  project,
  hasPendingChanges,
  isPreparing,
  error,
  warning,
  onApply,
  onDownload,
}) => {
  const [search, setSearch] = useState("");
  const [activeLulcLevel, setActiveLulcLevel] = useState("lulc_level_3");
  const [expandedGroups, setExpandedGroups] = useState({
    climate: true,
    demographic: true,
  });

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return LAYER_GROUPS;
    return LAYER_GROUPS.map((group) => ({
      ...group,
      layers: group.layers.filter((layer) =>
        layer.label.toLowerCase().includes(query)
      ),
    })).filter((group) => group.layers.length);
  }, [search]);

  const locationReady = Boolean(state && district && tehsil);
  const activeYears = lulcSelections[activeLulcLevel] || [];

  return (
    <aside className="flex h-full min-h-0 flex-col bg-white">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-purple-100 p-2.5 text-purple-700">
            <Layers3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Open tehsil data in GeoLibre
            </h1>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Choose live CoRE Stack layers, inspect them in GeoLibre, or save
              the same selection as a project JSON.
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="space-y-3 border-b border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Location
            </h2>
            {locationReady && (
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                Ready
              </span>
            )}
          </div>
          <SelectButton
            currVal={state || { label: "Select State" }}
            stateData={statesData}
            handleItemSelect={handleLocationSelect}
            setState={setState}
          />
          <SelectButton
            currVal={district || { label: "Select District" }}
            stateData={state?.district || null}
            handleItemSelect={handleLocationSelect}
            setState={setDistrict}
          />
          <SelectButton
            currVal={tehsil || { label: "Select Tehsil" }}
            stateData={district?.blocks || null}
            handleItemSelect={handleLocationSelect}
            setState={setTehsil}
          />
        </section>

        <section className="border-b border-slate-200 p-5">
          <div className="rounded-xl border border-purple-100 bg-purple-50 p-3">
            <div className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple-700" />
              <div>
                <p className="text-xs font-semibold text-purple-900">
                  Smart preload
                </p>
                <p className="mt-1 text-xs leading-5 text-purple-800">
                  Vector layers, MWS, and Level 3 LULC {LATEST_GEOLIBRE_LULC_YEAR.replace(
                    "_",
                    "–"
                  )} start in the project. Only Socioeconomic Profile starts
                  visible; every other layer starts at 0% opacity.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Land Use / Land Cover
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Pick a level, then one or more years.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              {Object.values(lulcSelections).reduce(
                (total, years) => total + years.length,
                0
              )}{" "}
              selected
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
            {LULC_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => setActiveLulcLevel(level.id)}
                className={`rounded-md px-2 py-2 text-xs font-medium transition ${
                  activeLulcLevel === level.id
                    ? "bg-white text-purple-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {level.shortLabel}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs font-medium text-slate-700">
            {LULC_LEVELS.find((level) => level.id === activeLulcLevel)?.label}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {GEOLIBRE_LULC_YEARS.map((year) => {
              const selected = activeYears.includes(year.value);
              const isLatest = year.value === LATEST_GEOLIBRE_LULC_YEAR;
              return (
                <button
                  key={year.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onLulcToggle(activeLulcLevel, year.value)}
                  className={`rounded-lg border px-2 py-2 text-left text-xs transition ${
                    selected
                      ? "border-purple-500 bg-purple-50 font-semibold text-purple-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-purple-300"
                  }`}
                >
                  {year.label}
                  {isLatest && (
                    <span className="ml-1 text-[10px] text-purple-600">
                      latest
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Other layers
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Raster layers are added only when selected.
              </p>
            </div>
            <span className="text-xs font-medium text-purple-700">
              {selectedCount} total
            </span>
          </div>

          <label className="relative block">
            <span className="sr-only">Search layers</span>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search layers"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
          </label>

          <div className="mt-3 space-y-2">
            {filteredGroups.map((group) => {
              const expanded = Boolean(expandedGroups[group.id]) || Boolean(search);
              const selectedInGroup = group.layers.filter((layer) =>
                selectedLayerIds.includes(layer.id)
              ).length;
              return (
                <div
                  key={group.id}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGroups((current) => ({
                        ...current,
                        [group.id]: !current[group.id],
                      }))
                    }
                    className="flex w-full items-center justify-between bg-slate-50 px-3 py-3 text-left"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {group.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {selectedInGroup}/{group.layers.length}
                    </span>
                  </button>
                  {expanded && (
                    <div className="divide-y divide-slate-100">
                      {group.layers.map((layer) => {
                        const selected = selectedLayerIds.includes(layer.id);
                        const preloaded = layer.sourceType === "wfs";
                        return (
                          <label
                            key={layer.id}
                            className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => onLayerToggle(layer.id)}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-purple-600"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-medium leading-5 text-slate-800">
                                {layer.label}
                              </span>
                              <span className="mt-1 flex flex-wrap gap-1">
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-600">
                                  {layer.sourceType}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                                    preloaded
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {preloaded ? "preloaded" : "on demand"}
                                </span>
                                {GEOLIBRE_LAYER_BY_ID[layer.id]?.qmlStyleUrl && (
                                  <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-700">
                                    styled
                                  </span>
                                )}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="space-y-2 border-t border-slate-200 bg-white p-4 shadow-[0_-6px_18px_rgba(15,23,42,0.06)]">
        {error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {error}
          </p>
        )}
        {warning && <p className="text-xs text-amber-700">{warning}</p>}
        <button
          type="button"
          onClick={onApply}
          disabled={!locationReady || !selectedCount || isPreparing}
          className="w-full rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPreparing
            ? "Preparing tehsil project…"
            : project && hasPendingChanges
            ? "Update GeoLibre"
            : project
            ? "Reload selected layers"
            : "Open in GeoLibre"}
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!locationReady || !selectedCount || isPreparing}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-800 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          <Download className="h-4 w-4" />
          Download GeoLibre JSON
        </button>
      </div>
    </aside>
  );
};

export default GeoLibreLayerPanel;
