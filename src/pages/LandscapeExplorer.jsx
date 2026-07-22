import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useRecoilValue } from "recoil";
import GeoLibreFrame from "../components/geolibre/GeoLibreFrame";
import { buildGeoLibreProject } from "../components/geolibre/geolibreProject";
import LandingNavbar from "../components/landing_navbar";
import {
  blockAtom,
  districtAtom,
  stateAtom,
} from "../store/locationStore";
import {
  initializeAnalytics,
  trackEvent,
  trackPageView,
} from "../services/analytics";

const labelOf = (selection) => selection?.label || "";

const LandscapeExplorer = () => {
  const selectedState = useRecoilValue(stateAtom);
  const selectedDistrict = useRecoilValue(districtAtom);
  const selectedTehsil = useRecoilValue(blockAtom);
  const routeLocation = useLocation();
  const [project, setProject] = useState(null);
  const [progress, setProgress] = useState("Starting GeoLibre…");
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const scope = useMemo(() => {
    const params = new URLSearchParams(routeLocation.search);
    return {
      state: params.get("state") || labelOf(selectedState),
      district: params.get("district") || labelOf(selectedDistrict),
      tehsil: params.get("tehsil") || labelOf(selectedTehsil),
    };
  }, [
    routeLocation.search,
    selectedDistrict,
    selectedState,
    selectedTehsil,
  ]);

  const hasLocation = Boolean(scope.state && scope.district && scope.tehsil);

  useEffect(() => {
    initializeAnalytics();
    trackPageView("/download_layers");
  }, []);

  useEffect(() => {
    if (!hasLocation) return undefined;
    const controller = new AbortController();
    setProject(null);
    setError("");
    setProgress(`Loading the Socio-Economic Profile for ${scope.tehsil}…`);

    buildGeoLibreProject({
      ...scope,
      signal: controller.signal,
      viewport: {
        width: Math.max(window.innerWidth - 340, 320),
        height: Math.max(window.innerHeight - 100, 320),
      },
      onProgress: ({ message }) => {
        if (!controller.signal.aborted) setProgress(message);
      },
      onInitialProject: (overviewProject) => {
        if (controller.signal.aborted) return;
        setProject(overviewProject);
        setProgress("Loading Watersheds in the background…");
        trackEvent("GeoLibre", "open_workspace", scope.tehsil);
      },
    })
      .then((nextProject) => {
        if (controller.signal.aborted) return;
        setProject(nextProject);
        setProgress("Overview and Watersheds are ready.");
      })
      .catch((buildError) => {
        if (controller.signal.aborted) return;
        setError(
          buildError instanceof Error
            ? buildError.message
            : "The tehsil project could not be generated."
        );
      });

    return () => controller.abort();
  }, [hasLocation, retryKey, scope]);

  if (!hasLocation) {
    return (
      <div className="flex h-screen flex-col bg-slate-100">
        <LandingNavbar />
        <main className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-2xl bg-white p-7 text-center shadow-xl">
            <h1 className="text-xl font-semibold text-slate-900">
              Select a tehsil first
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              GeoLibre projects are generated for a selected state, district,
              and tehsil.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800"
            >
              Select location
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const failures =
    project?.metadata?.layerLoading?.initialLoadFailures?.length || 0;
  const warning = failures
    ? `${failures} layer${failures === 1 ? "" : "s"} could not be preloaded. They remain listed in GeoLibre and can be retried with Refresh.`
    : "";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <LandingNavbar />
      <GeoLibreFrame
        project={project}
        preparationMessage={progress}
        preparationError={error}
        warning={warning}
        onRetry={() => setRetryKey((value) => value + 1)}
      />
    </div>
  );
};

export default LandscapeExplorer;
