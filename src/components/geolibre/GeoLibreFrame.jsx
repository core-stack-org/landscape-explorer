import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GEOLIBRE_CONFIG,
  geoLibreVersionStatus,
  resolveGeoLibreViewer,
} from "../../config/geolibre.config";

const MAX_TECHNICAL_LOG_ENTRIES = 40;

const USER_ISSUES = {
  preparation: {
    title: "We couldn’t prepare this tehsil’s map",
    message:
      "Please try again. If the problem continues, select the tehsil again or share the technical log with the CoRE Stack team.",
  },
  delayed: {
    title: "The map is taking longer than expected",
    message:
      "Check your internet connection and try again. If the problem continues, download the technical log and share it with the CoRE Stack team.",
  },
  unavailable: {
    title: "The map is temporarily unavailable",
    message:
      "Please try again in a moment. If the problem continues, download the technical log and share it with the CoRE Stack team.",
  },
};

export const formatGeoLibreLog = (entries) =>
  [
    "KYL GeoLibre technical log",
    `Generated: ${new Date().toISOString()}`,
    ...entries.map(
      ({ timestamp, event, details }) =>
        `${timestamp} ${event}${details ? ` ${JSON.stringify(details)}` : ""}`
    ),
  ].join("\n");

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
  const technicalLogRef = useRef([]);
  const [viewerState, setViewerState] = useState("loading");
  const [viewerIssue, setViewerIssue] = useState("");
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

  const addTechnicalLog = useCallback((event, details) => {
    technicalLogRef.current = [
      ...technicalLogRef.current,
      {
        timestamp: new Date().toISOString(),
        event,
        ...(details ? { details } : {}),
      },
    ].slice(-MAX_TECHNICAL_LOG_ENTRIES);
  }, []);

  useEffect(() => {
    addTechnicalLog("viewer_configured", {
      expectedVersion: GEOLIBRE_CONFIG.version,
      viewerUrl: viewer.url || null,
      configurationError: viewer.error || null,
    });
  }, [addTechnicalLog, viewer.error, viewer.url]);

  useEffect(() => {
    if (preparationError) {
      addTechnicalLog("project_preparation_failed", {
        message: String(preparationError),
      });
    }
  }, [addTechnicalLog, preparationError]);

  useEffect(() => {
    if (!viewer.url) return undefined;
    const frame = frameRef.current;
    if (!frame) return undefined;

    let handshakeTimer = window.setTimeout(() => {
      addTechnicalLog("iframe_handshake_timeout", {
        expectedVersion: GEOLIBRE_CONFIG.version,
        viewerUrl: viewer.url,
        timeoutMs: 90000,
      });
      setViewerIssue("delayed");
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
          addTechnicalLog("viewer_version_rejected", {
            actualVersion: event.data.version,
            reason: status.message,
          });
          setViewerIssue("unavailable");
          setViewerState("error");
          return;
        }
        addTechnicalLog("iframe_ready", {
          actualVersion: event.data.version,
        });
        setViewerVersion(String(event.data.version));
        sentProjectRef.current = null;
        setViewerIssue("");
        setViewerState("ready");
        setReadyGeneration((generation) => generation + 1);
        return;
      }

      if (event.data.type === "geolibre:error") {
        addTechnicalLog("viewer_reported_error", {
          message:
            event.data.message || "GeoLibre could not load the generated project.",
        });
        setViewerIssue("unavailable");
        setViewerState("error");
        return;
      }

      if (event.data.type === "geolibre:state" && event.data.project) {
        addTechnicalLog("project_state_received", {
          layerCount: event.data.project.layers?.length || 0,
        });
        onProjectState?.(event.data.project);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (handshakeTimer !== null) window.clearTimeout(handshakeTimer);
    };
  }, [addTechnicalLog, onProjectState, viewer.origin, viewer.url]);

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
    addTechnicalLog("project_sent", {
      sequence,
      projectName: project.name,
      layerCount: project.layers?.length || 0,
    });
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
        addTechnicalLog("initial_bounds_fit_requested", { bounds });
        fitTimerRef.current = null;
      }, 1500);
    }
    setViewerState("loaded");
  }, [addTechnicalLog, project, readyGeneration, viewer.origin, viewerState]);

  const activeIssue = viewer.error
    ? "unavailable"
    : preparationError
      ? "preparation"
      : viewerIssue;
  const userIssue = activeIssue ? USER_ISSUES[activeIssue] : null;
  const showProgress = !userIssue && (!project || viewerState === "loading");

  const downloadTechnicalLog = () => {
    const blob = new Blob([formatGeoLibreLog(technicalLogRef.current)], {
      type: "text/plain;charset=utf-8",
    });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `kyl-geolibre-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.log`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
  };

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
            addTechnicalLog("iframe_loaded", { viewerUrl: viewer.url });
            fittedScopeRef.current = "";
            setViewerVersion("");
            setViewerState((current) =>
              current === "loaded" ? current : "loading"
            );
          }}
        />
      )}

      {!userIssue && viewerVersion && (
        <div
          className="pointer-events-none absolute bottom-8 right-3 rounded-md border border-slate-300 bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm"
          title={`Loaded from ${viewer.url}`}
          role="status"
        >
          GeoLibre {viewerVersion} · {viewer.versionPinned ? "pinned" : "rolling host"}
        </div>
      )}

      {(showProgress || userIssue) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 p-5 backdrop-blur-[1px]">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl"
            role={userIssue ? "alert" : "status"}
          >
            {userIssue ? (
              <>
                <h1 className="text-lg font-semibold text-slate-900">
                  {userIssue.title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {userIssue.message}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800"
                    >
                      Try again
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={downloadTechnicalLog}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Download technical log
                  </button>
                </div>
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

      {!userIssue && warning && viewerState === "loaded" && (
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
