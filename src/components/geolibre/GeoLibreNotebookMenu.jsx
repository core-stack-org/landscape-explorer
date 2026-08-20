import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { GEOLIBRE_NOTEBOOK_CATALOGUE } from "./geolibreNotebook";

const RECENT_NOTEBOOKS_KEY = "corestack.geolibre.recentNotebooks";
const GUIDED_NOTEBOOKS = GEOLIBRE_NOTEBOOK_CATALOGUE.filter(
  ({ featured }) => featured
);
const MANIFEST_NOTEBOOKS = GEOLIBRE_NOTEBOOK_CATALOGUE.filter(
  ({ featured }) => !featured
);

const readRecentNotebooks = () => {
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENT_NOTEBOOKS_KEY));
    return Array.isArray(value) ? value.slice(0, 2) : [];
  } catch (_error) {
    return [];
  }
};

const NotebookButton = ({ notebook, disabled, downloading, onDownload }) => (
  <button
    type="button"
    disabled={disabled || downloading}
    onClick={() => onDownload(notebook)}
    title={`Download ${notebook.title}`}
    className="group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <span className="mt-0.5 rounded-md bg-purple-100 p-1.5 text-purple-700">
      {downloading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="h-4 w-4" aria-hidden="true" />
      )}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold leading-5 text-slate-900 group-hover:text-purple-800">
        {notebook.title}
      </span>
      <span className="mt-0.5 block text-xs leading-4 text-slate-600">
        {notebook.summary}
      </span>
    </span>
  </button>
);

const GeoLibreNotebookMenu = ({ project, onDownload }) => {
  const [open, setOpen] = useState(false);
  const [recentIds, setRecentIds] = useState(readRecentNotebooks);
  const [downloadingId, setDownloadingId] = useState("");
  const [notice, setNotice] = useState(null);
  const containerRef = useRef(null);

  const recentNotebooks = useMemo(
    () =>
      recentIds
        .map((id) =>
          GEOLIBRE_NOTEBOOK_CATALOGUE.find((notebook) => notebook.id === id)
        )
        .filter(Boolean),
    [recentIds]
  );

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const rememberNotebook = (notebookId) => {
    setRecentIds((current) => {
      const next = [
        notebookId,
        ...current.filter((id) => id !== notebookId),
      ].slice(0, 2);
      try {
        window.localStorage.setItem(RECENT_NOTEBOOKS_KEY, JSON.stringify(next));
      } catch (_error) {
        // The download still works when storage is unavailable or disabled.
      }
      return next;
    });
  };

  const handleDownload = async (notebook) => {
    if (!project || !onDownload) return;
    setDownloadingId(notebook.id);
    setNotice(null);
    try {
      const result = await onDownload(notebook.id);
      rememberNotebook(notebook.id);
      setNotice({
        type: "success",
        text: `${result?.filename || notebook.title} downloaded. Upload it from Processing → Jupyter Notebook → Upload Files.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: error?.message || "The notebook could not be downloaded. Please try again.",
      });
    } finally {
      setDownloadingId("");
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg border border-purple-300 bg-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 sm:text-base"
        title="Download guided notebooks for the active CoRE Stack tehsil"
      >
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        <span>Explore CoRE Stack Data Layers with Notebooks</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="CoRE Stack notebook downloads"
          className="absolute right-0 z-[70] mt-2 w-[min(94vw,30rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              Download, then open in GeoLibre
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Processing → Jupyter Notebook → Upload Files. Each download starts
              with the active tehsil and runs without optional widget packages.
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <a
                href="https://geolibre.app/user-guide/interface/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:underline"
              >
                GeoLibre interface guide
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              <a
                href="https://geolibre.app/notebook/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:underline"
              >
                Notebook guide
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </div>

          {!project && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs leading-5 text-amber-900">
              Select a state, district, and tehsil before downloading a scoped notebook.
            </div>
          )}

          {recentNotebooks.length > 0 && (
            <div className="border-b border-slate-200 px-2 py-2">
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Recently downloaded
              </p>
              {recentNotebooks.map((notebook) => (
                <NotebookButton
                  key={`recent-${notebook.id}`}
                  notebook={notebook}
                  disabled={!project || Boolean(downloadingId)}
                  downloading={downloadingId === notebook.id}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}

          <div className="max-h-96 overflow-y-auto overscroll-contain px-2 py-2">
            <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Guided notebooks
            </p>
            {GUIDED_NOTEBOOKS.map((notebook) => (
              <NotebookButton
                key={notebook.id}
                notebook={notebook}
                disabled={!project || Boolean(downloadingId)}
                downloading={downloadingId === notebook.id}
                onDownload={handleDownload}
              />
            ))}
            <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Complete layer manifest
            </p>
            {MANIFEST_NOTEBOOKS.map((notebook) => (
              <NotebookButton
                key={notebook.id}
                notebook={notebook}
                disabled={!project || Boolean(downloadingId)}
                downloading={downloadingId === notebook.id}
                onDownload={handleDownload}
              />
            ))}
          </div>

          {notice && (
            <div
              role={notice.type === "error" ? "alert" : "status"}
              className={`flex items-start gap-2 border-t px-4 py-3 text-xs leading-5 ${
                notice.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {notice.type === "error" ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>{notice.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GeoLibreNotebookMenu;
