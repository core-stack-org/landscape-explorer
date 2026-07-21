import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRecoilState } from "recoil";
import {
  blockAtom,
  districtAtom,
  stateAtom,
  stateDataAtom,
} from "../store/locationStore";
import getStates from "../actions/getStates";
import {
  initializeAnalytics,
  trackEvent,
  trackPageView,
} from "../services/analytics";
import LandingNavbar from "../components/landing_navbar";
import GeoLibreLayerPanel from "../components/geolibre/GeoLibreLayerPanel";
import GeoLibreWorkspace from "../components/geolibre/GeoLibreWorkspace";
import {
  buildGeoLibreProject,
  downloadGeoLibreProject,
  fetchTehsilBounds,
  mapViewFromBounds,
} from "../components/geolibre/geolibreProject";
import {
  DEFAULT_GEOLIBRE_LULC_YEARS,
  getDefaultGeoLibreLayerIds,
} from "../config/geolibreLayers";

const defaultLulcSelections = () =>
  Object.fromEntries(
    Object.entries(DEFAULT_GEOLIBRE_LULC_YEARS).map(([layerId, years]) => [
      layerId,
      [...years],
    ])
  );

const locationLabel = (value) => value?.label || value || "";

const selectionSignature = (layerIds, lulcSelections) =>
  JSON.stringify({
    layerIds: [...layerIds].sort(),
    lulc: Object.fromEntries(
      Object.entries(lulcSelections)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([layerId, years]) => [layerId, [...years].sort()])
    ),
  });

const LandscapeExplorer = () => {
  const [statesData, setStatesData] = useRecoilState(stateDataAtom);
  const [state, setState] = useRecoilState(stateAtom);
  const [district, setDistrict] = useRecoilState(districtAtom);
  const [tehsil, setTehsil] = useRecoilState(blockAtom);
  const [selectedLayerIds, setSelectedLayerIds] = useState(() =>
    getDefaultGeoLibreLayerIds()
  );
  const [lulcSelections, setLulcSelections] = useState(defaultLulcSelections);
  const [project, setProject] = useState(null);
  const [appliedSignature, setAppliedSignature] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const requestIdRef = useRef(0);

  useEffect(() => {
    initializeAnalytics();
    trackPageView("/download_layers");

    if (!statesData) {
      getStates().then(setStatesData);
    }
  }, [setStatesData, statesData]);

  const stateName = locationLabel(state);
  const districtName = locationLabel(district);
  const tehsilName = locationLabel(tehsil);
  const locationKey = [stateName, districtName, tehsilName].join("|");
  const locationReady = Boolean(stateName && districtName && tehsilName);

  const prepareProject = useCallback(
    async (layerIds, nextLulcSelections, { activate = true } = {}) => {
      if (!locationReady) {
        setError("Select a state, district, and tehsil first.");
        return null;
      }

      const requestId = ++requestIdRef.current;
      setIsPreparing(true);
      setError("");
      setWarning("");

      try {
        const bounds = await fetchTehsilBounds({
          district: districtName,
          tehsil: tehsilName,
        });
        const viewportWidth =
          typeof window === "undefined"
            ? 1200
            : Math.max(window.innerWidth - 430, 640);
        const mapView = mapViewFromBounds(bounds, {
          width: viewportWidth,
          height: 760,
        });
        const nextProject = buildGeoLibreProject({
          state: stateName,
          district: districtName,
          tehsil: tehsilName,
          selectedLayerIds: layerIds,
          lulcSelections: nextLulcSelections,
          mapView,
        });

        if (requestId !== requestIdRef.current) return null;

        if (activate) {
          setProject(nextProject);
          setAppliedSignature(
            selectionSignature(layerIds, nextLulcSelections)
          );
          trackEvent(
            "GeoLibre",
            "load_project",
            tehsilName
          );
        }

        return nextProject;
      } catch (projectError) {
        if (requestId === requestIdRef.current) {
          setError(
            projectError?.message || "The GeoLibre project could not be prepared."
          );
        }
        return null;
      } finally {
        if (requestId === requestIdRef.current) {
          setIsPreparing(false);
        }
      }
    },
    [
      districtName,
      locationReady,
      stateName,
      tehsilName,
    ]
  );

  useEffect(() => {
    requestIdRef.current += 1;
    const defaultLayerIds = getDefaultGeoLibreLayerIds();
    const defaultYears = defaultLulcSelections();
    setSelectedLayerIds(defaultLayerIds);
    setLulcSelections(defaultYears);
    setProject(null);
    setAppliedSignature("");
    setError("");
    setWarning("");

    if (locationReady) {
      prepareProject(defaultLayerIds, defaultYears);
    }
  }, [locationKey, locationReady, prepareProject]);

  const handleLocationSelect = (setter, value) => {
    if (setter === setState) {
      setState(value);
      setDistrict(null);
      setTehsil(null);
      if (value) trackEvent("Location", "select_state", value.label);
    } else if (setter === setDistrict) {
      setDistrict(value);
      setTehsil(null);
      if (value) trackEvent("Location", "select_district", value.label);
    } else if (setter === setTehsil) {
      setTehsil(value);
      if (value) trackEvent("Location", "select_tehsil", value.label);
    }
  };

  const handleLayerToggle = (layerId) => {
    setSelectedLayerIds((current) =>
      current.includes(layerId)
        ? current.filter((id) => id !== layerId)
        : [...current, layerId]
    );
  };

  const handleLulcToggle = (layerId, year) => {
    setLulcSelections((current) => {
      const selectedYears = current[layerId] || [];
      return {
        ...current,
        [layerId]: selectedYears.includes(year)
          ? selectedYears.filter((selectedYear) => selectedYear !== year)
          : [...selectedYears, year],
      };
    });
  };

  const selectedCount = useMemo(
    () =>
      selectedLayerIds.length +
      Object.values(lulcSelections).reduce(
        (total, years) => total + years.length,
        0
      ),
    [lulcSelections, selectedLayerIds]
  );
  const currentSignature = useMemo(
    () => selectionSignature(selectedLayerIds, lulcSelections),
    [lulcSelections, selectedLayerIds]
  );
  const hasPendingChanges = Boolean(
    project && currentSignature !== appliedSignature
  );

  const handleApply = () =>
    prepareProject(selectedLayerIds, lulcSelections, { activate: true });

  const handleDownload = async () => {
    const downloadProject = await prepareProject(
      selectedLayerIds,
      lulcSelections,
      { activate: false }
    );
    if (downloadProject) {
      downloadGeoLibreProject(downloadProject);
      trackEvent("GeoLibre", "download_project", tehsilName);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 lg:h-screen lg:overflow-hidden">
      <LandingNavbar />
      <main className="flex min-h-[calc(100vh-5rem)] flex-col lg:h-[calc(100vh-5rem)] lg:min-h-0 lg:flex-row">
        <div className="w-full border-r border-slate-200 lg:h-full lg:w-[430px] lg:shrink-0">
          <GeoLibreLayerPanel
            statesData={statesData}
            state={state}
            district={district}
            tehsil={tehsil}
            setState={setState}
            setDistrict={setDistrict}
            setTehsil={setTehsil}
            handleLocationSelect={handleLocationSelect}
            selectedLayerIds={selectedLayerIds}
            onLayerToggle={handleLayerToggle}
            lulcSelections={lulcSelections}
            onLulcToggle={handleLulcToggle}
            selectedCount={selectedCount}
            project={project}
            hasPendingChanges={hasPendingChanges}
            isPreparing={isPreparing}
            error={error}
            warning={warning}
            onApply={handleApply}
            onDownload={handleDownload}
          />
        </div>
        <div className="min-h-[620px] flex-1 lg:min-h-0">
          <GeoLibreWorkspace
            project={project}
            isPreparing={isPreparing}
            onViewerError={setError}
          />
        </div>
      </main>
    </div>
  );
};

export default LandscapeExplorer;
