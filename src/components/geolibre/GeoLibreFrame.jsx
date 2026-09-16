import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GEOLIBRE_CONFIG,
  resolveGeoLibreViewer,
} from "../../config/geolibre.config";
import GeoLibreLegend from "./GeoLibreLegend";
import { GeoLibreReadiness } from "./geolibreReadiness";

const MAX_TECHNICAL_LOG_ENTRIES = 40;

const SUPPORT_EMAIL = "support@core-stack.org";

const COMMON_RECOVERY_STEPS =
  "If the problem continues, clear your browser cache and try again. Try using a different browser or device if the issue persists.";

export const USER_ISSUES = Object.freeze({
  preparation: {
    title: "We couldn’t prepare this tehsil’s map",
    message: [
      "Please try again. Start with freshly reloading your tab.",
      COMMON_RECOVERY_STEPS,
      `If you are a KYL partner, contact your KYL technical support representative for assistance; otherwise, contact support at ${SUPPORT_EMAIL}.`
    ].join(" "),
  },
  delayed: {
    title: "The map is taking longer than expected",
    message: `Check your internet connection and try again. ${COMMON_RECOVERY_STEPS}`,
  },
  unavailable: {
    title: "The map is temporarily unavailable",
    message: `Please try again in a moment. ${COMMON_RECOVERY_STEPS}`,
  },
});

export const formatGeoLibreLog = (entries) =>
  [
    "KYL GeoLibre technical log",
    `Generated: ${new Date().toISOString()}`,
    ...entries.map(
      ({ timestamp, event, details }) =>
        `${timestamp} ${event}${details ? ` ${JSON.stringify(details)}` : ""}`
    ),
  ].join("\n");

// Visibility and opacity are live viewer state. They must not cause a full
// project replacement, because GeoLibre would tear down and recreate native
// raster sources that are already resident in the map. Keep only fields that
// describe project structure, data, or styling in the load signature.
export const geoLibreProjectLoadSignature = (project) =>
  project
    ? JSON.stringify({
        version: project.version,
        name: project.name,
        scope: project.metadata?.scope,
        bbox: project.mapView?.bbox,
        mapLayout: project.mapLayout,
        secondaryMapViews: project.secondaryMapViews,
        layers: (project.layers || []).map((layer) => ({
          id: layer.id,
          name: layer.name,
          type: layer.type,
          source: layer.source,
          sourcePath: layer.sourcePath,
          groupId: layer.groupId,
          style: layer.style,
          loadState: layer.metadata?.loadState,
          featureCount:
            layer.metadata?.featureCount ?? layer.geojson?.features?.length,
        })),
      })
    : "";

const GeoLibreFrame = ({
  project,
  preparationError,
  warning,
  legends,
  onRetry,
  onProjectState,
  onWorkspaceReady,
}) => {
  const frameRef = useRef(null);
  const bridgeRef = useRef(null);
  const sentSignatureRef = useRef("");
  const technicalLogRef = useRef([]);
  const callbacksRef = useRef({ onProjectState, onWorkspaceReady });
  callbacksRef.current = { onProjectState, onWorkspaceReady };
  const [viewerState, setViewerState] = useState("loading");
  const [viewerIssue, setViewerIssue] = useState("");
  const [viewerVersion, setViewerVersion] = useState("");
  const [mapBounds, setMapBounds] = useState(null);
  const [backgroundIssue, setBackgroundIssue] = useState("");

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
    const entry = { timestamp: new Date().toISOString(), event, ...(details ? { details } : {}) };
    technicalLogRef.current = [
      ...technicalLogRef.current,
      entry,
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
    const bridge = new GeoLibreReadiness({
      post: message => frame?.contentWindow?.postMessage(message, viewer.origin),
      log: addTechnicalLog,
      update: ({ state, issue, version, backgroundIssue: layerIssue }) => {
        if (layerIssue !== undefined) setBackgroundIssue(layerIssue);
        if (state) setViewerState(state);
        if (issue !== undefined) setViewerIssue(issue);
        if (version) setViewerVersion(version);
      },
      onProjectState: snapshot => callbacksRef.current.onProjectState?.(snapshot),
      onReady: timing => callbacksRef.current.onWorkspaceReady?.(timing),
      onBounds: setMapBounds,
      requireRenderConfirmation: GEOLIBRE_CONFIG.requireRenderConfirmation,
    });
    bridgeRef.current = bridge;
    const handleMessage = event => {
      if (event.origin !== viewer.origin || event.source !== frame?.contentWindow || !event.data || typeof event.data !== "object") return;
      bridge.receive(event.data);
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      bridge.dispose();
      bridgeRef.current = null;
      sentSignatureRef.current = "";
    };
  }, [addTechnicalLog, viewer.origin, viewer.url]);

  useEffect(() => {
    const signature = geoLibreProjectLoadSignature(project);
    if (!bridgeRef.current || sentSignatureRef.current === signature) return;
    sentSignatureRef.current = signature;
    bridgeRef.current.load(project);
  }, [project]);

  const activeIssue = viewer.error
    ? "unavailable"
    : preparationError
      ? "preparation"
      : viewerIssue;
  const userIssue = activeIssue ? USER_ISSUES[activeIssue] : null;
  const showProgress = !userIssue && (!project || viewerState !== "loaded");

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
            // The DOM load event can follow the app handshake; it is not map readiness.
          }}
        />
      )}

      {!userIssue && viewerState === "loaded" && (
        <GeoLibreLegend legends={legends} mapBounds={mapBounds} />
      )}

      {!userIssue && viewerVersion && (
        <button type="button"
          className="absolute bottom-3 left-3 rounded-md border border-slate-300 bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm"
          title="Download map loading log"
          onClick={downloadTechnicalLog}
        >
          GeoLibre {viewerVersion} · {viewer.versionPinned ? "pinned" : "rolling host"}
        </button>
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
                  GeoLibre is loading
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {!viewerVersion
                    ? "Connecting to GeoLibre. This may take a little longer while the service is busy."
                    : viewerState === "rendering"
                      ? "Drawing the map and its starting layers…"
                      : "Preparing your map…"}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {!userIssue && (warning || backgroundIssue) && viewerState === "loaded" && (
        <div
          className="absolute bottom-4 left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50/95 px-4 py-2 text-sm text-amber-950 shadow-lg"
          role="status"
        >
          {warning || backgroundIssue}
        </div>
      )}
    </main>
  );
};

export default GeoLibreFrame;
