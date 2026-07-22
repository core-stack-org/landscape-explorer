import { useEffect, useMemo, useRef, useState } from "react";
import {
  GEOLIBRE_CONFIG,
  geoLibreVersionStatus,
  resolveGeoLibreViewer,
} from "../../config/geolibre.config";

const GeoLibreFrame = ({
  project,
  preparationMessage,
  preparationError,
  warning,
  onRetry,
  onProjectState,
}) => {
  const frameRef = useRef(null);
  const fitTimerRef = useRef(null);
  const fittedScopeRef = useRef("");
  const sentProjectRef = useRef(null);
  const sequenceRef = useRef(0);
  const [viewerState, setViewerState] = useState("loading");
  const [viewerError, setViewerError] = useState("");
  const [viewerVersion, setViewerVersion] = useState("");
  const [readyGeneration, setReadyGeneration] = useState(0);

  const viewer = useMemo(() => {
    try {
      return { ...resolveGeoLibreViewer(), error: "" };
    } catch (error) {
      return {
        url: "",
        origin: "",
        error:
          error instanceof Error
            ? error.message
            : "The configured GeoLibre URL is invalid.",
      };
    }
  }, []);

  useEffect(() => {
    if (!viewer.url) return undefined;
    const frame = frameRef.current;
    if (!frame) return undefined;

    let handshakeTimer = window.setTimeout(() => {
      setViewerError(
        `GeoLibre ${GEOLIBRE_CONFIG.version} did not complete its iframe handshake. Check the configured viewer URL and browser console.`
      );
      setViewerState("error");
    }, 90000);

    const handleMessage = (event) => {
      if (
        event.origin !== viewer.origin ||
        event.source !== frame.contentWindow ||
        !event.data ||
        typeof event.data !== "object"
      ) {
        return;
      }

      if (event.data.type === "geolibre:ready") {
        window.clearTimeout(handshakeTimer);
        handshakeTimer = null;
        const status = geoLibreVersionStatus(event.data.version);
        if (!status.compatible) {
          setViewerError(status.message);
          setViewerState("error");
          return;
        }
        setViewerVersion(String(event.data.version));
        sentProjectRef.current = null;
        setViewerError("");
        setViewerState("ready");
        setReadyGeneration((generation) => generation + 1);
        return;
      }

      if (event.data.type === "geolibre:error") {
        setViewerError(
          event.data.message || "GeoLibre could not load the generated project."
        );
        setViewerState("error");
        return;
      }

      if (event.data.type === "geolibre:state" && event.data.project) {
        onProjectState?.(event.data.project);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (handshakeTimer !== null) window.clearTimeout(handshakeTimer);
    };
  }, [onProjectState, viewer.origin, viewer.url]);

  useEffect(
    () => () => {
      if (fitTimerRef.current !== null) {
        window.clearTimeout(fitTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const target = frameRef.current?.contentWindow;
    if (
      !target ||
      !project ||
      !["ready", "loaded"].includes(viewerState) ||
      sentProjectRef.current === project
    ) {
      return;
    }

    sequenceRef.current += 1;
    const sequence = sequenceRef.current;
    target.postMessage(
      {
        type: "geolibre:load-project",
        project,
        seq: sequence,
      },
      viewer.origin
    );
    sentProjectRef.current = project;
    const bounds = project.mapView?.bbox;
    const scope = project.metadata?.scope;
    const scopeKey = scope
      ? [scope.state, scope.district, scope.tehsil].join("|")
      : project.name || "default";
    if (
      Array.isArray(bounds) &&
      bounds.length === 4 &&
      fittedScopeRef.current !== scopeKey
    ) {
      fittedScopeRef.current = scopeKey;
      if (fitTimerRef.current !== null) {
        window.clearTimeout(fitTimerRef.current);
      }
      fitTimerRef.current = window.setTimeout(() => {
        target.postMessage(
          {
            type: "geolibre:command",
            requestId: `kyl-fit-bounds-${sequence}`,
            method: "fitBounds",
            params: { bounds },
          },
          viewer.origin
        );
        fitTimerRef.current = null;
      }, 1500);
    }
    setViewerState("loaded");
  }, [project, readyGeneration, viewer.origin, viewerState]);

  const activeError = viewer.error || preparationError || viewerError;
  const showProgress = !activeError && (!project || viewerState === "loading");

  return (
    <main className="relative min-h-0 flex-1 overflow-hidden bg-slate-100">
      {viewer.url && (
        <iframe
          ref={frameRef}
          src={viewer.url}
          title="GeoLibre GIS workspace"
          className="h-full w-full border-0 bg-white"
          allow="fullscreen; clipboard-read; clipboard-write"
          allowFullScreen
          data-geolibre-version={viewerVersion || undefined}
          onLoad={() => {
            fittedScopeRef.current = "";
            setViewerVersion("");
            setViewerState((current) =>
              current === "loaded" ? current : "loading"
            );
          }}
        />
      )}

      {!activeError && viewerVersion && (
        <div
          className="pointer-events-none absolute bottom-8 right-3 rounded-md border border-slate-300 bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm"
          title={`Loaded from ${viewer.url}`}
          role="status"
        >
          GeoLibre {viewerVersion} · {viewer.versionPinned ? "pinned" : "rolling host"}
        </div>
      )}

      {(showProgress || activeError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 p-5 backdrop-blur-[1px]">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl"
            role={activeError ? "alert" : "status"}
          >
            {activeError ? (
              <>
                <h1 className="text-lg font-semibold text-slate-900">
                  GeoLibre could not be opened
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {activeError}
                </p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-5 rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800"
                  >
                    Try again
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-purple-100 border-t-purple-700" />
                <h1 className="mt-4 text-base font-semibold text-slate-900">
                  Preparing GeoLibre
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {preparationMessage ||
                    `Starting GeoLibre ${GEOLIBRE_CONFIG.version}…`}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {!activeError && warning && viewerState === "loaded" && (
        <div
          className="absolute bottom-4 left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50/95 px-4 py-2 text-sm text-amber-950 shadow-lg"
          role="status"
        >
          {warning}
        </div>
      )}
    </main>
  );
};

export default GeoLibreFrame;
