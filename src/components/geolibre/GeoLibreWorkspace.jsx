import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GEOLIBRE_APPLICATION_VERSION,
  GEOLIBRE_VIEWER_URL,
} from "./geolibreProject";

const GeoLibreWorkspace = ({ project, isPreparing = false, onViewerError }) => {
  const frameRef = useRef(null);
  const projectRef = useRef(project);
  const readyRef = useRef(false);
  const sequenceRef = useRef(0);
  const stateRequestTimerRef = useRef(null);
  const readyFallbackTimerRef = useRef(null);
  const [viewerVersion, setViewerVersion] = useState(null);
  const [status, setStatus] = useState("waiting");

  const viewer = useMemo(() => {
    const url = new URL(GEOLIBRE_VIEWER_URL);
    url.searchParams.set("embed", "1");
    url.searchParams.set("welcome", "0");
    return { origin: url.origin, url: url.toString() };
  }, []);

  const loadProject = useCallback(
    (nextProject) => {
      if (
        !readyRef.current ||
        !nextProject ||
        !frameRef.current?.contentWindow
      ) {
        return;
      }

      sequenceRef.current += 1;
      setStatus("loading");
      window.clearTimeout(stateRequestTimerRef.current);
      window.clearTimeout(readyFallbackTimerRef.current);
      frameRef.current.contentWindow.postMessage(
        {
          type: "geolibre:load-project",
          project: nextProject,
          seq: sequenceRef.current,
        },
        viewer.origin
      );
      stateRequestTimerRef.current = window.setTimeout(() => {
        frameRef.current?.contentWindow?.postMessage(
          { type: "geolibre:request-state" },
          viewer.origin
        );
      }, 350);
      readyFallbackTimerRef.current = window.setTimeout(() => {
        setStatus((current) => (current === "loading" ? "ready" : current));
      }, 2500);
    },
    [viewer.origin]
  );

  useEffect(() => {
    projectRef.current = project;
    loadProject(project);
  }, [loadProject, project]);

  useEffect(() => {
    const frame = frameRef.current;
    const handleMessage = (event) => {
      if (
        event.origin !== viewer.origin ||
        event.source !== frame?.contentWindow
      ) {
        return;
      }

      if (event.data?.type === "geolibre:ready") {
        readyRef.current = true;
        setViewerVersion(event.data.version || "connected");
        setStatus(projectRef.current ? "loading" : "ready");
        loadProject(projectRef.current);
      } else if (event.data?.type === "geolibre:state") {
        window.clearTimeout(readyFallbackTimerRef.current);
        setStatus("ready");
      } else if (event.data?.type === "geolibre:error") {
        const message = event.data.message || "GeoLibre could not load the project.";
        setStatus("error");
        onViewerError?.(message);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(stateRequestTimerRef.current);
      window.clearTimeout(readyFallbackTimerRef.current);
    };
  }, [loadProject, onViewerError, project, viewer.origin]);

  if (!project) {
    return (
      <section className="flex h-full min-h-[520px] items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50 p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-3xl">
            🗺️
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Select a tehsil to start
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            KYL will prepare the tehsil extent, styled vector layers, MWS data,
            and the latest Level 3 LULC layer, then open them here in GeoLibre.
          </p>
        </div>
      </section>
    );
  }

  const versionMismatch =
    viewerVersion &&
    viewerVersion !== "connected" &&
    viewerVersion !== GEOLIBRE_APPLICATION_VERSION;

  return (
    <section
      className="flex h-full min-h-[620px] flex-col bg-white"
      aria-label="GeoLibre workspace"
    >
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {project.name}
          </p>
          <p className="text-xs text-slate-500">
            GeoLibre {viewerVersion || GEOLIBRE_APPLICATION_VERSION}
            {" · "}
            {status === "ready"
              ? "Project ready"
              : status === "error"
              ? "Load failed"
              : "Loading project…"}
          </p>
        </div>
        {versionMismatch && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            Expected v{GEOLIBRE_APPLICATION_VERSION}
          </span>
        )}
      </header>

      <div className="relative min-h-0 flex-1">
        <iframe
          ref={frameRef}
          src={viewer.url}
          title="GeoLibre GIS workspace"
          className="absolute inset-0 h-full w-full border-0"
          allow="fullscreen; clipboard-read; clipboard-write"
          allowFullScreen
        />
        {(isPreparing || status === "loading" || status === "waiting") && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <div className="rounded-xl border border-purple-100 bg-white px-5 py-3 text-sm font-medium text-purple-800 shadow-lg">
              Preparing live tehsil layers…
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default GeoLibreWorkspace;
