import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GEOLIBRE_RUST_DOMAINS,
  GEOLIBRE_RUST_LAYERS,
  addBboxToWfsUrl,
  buildGeoLibreRustSource,
} from "../../config/geolibreRustLayers";
import {
  initializeGeoLibreRust,
  runGeoLibreRustRasterWorkflow,
  runGeoLibreRustVectorWorkflow,
} from "./geolibreRustEngine";

const RASTER_WORKFLOWS = [
  {
    id: "extract",
    label: "Viewport COG",
    description:
      "Request only the visible map extent and encode it as a compressed Cloud Optimized GeoTIFF.",
  },
  {
    id: "summary",
    label: "Raster profile",
    description:
      "Calculate valid-cell count, range, mean, spread, and other summary statistics in Rust.",
  },
  {
    id: "slope",
    label: "Slope",
    description:
      "Create a slope surface. Most meaningful for a continuous terrain/elevation source.",
  },
  {
    id: "hillshade",
    label: "Hillshade",
    description:
      "Create directional terrain shading with configurable sun angle.",
  },
  {
    id: "focal",
    label: "Focal statistics",
    description:
      "Run a moving-window mean, majority, minimum, maximum, or variety calculation.",
  },
];

const VECTOR_WORKFLOWS = [
  {
    id: "geoparquet",
    label: "GeoParquet",
    description:
      "Convert live WFS GeoJSON to Hilbert-sorted, ZSTD-compressed GeoParquet.",
  },
  {
    id: "classify",
    label: "Classify field",
    description:
      "Classify a numeric field using Jenks, quantile, equal interval, or geometric interval breaks.",
  },
  {
    id: "dissolve",
    label: "Dissolve",
    description:
      "Remove shared polygon boundaries globally or group the output by one attribute.",
  },
];

const CLASSIFICATION_METHODS = [
  { value: "natural_breaks", label: "Natural breaks (Jenks)" },
  { value: "quantile", label: "Quantile" },
  { value: "equal_interval", label: "Equal interval" },
  { value: "geometric_interval", label: "Geometric interval" },
  { value: "std_dev", label: "Standard deviation" },
];

const FOCAL_STATISTICS = [
  "mean",
  "majority",
  "maximum",
  "minimum",
  "median",
  "range",
  "std",
  "sum",
  "variety",
];

function roundedExtent(extent) {
  if (!Array.isArray(extent) || extent.length !== 4) {
    return null;
  }
  const values = extent.map((value) => Number(Number(value).toFixed(6)));
  if (
    values.some((value) => !Number.isFinite(value)) ||
    values[0] >= values[2] ||
    values[1] >= values[3]
  ) {
    return null;
  }
  return values;
}

export function readGeoLibreRustMapExtent(getMap) {
  const map = typeof getMap === "function" ? getMap() : null;
  const size = map?.getSize?.();
  const extent = size ? map?.getView?.()?.calculateExtent?.(size) : null;
  return roundedExtent(extent);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadResult(result) {
  const blob = new Blob([result.bytes], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = result.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function WorkflowOptions({
  sourceType,
  workflow,
  options,
  setOptions,
  fields,
  numericFields,
}) {
  const update = (key, value) =>
    setOptions((current) => ({ ...current, [key]: value }));

  if (sourceType === "raster") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label="Output size">
          <select
            value={options.size}
            onChange={(event) => update("size", Number(event.target.value))}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
          >
            <option value={512}>512 × 512</option>
            <option value={1024}>1024 × 1024</option>
            <option value={2048}>2048 × 2048</option>
            <option value={4096}>4096 × 4096</option>
          </select>
        </Field>

        {workflow === "slope" && (
          <Field label="Slope units">
            <select
              value={options.units}
              onChange={(event) => update("units", event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            >
              <option value="degrees">Degrees</option>
              <option value="percent">Percent</option>
              <option value="radians">Radians</option>
            </select>
          </Field>
        )}

        {(workflow === "slope" || workflow === "hillshade") && (
          <Field label="Z factor">
            <input
              type="number"
              step="0.1"
              value={options.zFactor}
              onChange={(event) => update("zFactor", event.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
            />
          </Field>
        )}

        {workflow === "hillshade" && (
          <>
            <Field label="Sun azimuth">
              <input
                type="number"
                min="0"
                max="360"
                value={options.azimuth}
                onChange={(event) => update("azimuth", event.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              />
            </Field>
            <Field label="Sun altitude">
              <input
                type="number"
                min="0"
                max="90"
                value={options.altitude}
                onChange={(event) => update("altitude", event.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              />
            </Field>
          </>
        )}

        {workflow === "focal" && (
          <>
            <Field label="Statistic">
              <select
                value={options.statistics}
                onChange={(event) => update("statistics", event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
              >
                {FOCAL_STATISTICS.map((statistic) => (
                  <option key={statistic} value={statistic}>
                    {statistic}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Window (cells)">
              <select
                value={options.window}
                onChange={(event) => update("window", Number(event.target.value))}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
              >
                <option value={3}>3 × 3</option>
                <option value={5}>5 × 5</option>
                <option value={7}>7 × 7</option>
                <option value={9}>9 × 9</option>
              </select>
            </Field>
          </>
        )}
      </div>
    );
  }

  if (workflow === "geoparquet") {
    return (
      <Field
        label="Compression"
        hint="Spatial Hilbert sorting is enabled for faster bounding-box reads."
      >
        <select
          value={options.compression}
          onChange={(event) => update("compression", event.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
        >
          <option value="zstd">ZSTD</option>
          <option value="snappy">Snappy</option>
          <option value="gzip">Gzip</option>
          <option value="uncompressed">Uncompressed</option>
        </select>
      </Field>
    );
  }

  if (workflow === "classify") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Numeric field"
          hint={
            numericFields.length
              ? "Detected from one live WFS feature."
              : "No numeric sample fields were detected."
          }
        >
          <select
            value={options.field}
            onChange={(event) => update("field", event.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
          >
            <option value="">Select field</option>
            {numericFields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Method">
          <select
            value={options.method}
            onChange={(event) => update("method", event.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
          >
            {CLASSIFICATION_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Classes">
          <input
            type="number"
            min="2"
            max="20"
            value={options.classes}
            onChange={(event) => update("classes", event.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
          />
        </Field>
      </div>
    );
  }

  return (
    <Field
      label="Dissolve field"
      hint="Leave blank to dissolve every polygon into one output feature."
    >
      <select
        value={options.field}
        onChange={(event) => update("field", event.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
      >
        <option value="">Dissolve all</option>
        {fields.map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </select>
    </Field>
  );
}

const GeoLibreRustWorkbench = ({
  open,
  onClose,
  district,
  tehsil,
  getMap,
  toggledLayers = {},
}) => {
  const [selectedLayerId, setSelectedLayerId] = useState("demographics");
  const [workflow, setWorkflow] = useState("geoparquet");
  const [bbox, setBbox] = useState(null);
  const [engine, setEngine] = useState({
    status: "idle",
    metadata: null,
    error: null,
  });
  const [runState, setRunState] = useState({
    status: "idle",
    result: null,
    error: null,
  });
  const [search, setSearch] = useState("");
  const [scopeToViewport, setScopeToViewport] = useState(true);
  const [fields, setFields] = useState([]);
  const [numericFields, setNumericFields] = useState([]);
  const [fieldStatus, setFieldStatus] = useState("idle");
  const [options, setOptions] = useState({
    size: 1024,
    units: "degrees",
    zFactor: 1,
    azimuth: 315,
    altitude: 45,
    statistics: "mean",
    window: 3,
    compression: "zstd",
    field: "",
    method: "natural_breaks",
    classes: 5,
  });

  const selectedLayer = useMemo(
    () =>
      GEOLIBRE_RUST_LAYERS.find((layer) => layer.id === selectedLayerId) ||
      GEOLIBRE_RUST_LAYERS[0],
    [selectedLayerId]
  );

  const source = useMemo(
    () =>
      buildGeoLibreRustSource(selectedLayer, {
        district,
        tehsil,
      }),
    [district, selectedLayer, tehsil]
  );

  const workflows =
    selectedLayer.sourceType === "raster"
      ? RASTER_WORKFLOWS
      : VECTOR_WORKFLOWS;
  const selectedWorkflow =
    workflows.find((entry) => entry.id === workflow) || workflows[0];

  const filteredLayers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return GEOLIBRE_RUST_LAYERS;
    }
    return GEOLIBRE_RUST_LAYERS.filter((layer) =>
      `${layer.label} ${layer.domain} ${layer.year || ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [search]);

  const activeLayerId = useMemo(
    () =>
      GEOLIBRE_RUST_LAYERS.find(
        (layer) => toggledLayers[layer.baseId || layer.id]
      )?.id || null,
    [toggledLayers]
  );

  const refreshExtent = useCallback(() => {
    setBbox(readGeoLibreRustMapExtent(getMap));
  }, [getMap]);

  useEffect(() => {
    if (!open) {
      return;
    }

    refreshExtent();
    if (activeLayerId) {
      setSelectedLayerId(activeLayerId);
    }

    let cancelled = false;
    setEngine((current) =>
      current.metadata
        ? current
        : { status: "loading", metadata: null, error: null }
    );
    initializeGeoLibreRust()
      .then((metadata) => {
        if (!cancelled) {
          setEngine({ status: "ready", metadata, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setEngine({ status: "error", metadata: null, error: error.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeLayerId, open, refreshExtent]);

  useEffect(() => {
    const nextWorkflow =
      selectedLayer.sourceType === "raster" ? "extract" : "geoparquet";
    setWorkflow(nextWorkflow);
    setRunState({ status: "idle", result: null, error: null });
    setOptions((current) => ({ ...current, field: "" }));
  }, [selectedLayer.sourceType, selectedLayerId]);

  useEffect(() => {
    if (!open || !source || source.sourceType !== "vector") {
      setFields([]);
      setNumericFields([]);
      setFieldStatus("idle");
      return;
    }

    const controller = new AbortController();
    const sampleUrl = new URL(source.sourceUrl);
    sampleUrl.searchParams.set("maxFeatures", "1");
    setFieldStatus("loading");

    fetch(sampleUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`WFS returned ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const properties = data?.features?.[0]?.properties || {};
        const names = Object.keys(properties).sort();
        const numeric = names.filter((name) => {
          const value = properties[name];
          return (
            value !== null &&
            value !== "" &&
            Number.isFinite(Number(value))
          );
        });
        setFields(names);
        setNumericFields(numeric);
        setFieldStatus("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setFields([]);
          setNumericFields([]);
          setFieldStatus("error");
        }
      });

    return () => controller.abort();
  }, [open, source]);

  const runWorkflow = async () => {
    if (!source || !bbox) {
      return;
    }

    setRunState({ status: "running", result: null, error: null });
    try {
      let result;
      if (source.sourceType === "raster") {
        result = await runGeoLibreRustRasterWorkflow({
          source,
          bbox,
          workflow,
          options,
        });
      } else {
        result = await runGeoLibreRustVectorWorkflow({
          source: {
            ...source,
            sourceUrl:
              scopeToViewport && bbox
                ? addBboxToWfsUrl(source.sourceUrl, bbox)
                : source.sourceUrl,
          },
          workflow,
          options,
        });
      }
      setRunState({ status: "success", result, error: null });
    } catch (error) {
      setRunState({
        status: "error",
        result: null,
        error: error.message || String(error),
      });
    }
  };

  if (!open) {
    return null;
  }

  const locationReady = Boolean(district && tehsil);
  const canRun =
    locationReady &&
    bbox &&
    engine.status === "ready" &&
    runState.status !== "running" &&
    !(workflow === "classify" && !options.field);

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-12 z-[70] bg-slate-950/55 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="geolibre-rust-title"
    >
      <div className="mx-auto flex h-full max-w-[1480px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-orange-700">
                Rust + WASM
              </span>
              <h2
                id="geolibre-rust-title"
                className="text-lg font-semibold text-slate-900"
              >
                KYL GeoLibre Rust Workbench
              </h2>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Extract, inspect, transform, and analyze live KYL layers locally
              in your browser.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </header>

        {!locationReady ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
              <h3 className="font-semibold text-amber-900">
                Select a district and tehsil first
              </h3>
              <p className="mt-2 text-sm text-amber-800">
                The workbench builds live, tehsil-scoped WFS and WMS sources
                from the same location selected on Download Layers.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[330px_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-3">
                <Field label="Find a KYL layer">
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Hydrology, LULC 2024…"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{filteredLayers.length} sources</span>
                  <span>
                    {GEOLIBRE_RUST_LAYERS.filter(
                      (layer) => layer.sourceType === "vector"
                    ).length}{" "}
                    vector ·{" "}
                    {GEOLIBRE_RUST_LAYERS.filter(
                      (layer) => layer.sourceType === "raster"
                    ).length}{" "}
                    raster
                  </span>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {GEOLIBRE_RUST_DOMAINS.map((domain) => {
                  const domainLayers = filteredLayers.filter(
                    (layer) => layer.domain === domain
                  );
                  if (!domainLayers.length) {
                    return null;
                  }
                  return (
                    <div key={domain} className="mb-3">
                      <h3 className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                        {domain}
                      </h3>
                      {domainLayers.map((layer) => (
                        <button
                          type="button"
                          key={layer.id}
                          onClick={() => setSelectedLayerId(layer.id)}
                          className={`mb-1 flex w-full items-start justify-between rounded-lg px-2.5 py-2 text-left text-sm ${
                            selectedLayerId === layer.id
                              ? "bg-orange-50 text-orange-900 ring-1 ring-orange-200"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span className="pr-2">{layer.label}</span>
                          <span
                            className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              layer.sourceType === "vector"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-sky-100 text-sky-700"
                            }`}
                          >
                            {layer.sourceType}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </aside>

            <main className="min-h-0 overflow-y-auto p-5">
              <div className="mx-auto max-w-5xl space-y-4">
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {source.domain} · {source.sourceType}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold text-slate-900">
                        {source.label}
                      </h3>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {source.qualifiedName}
                      </p>
                    </div>
                    <a
                      href={source.qmlStyleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 ${
                        source.qmlStyleUrl ? "" : "pointer-events-none opacity-40"
                      }`}
                    >
                      QGIS style
                    </a>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">
                        Location
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {district} · {tehsil}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">
                        Browser engine
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {engine.status === "ready"
                          ? `Ready · ${engine.metadata.toolCount} tools`
                          : engine.status === "error"
                          ? "Unavailable"
                          : "Compiling Rust/WASM…"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">
                        Live fields
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {source.sourceType === "raster"
                          ? "Raster bands"
                          : fieldStatus === "ready"
                          ? `${fields.length} attributes · ${numericFields.length} numeric`
                          : fieldStatus === "error"
                          ? "Sample unavailable"
                          : "Inspecting WFS…"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Analysis extent
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Rust reads the current map viewport in EPSG:4326.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={refreshExtent}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Use current map extent
                    </button>
                  </div>
                  <div className="mt-3 rounded-lg bg-slate-950 px-3 py-2 font-mono text-xs text-emerald-300">
                    {bbox ? bbox.join(", ") : "Map extent is not available"}
                  </div>
                  {source.sourceType === "vector" && (
                    <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={scopeToViewport}
                        onChange={(event) =>
                          setScopeToViewport(event.target.checked)
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Limit the WFS input to this viewport
                    </label>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="font-semibold text-slate-900">
                    Choose a Rust workflow
                  </h3>
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {workflows.map((entry) => (
                      <button
                        type="button"
                        key={entry.id}
                        onClick={() => {
                          setWorkflow(entry.id);
                          setRunState({
                            status: "idle",
                            result: null,
                            error: null,
                          });
                        }}
                        className={`rounded-xl border p-3 text-left ${
                          workflow === entry.id
                            ? "border-orange-400 bg-orange-50 ring-1 ring-orange-200"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="block text-sm font-semibold text-slate-900">
                          {entry.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {entry.description}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-sm font-medium text-slate-800">
                      {selectedWorkflow.label} options
                    </p>
                    <WorkflowOptions
                      sourceType={source.sourceType}
                      workflow={workflow}
                      options={options}
                      setOptions={setOptions}
                      fields={fields}
                      numericFields={numericFields}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={!canRun}
                      onClick={runWorkflow}
                      className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${
                        canRun
                          ? "bg-orange-600 hover:bg-orange-700"
                          : "cursor-not-allowed bg-slate-300"
                      }`}
                    >
                      {runState.status === "running"
                        ? "Processing locally…"
                        : `Run ${selectedWorkflow.label}`}
                    </button>
                    <span className="text-xs text-slate-500">
                      Processing stays in this browser tab. No KYL analysis
                      job is sent to a compute server.
                    </span>
                  </div>
                </section>

                {(runState.status === "success" ||
                  runState.status === "error" ||
                  engine.status === "error") && (
                  <section
                    className={`rounded-xl border p-4 ${
                      runState.status === "error" || engine.status === "error"
                        ? "border-red-200 bg-red-50"
                        : "border-emerald-200 bg-emerald-50"
                    }`}
                    aria-live="polite"
                  >
                    {runState.status === "success" &&
                      runState.result?.kind === "file" && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-emerald-900">
                              Output ready
                            </h3>
                            <p className="mt-1 text-sm text-emerald-800">
                              {runState.result.fileName} ·{" "}
                              {formatBytes(runState.result.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => downloadResult(runState.result)}
                            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                          >
                            Download result
                          </button>
                        </div>
                      )}

                    {runState.status === "success" &&
                      runState.result?.kind === "summary" && (
                        <div>
                          <h3 className="font-semibold text-emerald-900">
                            Raster profile
                          </h3>
                          <p className="mt-1 text-xs text-emerald-800">
                            Source viewport COG:{" "}
                            {formatBytes(runState.result.sourceSize)}
                          </p>
                          <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-emerald-200">
                            {JSON.stringify(runState.result.summary, null, 2)}
                          </pre>
                        </div>
                      )}

                    {(runState.status === "error" ||
                      engine.status === "error") && (
                      <div>
                        <h3 className="font-semibold text-red-900">
                          GeoLibre Rust could not complete this workflow
                        </h3>
                        <p className="mt-1 break-words text-sm text-red-800">
                          {runState.error || engine.error}
                        </p>
                        <p className="mt-2 text-xs text-red-700">
                          Common causes are a missing GeoServer layer, blocked
                          cross-origin request, or a source that cannot be
                          represented by the selected analysis.
                        </p>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeoLibreRustWorkbench;
