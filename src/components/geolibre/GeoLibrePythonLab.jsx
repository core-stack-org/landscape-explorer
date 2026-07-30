import { BookOpen, Code2, Download, ExternalLink, X } from "lucide-react";
import {
  buildGeoLibreConsoleScript,
  buildGeoLibreNotebook,
  pythonLabFileNames,
} from "./pythonLabArtifacts";

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

const GeoLibrePythonLab = ({ open, project, onClose }) => {
  if (!open || !project) return null;

  const scope = project.metadata.scope;
  const fileNames = pythonLabFileNames(project);
  const downloadNotebook = () =>
    downloadFile(
      `${JSON.stringify(buildGeoLibreNotebook(project), null, 2)}\n`,
      fileNames.notebook,
      "application/x-ipynb+json"
    );
  const downloadScript = () =>
    downloadFile(
      buildGeoLibreConsoleScript(project),
      fileNames.script,
      "text/x-python"
    );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="geolibre-python-lab-title"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
            <Code2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1
              id="geolibre-python-lab-title"
              className="text-xl font-semibold text-slate-900"
            >
              KYL Python Lab
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              A ready-to-run GeoLibre notebook for {scope.tehsil},{" "}
              {scope.district}. It includes live layer controls, tehsil presets,
              observations, and a processing example.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close Python Lab"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-purple-100 bg-purple-50/70 p-4">
          <h2 className="font-semibold text-slate-900">
            Run it beside the current map
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">
            <li>Download the notebook below.</li>
            <li>
              In GeoLibre, open <strong>Processing → Jupyter Notebook</strong>.
            </li>
            <li>
              Upload the downloaded <code>.ipynb</code>, open it, then run all
              cells.
            </li>
          </ol>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            The web notebook runs entirely in your browser and controls the
            live tehsil map. No Python server is required.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={downloadNotebook}
            className="flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-800"
          >
            <Download className="h-4 w-4" />
            Download Jupyter notebook
          </button>
          <button
            type="button"
            onClick={downloadScript}
            className="flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-purple-800 hover:bg-purple-50"
          >
            <Download className="h-4 w-4" />
            Download Python Console script
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900">
            Use the same notebook elsewhere
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Upload it to Colab, VS Code, or local Jupyter. It will install the
            tested GeoLibre Python package and open a portable copy of this
            tehsil project as an interactive widget.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="https://colab.research.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Open Google Colab
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href="https://geolibre.app/notebook/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <BookOpen className="h-4 w-4" />
              GeoLibre notebook guide
            </a>
          </div>
        </div>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          CoRE Stack datasets are available under CC BY 4.0. Notebook results
          are derived session layers and never modify the published sources.
        </p>
      </section>
    </div>
  );
};

export default GeoLibrePythonLab;
