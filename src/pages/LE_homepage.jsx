import { useState, useEffect, useRef, useCallback } from "react";
import Map from "../components/landscape-explorer/map/Map.jsx";
import RightSidebar from "../components/landscape-explorer/sidebar/RightSidebar.jsx";
import { useRecoilState } from "recoil";
import {
  stateDataAtom,
  stateAtom,
  districtAtom,
  blockAtom,
  filterSelectionsAtom,
  yearAtom,
} from "../store/locationStore.jsx";
import getStates from "../actions/getStates.js";
import * as downloadHelper from "../components/landscape-explorer/utils/downloadHelper";
import {
  trackPageView,
  trackEvent,
  initializeAnalytics,
} from "../services/analytics";
import LandingNavbar from "../components/landing_navbar.jsx";

const LandscapeExplorer = () => {
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Recoil state
  const [statesData, setStatesData] = useRecoilState(stateDataAtom);
  const [state, setState] = useRecoilState(stateAtom);
  const [district, setDistrict] = useRecoilState(districtAtom);
  const [block, setBlock] = useRecoilState(blockAtom);
  const [filterSelections, setFilterSelections] =
    useRecoilState(filterSelectionsAtom);
  const [lulcYear1, setLulcYear1] = useState(null);
  const [lulcYear2, setLulcYear2] = useState(null);
  const [lulcYear3, setLulcYear3] = useState(null);

  // Map ref for accessing map instance from other components
  const mapRef = useRef(null);

  // Add flag to prevent infinite recursion
  const isUpdatingFromMap = useRef(false);

  // Track which resource category is active
  const [activeResourceCategory, setActiveResourceCategory] = useState(null);

  // Set map ref with callback
  const setMapRef = useCallback((node) => {
    if (node !== null) {
      mapRef.current = node;
    }
  }, []);

  // Layer toggle state - with demographics on by default
  const [toggledLayers, setToggledLayers] = useState({
    // Basic layers
    demographics: true, // Set to true by default
    drainage: false,
    remote_sensed_waterbodies: false,
    hydrological_boundaries: false,
    clart: false,
    mws_layers: false,
    nrega: false,
    drought: false,
    terrain: false,
    administrative_boundaries: false,
    cropping_intensity: false,
    terrain_vector: false,
    terrain_lulc_slope: false,
    terrain_lulc_plain: false,
    afforestation: false,
    deforestation: false,
    degradation: false,
    urbanization: false,
    cropintensity: false,
    soge: false,
    aquifer: false,
  });

  // State for map view settings
  const [showMWS, setShowMWS] = useState(true);
  const [showVillages, setShowVillages] = useState(true);

  // Add plans state
  const [plans, setPlans] = useState([]);

  // Add internal state flag for when layers are ready
  const [layersReady, setLayersReady] = useState(false);

  // Flag to track if we need to enable the fetch button
  const [canFetchLayers, setCanFetchLayers] = useState(block !== null);

  // Handle item selection for dropdowns
  const handleItemSelect = (setter, value) => {
    // Handle the setState case specially if it affects parent component state
    if (setter === setState) {
      // Reset all dependent state values
      if (value) {
        trackEvent("Location", "select_state", value.label);
      }
      setDistrict(null);
      setBlock(null);
      resetAllStates();
      setState(value);
    } else if (setter === setDistrict) {
      // Reset block and filters when district changes
      if (value) {
        trackEvent("Location", "select_district", value.label);
      }
      setBlock(null);
      resetAllStates();
      setDistrict(value);
    } else if (setter === setBlock) {
      resetAllStates();
      setBlock(value);
      // When block is selected, enable fetch button and prepare layers automatically
      setCanFetchLayers(true);
      trackEvent("Location", "select_tehsil", value.label);
      // Auto-prepare layers instead of requiring Fetch Layers button
      setTimeout(() => {
        if (mapRef.current && mapRef.current.prepareLayers) {
          setIsLoading(true);
          mapRef.current.prepareLayers();
          setLayersReady(true);
          setToggledLayers((prev) => ({
            ...prev,
            demographics: true,
          }));
          setIsLoading(false);
        }
      }, 100);
    } else {
      // Standard case for other setters
      setter(value);
    }
  };

  const resetAllStates = () => {
    // Reset filters
    setFilterSelections({
      selectedMWSValues: {},
      selectedVillageValues: {},
    });

    setToggledLayers({
      demographics: true, // Keep demographics on
      drainage: false,
      remote_sensed_waterbodies: false,
      hydrological_boundaries: false,
      clart: false,
      mws_layers: false,
      nrega: false,
      drought: false,
      terrain: false,
      administrative_boundaries: false,
      cropping_intensity: false,
      terrain_vector: false,
      terrain_lulc_slope: false,
      terrain_lulc_plain: false,
      settlement: false,
      water_structure: false,
      well_structure: false,
      agri_structure: false,
      livelihood_structure: false,
      recharge_structure: false,
      afforestation: false,
      deforestation: false,
      degradation: false,
      urbanization: false,
      cropintensity: false,
      soge: false,
      aquifer: false,
    });

    setLayersReady(false);
    setCanFetchLayers(false);
  };

  return (
    <div className="font-sans ">
      <LandingNavbar />
      <div
        className="min-h-screen snap-y snap-mandatory bg-cover bg-center bg-no-repeat pt-8 md:pt-12"
        style={{
          backgroundImage: `url(${landingPageBg})`,
          scrollBehavior: "smooth",
        }}
      >
        {/* Know Section */}
        <section
          className="snap-start backdrop-brightness-90 backdrop-blur-sm bg-white/0 px-4 pt-8 pb-6 md:px-10 md:pt-10 md:pb-10 rounded-xl mx-2 md:mx-6 mb-4 md:mb-6"
          style={{ position: "relative", overflow: "visible", zIndex: 10 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl md:text-4xl mb-4">
                <span className="font-bold text-purple-700">Know</span>{" "}
                <span className="font-normal text-purple-700">
                  your landscape
                </span>
              </h2>

              <ul className="list-disc list-outside ml-5 text-black text-base md:text-lg space-y-3 font-medium text-justify">
                <li>
                  With 20+ geospatial layers, explore your landscape’s
                  diversity, build evidence-based proposals, and plan
                  context-sensitive actions.
                </li>
                <li>
                  Quickly access detailed reports on any micro-watershed in the
                  Tehsil, covering land use, cropping, groundwater, forests, and
                  socio-economic indicators.
                </li>
                <li>
                  Discover unique patterns in different parts of your
                  Tehsil/Block with the help of landscape indicators relevant to
                  the context.
                </li>
              </ul>

              <div className="bg-purple-50 border-l-4 border-purple-500 text-purple-700 p-4 rounded-md mt-8">
                <p className="text-sm">
                  Check out the vision and demo{" "}
                  <a
                    href="https://www.youtube.com/playlist?list=PLZ0pcz8ccRmL3wTPRctaVFomGmgJFmM13"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium hover:text-purple-900"
                  >
                    here →
                  </a>
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0 ">
              {/* First Card */}
              <div
                className="w-full max-w-lg bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-col justify-between relative"
                style={{ overflow: "visible", zIndex: 100 }}
              >
                <p className="mb-0 text-center font-semibold text-xl md:text-2xl text-gray-800 leading-none">
                  Select Location
                </p>

  // Handle GeoJSON download
  const handleGeoJsonLayers = (layerName) => {
    if (!district || !block) {
      alert("Please select a district and block first");
      return;
    }

    console.log(`Downloading GeoJSON for ${layerName}`);

    const districtFormatted = district.label
      .toLowerCase()
      .replace(/\s*\(\s*/g, "_")
      .replace(/\s*\)\s*/g, "")
      .replace(/\s+/g, "_");
    const blockFormatted = block.label
      .toLowerCase()
      .replace(/\s*\(\s*/g, "_")
      .replace(/\s*\)\s*/g, "")
      .replace(/\s+/g, "_");

                <div className="flex flex-col sm:flex-row justify-between gap-2 mt-3">
                  <button
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg w-full sm:w-auto"
                    onClick={() =>
                      handleNavigate("/kyl_dashboard", "Know Your Landscape")
                    }
                  >
                    Know Your Landscape
                  </button>
                  <button
                    className="bg-gray-300 text-black px-4 py-2 rounded-lg w-full sm:w-auto"
                    onClick={() =>
                      handleNavigate("/download_layers", "Download Layers")
                    }
                  >
                    Download Layers
                  </button>
                </div>
              </div>

    switch (layerName) {
      case "demographics":
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/panchayat_boundaries/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=panchayat_boundaries:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
        break;
      case "drainage":
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/drainage/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=drainage:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
        break;
      case "remote_sensed_waterbodies":
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/swb/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=swb:surface_waterbodies_${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
        break;
      case "hydrological_boundaries":
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/mws_layers/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=mws_layers:deltaG_well_depth_${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
        break;
      // Add other cases as needed
      default:
        downloadUrl = `https://geoserver.core-stack.org:8443/geoserver/${layerName}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layerName}:${districtFormatted}_${blockFormatted}&outputFormat=application/json&screen=main`;
    }

        {/* Plan Section */}
        <section className="snap-start backdrop-brightness-90 backdrop-blur-sm bg-white/0 px-4 py-6 md:px-10 md:py-10 rounded-xl mx-2 md:mx-6 my-6">
          <div>
            <div className="w-full lg:w-2/3 mb-10">
              <h2 className="text-3xl md:text-4xl mb-4">
                <span className="font-bold text-purple-700">Plan</span>{" "}
                <span className="font-normal text-purple-700">
                  for a sustainable tomorrow
                </span>
              </h2>

              <ul className="list-disc list-outside ml-5 text-black text-base md:text-lg space-y-3 font-medium text-justify">
                <li>
                  <b>Identification of the right problems</b> is key to
                  sustainable Natural Resource Management (NRM). Commons Connect
                  is a community-focused app enabling landscape stewards to plan
                  NRM works in a participatorily manner.
                </li>
                <li>
                  <b>Assess and raise demands</b>: This tool provides decision
                  support to identify suitable sites for NRM assets and supports
                  community reflection on equity in resource ownership and use.
                </li>
                <li>
                  <b>Develop Detailed Project Reports (DPRs)</b> in an automated
                  manner that can be integrated into the GPDP, MGNREGS, and
                  other processes.
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1 */}
              <a
                href="https://www.youtube.com/watch?v=ln7wpoW7Eg4&list=PLZ0pcz8ccRmIU8wHzHv-CbDOs4JOqgNHC"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:shadow-lg transition duration-200 ease-in-out"
              >
                <div className="flex flex-col items-center text-center cursor-pointer">
                  <div className="w-full max-w-[420px] aspect-square mx-auto rounded overflow-hidden shadow mb-4 relative">
                    <img
                      src={participatoryImg}
                      alt="Participatory Planning"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold mb-2 text-sm">
                      How to do Participatory Planning?
                    </h3>
                    <p className="text-xs text-gray-700 mb-2">
                      View tutorial videos to conduct a rapid PRA and create
                      DPRs using Commons Connect.
                    </p>
                    <span className="text-purple-700 text-sm font-semibold underline">
                      Learn More →
                    </span>
                  </div>
                </div>
              </a>

              {/* Card 2  */}
              <a
                href="https://play.google.com/store/apps/details?id=com.corestack.commonsconnect"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:shadow-lg transition duration-200 ease-in-out"
              >
                <div className="flex flex-col items-center text-center cursor-pointer">
                  <div className="w-full max-w-[420px] aspect-square mx-auto rounded overflow-hidden shadow mb-4 relative">
                    <img
                      src={newLogo}
                      alt="Commons Connect App"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold mb-2 text-sm">
                      Download Commons Connect App
                    </h3>
                    <p className="text-xs text-gray-700 mb-2">
                      An Android app to guide you in a step-by-step manner to
                      record community demands for NRM assets.
                    </p>
                    <span className="text-purple-700 text-sm font-semibold underline">
                      Download Now →
                    </span>
                  </div>
                </div>
              </a>

              {/*  Card 3 */}
              <div onClick={() => navigate("/CCUsagePage")}
                className="cursor-pointer hover:shadow-lg transition duration-200 ease-in-out"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-full max-w-[420px] aspect-square mx-auto rounded overflow-hidden shadow mb-4 relative">
                    <img
                      src={planAndView}
                      alt="View and Support Plans"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold mb-2 text-sm">
                      View and Support Plans
                    </h3>
                    <p className="text-xs text-gray-700 mb-2">
                      Explore existing community plans and find opportunities to
                      support or collaborate with ongoing initiatives.
                    </p>
                    <span className="text-purple-700 text-sm font-semibold underline">
                      Learn More →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Track Section */}
        <section className="snap-start backdrop-brightness-90 backdrop-blur-sm bg-white/0 px-4 py-6 md:px-10 md:py-10 rounded-xl mx-2 md:mx-6 mt-6">
          <div>
            {/* Narrow text container */}
            <div className="w-full lg:w-2/3 mb-10">
              <h2 className="text-2xl md:text-4xl mb-4 text-purple-700">
                <span className="font-bold">Track and Assess </span>
                <span className="font-normal">NRM interventions</span>
              </h2>
              <ul className="list-disc list-outside ml-5 text-black text-base md:text-xl font-medium space-y-5 mb-6 text-justify">
                <li>
                  A suite of dashboards enabling continuous monitoring of
                  Natural Resource Management (NRM) interventions undertaken in
                  an area, and ex-post assessment of their impact.
                </li>
                <li>
                  Use <b>Jaltol</b> to monitor changes in cropping patterns in
                  villages where extensive watershed development programmes have
                  been undertaken.
                </li>
                <li>
                  Agrohorticulture practitioners can assess the health of tree
                  plantations over time using the{" "}
                  <b>Plantation Health Assessment Dashboard</b>.
                </li>
                <li>
                  Track waterbody rejuvenation interventions and their impact on
                  cropping in nearby areas with the{" "}
                  <b>WaterBody Rejuvenation Assessment Dashboard</b>.
                </li>
              </ul>
            </div>

            {/* Full-width cards container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              {[
                {
                  title: "Jaltol App",
                  description:
                    "Monitor changes in cropping patterns and assess the impact of watershed development interventions.",
                  icon: "🌾",
                  link: "https://welllabs.org/jaltol/",
                },
                {
                  title: "Agrohorticulture Plantations",
                  description:
                    "Track the health and growth of plantations across time using satellite-based monitoring.",
                  icon: "🌳",
                  link:"/agrohorticulture"
                },
                {
                  title: "Waterbody Rejuvenation",
                  description:
                    "Visualize waterbody interventions and evaluate their effects on water availability and agriculture.",
                  icon: "💧",
                  link: "/rwb",
                },
                {
                  title: "Commons Connect Plans",
                  description:
                    "Site and landscape level tracking of plans built using Commons Connect",
                  icon: "☀️",
                },
              ].map((item, index) => (
                <div key={index} className="h-full">
                  <div
                    onClick={() => {
                      if (item.link) {
                        handleNavigate(item.link, item.title);
                      }
                    }}
                    className="cursor-pointer bg-white rounded-2xl shadow-md p-6 sm:p-8 h-full min-h-[220px] flex flex-col justify-start transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-yellow-100 text-yellow-500 rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xl sm:text-2xl">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-700 mb-3">
                          {item.description}
                        </p>
                        {item.link ? (
                          <span className="text-purple-700 font-medium text-sm hover:underline">
                            Learn More →
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm italic">
                            Coming soon...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandscapeExplorer;
