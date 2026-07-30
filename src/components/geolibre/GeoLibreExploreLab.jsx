import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Code2,
  Columns2,
  Download,
  Droplets,
  ExternalLink,
  Layers3,
  Play,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  buildHydrologyExploreNotebook,
  buildLayerWorkbenchNotebook,
  buildLulcComparisonProject,
  buildLulcExploreNotebook,
  exploreNotebookFileNames,
  getLulcComparisonOptions,
} from "./exploreNotebookArtifacts";
import { buildGeoLibreConsoleScript } from "./pythonLabArtifacts";

const downloadFile = (content, fileName, mimeType) => {
  const objectUrl = window.URL.createObjectURL(
    new Blob([content], { type: `${mimeType};charset=utf-8` })
  );
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
};

const downloadNotebook = (notebook, fileName) =>
  downloadFile(
    `${JSON.stringify(notebook, null, 2)}\n`,
    fileName,
    "application/x-ipynb+json"
  );

const NotebookCard = ({
  icon: Icon,
  title,
  description,
  outcomes,
  onDownload,
  actionLabel = "Download notebook",
}) => (
  <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-purple-100 p-2 text-purple-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
      </div>
    </div>
    <ul className="mt-3 flex-1 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600">
      {outcomes.map((outcome) => (
        <li key={outcome}>{outcome}</li>
      ))}
    </ul>
    <button
      type="button"
      onClick={onDownload}
      className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-purple-200 px-3 py-2 text-sm font-semibold text-purple-800 hover:bg-purple-50"
    >
      <Download className="h-4 w-4" />
      {actionLabel}
    </button>
  </article>
);

const GeoLibreExploreLab = ({
  open,
  project,
  onClose,
  onApplyProject,
  onRestoreProject,
}) => {
  const optionsByLevel = useMemo(
    () =>
      project
        ? getLulcComparisonOptions(project)
        : { "1": [], "2": [], "3": [] },
    [project]
  );
  const [level, setLevel] = useState("3");
  const [beforeYear, setBeforeYear] = useState("");
  const [afterYear, setAfterYear] = useState("");
  const years = useMemo(
    () => optionsByLevel[level] || [],
    [level, optionsByLevel]
  );

  useEffect(() => {
    if (!open || !years.length) return;
    setBeforeYear(years[0].year);
    setAfterYear(years[years.length - 1].year);
  }, [level, open, years]);

  if (!open || !project) return null;

  const scope = project.metadata.scope;
  const fileNames = exploreNotebookFileNames(project);
  const comparisonActive =
    project.metadata?.explore?.mode === "lulc-comparison";
  const createLulcSelection = () => ({
    level,
    beforeYear,
    afterYear,
  });

  const startComparison = () => {
    const nextProject = buildLulcComparisonProject(
      project,
      createLulcSelection()
    );
    onApplyProject?.(nextProject);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-slate-50 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="geolibre-explore-title"
      >
        <header className="sticky top-0 z-10 flex items-start gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
            <Code2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1
              id="geolibre-explore-title"
              className="text-xl font-semibold text-slate-900"
            >
              CoRE Stack Explore
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Guided geospatial experiments for {scope.tehsil},{" "}
              {scope.district}. Use the live GeoLibre workspace or run the same
              notebooks on your own machine.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close CoRE Stack Explore"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 p-6">
          <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-blue-900">
                  <Columns2 className="h-5 w-5" />
                  <h2 className="font-semibold">
                    Compare LULC years immediately
                  </h2>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Load a synchronized two-map GeoLibre workspace. The left pane
                  shows the earlier year and the right pane shows the later
                  year, with the same camera and administrative boundary.
                </p>
              </div>
              {comparisonActive && (
                <button
                  type="button"
                  onClick={() => {
                    onRestoreProject?.();
                    onClose();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Return to normal map
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <label className="text-xs font-semibold text-slate-700">
                LULC level
                <select
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                >
                  <option value="3">Level 3 · detailed</option>
                  <option value="2">Level 2 · grouped</option>
                  <option value="1">Level 1 · broad</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Earlier year
                <select
                  value={beforeYear}
                  onChange={(event) => setBeforeYear(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                >
                  {years.map((option) => (
                    <option key={option.id} value={option.year}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Later year
                <select
                  value={afterYear}
                  onChange={(event) => setAfterYear(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                >
                  {years.map((option) => (
                    <option key={option.id} value={option.year}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={startComparison}
                disabled={!beforeYear || !afterYear || beforeYear === afterYear}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Play className="h-4 w-4" />
                Open comparison
              </button>
            </div>
          </section>

          <section>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Explore notebook library
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Each notebook already knows this tehsil’s extent, layer
                  catalogue and live data sources.
                </p>
              </div>
              <a
                href="https://colab.research.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-900"
              >
                Open Google Colab
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <NotebookCard
                icon={Droplets}
                title="Hydrology and cropping"
                description="A field-to-MWS workflow built from the supplied CoRE Stack Colab example."
                outcomes={[
                  "Discover the live indicator and year schema",
                  "Select an MWS from longitude and latitude",
                  "Plot precipitation, groundwater and cropping series",
                  "Optionally request the authenticated tehsil profile",
                  "Return a selected watershed to the live map",
                ]}
                onDownload={() =>
                  downloadNotebook(
                    buildHydrologyExploreNotebook(project),
                    fileNames.hydrology
                  )
                }
              />
              <NotebookCard
                icon={Columns2}
                title="LULC change"
                description="A programmable before/after comparison using the chosen LULC level and years."
                outcomes={[
                  "Stream published LULC layers",
                  "Use GeoLibre’s swipe comparison in Colab or Jupyter",
                  "Switch among Levels 1, 2 and 3",
                  "Document level, years and selected tehsil",
                ]}
                onDownload={() =>
                  downloadNotebook(
                    buildLulcExploreNotebook(project, createLulcSelection()),
                    fileNames.lulc
                  )
                }
              />
              <NotebookCard
                icon={Layers3}
                title="Layer workbench"
                description="A general workspace for the complete KYL layer catalogue."
                outcomes={[
                  "Inspect layer groups, sources and load state",
                  "Toggle and restyle the live project",
                  "Load hidden WFS vectors only when required",
                  "Create observations, buffers and derived layers",
                ]}
                onDownload={() =>
                  downloadNotebook(
                    buildLayerWorkbenchNotebook(project),
                    fileNames.layers
                  )
                }
              />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <BookOpen className="h-4 w-4 text-purple-700" />
                Run beside the current map
              </h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">
                <li>Download one notebook above.</li>
                <li>
                  In GeoLibre, open{" "}
                  <strong>Processing → Jupyter Notebook</strong>.
                </li>
                <li>Upload the notebook, open it, and run its cells.</li>
              </ol>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                The public GeoLibre host cannot yet accept a dynamic notebook
                from KYL automatically. A CoRE Stack-hosted GeoLibre build can
                bundle this library so the notebooks appear immediately.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                Run on the user’s machine
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Upload the same file to Colab, VS Code, or local Jupyter. The
                GeoLibre widget streams CoRE Stack layers; processing and
                temporary outputs use the user’s own runtime.
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                API keys are requested at runtime through a hidden prompt,
                `CORESTACK_API_KEY` / `CS_API` environment variable, or Colab
                Secret. They are never generated into the notebook.
              </p>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-xs leading-5 text-slate-500">
              CoRE Stack datasets are available under CC BY 4.0. Derived
              notebook layers do not modify published sources.
            </p>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  buildGeoLibreConsoleScript(project),
                  fileNames.layers.replace(/\.ipynb$/, ".py"),
                  "text/x-python"
                )
              }
              className="inline-flex items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-900"
            >
              <Download className="h-4 w-4" />
              Python Console helper
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GeoLibreExploreLab;
