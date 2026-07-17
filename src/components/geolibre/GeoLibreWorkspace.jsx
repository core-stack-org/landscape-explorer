import { useEffect, useRef } from "react";
import { GEOLIBRE_VIEWER_URL } from "./geolibreProject";

const GeoLibreWorkspace = ({ project, onClose, onDownload }) => {
  const frameRef = useRef(null);

  useEffect(() => {
    if (!project || !frameRef.current) return undefined;

    const frame = frameRef.current;
    const viewerUrl = new URL(GEOLIBRE_VIEWER_URL);
    viewerUrl.searchParams.set("embed", "1");
    viewerUrl.searchParams.set("welcome", "0");
    const viewerOrigin = viewerUrl.origin;

    const handleMessage = (event) => {
      if (
        event.origin !== viewerOrigin ||
        event.source !== frame.contentWindow ||
        event.data?.type !== "geolibre:ready"
      ) {
        return;
      }

      frame.contentWindow?.postMessage(
        { type: "geolibre:load-project", project, seq: Date.now() },
        viewerOrigin
      );
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    frame.src = viewerUrl.toString();

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, project]);

  if (!project) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="GeoLibre workspace"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {project.name}
          </p>
          <p className="text-xs text-gray-500">
            Live CoRE Stack layers in GeoLibre
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onDownload}
            className="rounded-md bg-purple-100 px-3 py-2 text-sm font-medium text-purple-800 hover:bg-purple-200"
          >
            Download project JSON
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Back to KYL
          </button>
        </div>
      </div>
      <iframe
        ref={frameRef}
        title="GeoLibre GIS workspace"
        className="min-h-0 flex-1 border-0"
        allow="fullscreen; clipboard-read; clipboard-write"
        allowFullScreen
      />
    </div>
  );
};

export default GeoLibreWorkspace;
