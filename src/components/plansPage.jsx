import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useRecoilState } from "recoil";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import {defaults as defaultControls } from "ol/control";
import View from "ol/View";
import Map from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Fill, Stroke, Text, Circle as CircleStyle } from "ol/style";
import SelectReact from "react-select";
import LandingNavbar from "../components/landing_navbar.jsx";
import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import PinchZoom from "ol/interaction/PinchZoom";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";
import PlanViewDialog from "../components/plan_detailView.jsx";
import ArrowPlan from '../assets/arrow_plan.svg';
import StewardDetailPage from "./steward_detailPage.jsx";



import {
  plansAtom,
  stateDataAtom,
  stateAtom,
  districtAtom,
  blockAtom,
  districtLookupAtom,
  blockLookupAtom,
} from "../store/locationStore";

// APIs
import getStates from "../actions/getStates";
import getPlans from "../actions/getPlans";

const STATE_COORDINATES = {
  Jharkhand: [85.2799, 23.6102],
  Odisha: [85.0985, 20.9517],
  Gujarat: [71.1924, 22.2587],
  "Uttar Pradesh": [80.9462, 26.8467],
  Rajasthan: [74.2179, 27.0238],
  Bihar: [85.3131, 25.0961],
  Maharashtra: [75.7139, 19.7515],
  Chhattisgarh: [81.8661, 21.2787],
  Haryana: [76.0856, 29.0588],
  Karnataka: [75.7139, 15.3173],
  "Madhya Pradesh": [78.6569, 22.9734],
};

//  NEW FUNCTION: Meta Stats API

const getPlanMetaStats = async (organizationId = null) => {
  try {
    const url = organizationId
      ? `https://92c32fb6bade.ngrok-free.app/api/v1/watershed/plans/meta-stats/?organization_id=${organizationId}`
      : `https://92c32fb6bade.ngrok-free.app/api/v1/watershed/plans/meta-stats/`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "420",
        "X-API-KEY": "siOgP9SO.oUCc1vuWQRPkdjXjPmtIZYADe5eGl3FK",
      },
    });

    if (!response.ok) throw new Error("API error");

    return await response.json();
  } catch (err) {
    console.error("Meta stats error:", err);
    return null;
  }
};

const PlansPage = () => {
  const mapElement = useRef(null);
  const mapRef = useRef(null);

  const [organization, setOrganization] = useState();
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [metaStats, setMetaStats] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isStewardModalOpen, setIsStewardModalOpen] = useState(false);
  const [showBubbleLayer, setShowBubbleLayer] = useState(true);
  const [isStateView, setIsStateView] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);

  const [plans, setPlans] = useRecoilState(plansAtom);
  const [rawStateData, setRawStateData] = useRecoilState(stateDataAtom);
  const [states, setStates] = useRecoilState(stateAtom);
  const [districts, setDistricts] = useRecoilState(districtAtom);
  const [blocks, setBlocks] = useRecoilState(blockAtom);
  const [districtLookup, setDistrictLookup] =    useRecoilState(districtLookupAtom);
  const [blockLookup, setBlockLookup] = useRecoilState(blockLookupAtom);
  const bubbleLayerRef = useRef(null);
  const planLayerRef = useRef(null);
  const navigate = useNavigate();

  //  Load Meta Stats
  useEffect(() => {
    const loadMeta = async () => {
      const stats = await getPlanMetaStats();
      setMetaStats(stats);
    };
    loadMeta();
  }, []);

  //  State → Plan Count lookup
  const statePlanCounts = useMemo(() => {
    if (!metaStats?.state_breakdown) return {};
    const lookup = {};
    metaStats.state_breakdown.forEach((s) => {
      lookup[s.state_name] = s.total_plans;
    });
    return lookup;
  }, [metaStats]);

  //  1. Load organizations
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/auth/register/available_organizations/?app_type=watershed`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "420",
          },
        }
      );

      const data = await response.json();
      setOrganizationOptions(
        data.map((org) => ({ value: org.id, label: org.name }))
      );
    } catch (error) {
      console.error("Error loading orgs:", error);
    }
  };

  //  Load PLANS once
  useEffect(() => {
    const loadPlansOnce = async () => {
      if (plans?.length > 0) return;
      const data = await getPlans();
      console.log(data)
      if (data?.raw) setPlans(data.raw);
    };
    loadPlansOnce();
  }, []);

  // Load States, Districts, Blocks
  useEffect(() => {
    const loadLocations = async () => {
      if (  states?.length > 0) return;
      const data = await getStates();
      setRawStateData(data);
      const stateList = data || [];
      setStates(stateList);

      // DISTRICT + BLOCK LOOKUP FLAT  
      const districtLookupTemp = {};
      const blockLookupTemp = [];
  
      const distList = [];
      const blockList = [];
      console.log(stateList)
      stateList.forEach((state) => {
        state?.district?.forEach((d) => {
          // Collect district list
          distList.push(d);
          districtLookupTemp[d.district_id] = d.label;
  
          // Collect block list
          d?.blocks?.forEach((b) => {
            blockList.push(b);
            blockLookupTemp[b.block_id] = b.label;
          });
        });
      });
  
      // Save in recoil
      setDistricts(distList);
      setDistrictLookup(districtLookupTemp);
  
      setBlocks(blockList);
      setBlockLookup(blockLookupTemp);
    };
  
    loadLocations();
  }, []);
  
  //  MAP INIT
  useEffect(() => {
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        maxZoom: 30,
      }),
    });

    const view = new View({
      center: [78.9, 23.6],
      zoom: 6,
      projection: "EPSG:4326",
    });

    const map = new Map({
      target: mapElement.current,
      layers: [baseLayer],
      view,
      controls: defaultControls(),
    });

    mapRef.current = map;
    map.getInteractions().forEach((interaction) => {
      if (
        interaction instanceof MouseWheelZoom ||
        interaction instanceof PinchZoom ||
        interaction instanceof DoubleClickZoom
      ) {
        interaction.setActive(false);
      }
    });
  }, []);

  // ADD BUBBLES TO MAP (state plan counts)
  const addStateBubbles = () => {
    if (!metaStats || !mapRef.current) return;

    // remove existing layer if any
    if (bubbleLayerRef.current) {
      mapRef.current.removeLayer(bubbleLayerRef.current);
      bubbleLayerRef.current = null;
    }

    const features = [];

    const getRadius = (count) => 8 + Math.sqrt(count) * 2.2;

    metaStats.state_breakdown.forEach((s) => {
      const coords = STATE_COORDINATES[s.state_name];
      if (!coords) return;

      const f = new Feature({
        geometry: new Point(coords),
        name: s.state_name,
        plans: s.total_plans,
      });

      f.setStyle(
        new Style({
          image: new CircleStyle({
            radius: getRadius(s.total_plans),
            fill: new Fill({ color: "rgba(0,122,255,0.75)" }),
            stroke: new Stroke({ color: "#fff", width: 2 }),
          }),
          text: new Text({
            text: String(s.total_plans),
            fill: new Fill({ color: "#fff" }),
            font: "bold 14px sans-serif",
          }),
        })
      );

      features.push(f);
    });

    const layer = new VectorLayer({
      source: new VectorSource({ features }),
    });
    layer.set("layerName", "bubbleLayer");

    bubbleLayerRef.current = layer;
    mapRef.current.addLayer(layer);
  };

  // Re-add blue bubbles whenever metaStats loads
  useEffect(() => {
    if (showBubbleLayer) addStateBubbles();
  }, [metaStats, showBubbleLayer]);

  //            WHEN USER CLICKS A BLUE BUBBLE (STATE)
  const handleStateBubbleClick = async (feature) => {
  
    if (!feature) {
      console.warn("⚠ handleStateBubbleClick: feature is null");
      return;
    }
  
    // SAFETY CHECK 1 — states must be loaded
    if (!states || !Array.isArray(states) || states.length === 0) {
      console.warn("⚠ handleStateBubbleClick: states not loaded yet!");
      return;
    }
  
    const clickedStateName = feature.get("name");
  
    // SAFETY CHECK 2 — ensure label matches
    const stateObj = states.find((s) => s.label === clickedStateName);
  
    if (!stateObj) {
      console.warn("⚠ State NOT FOUND in states list:", clickedStateName);
      console.warn("Available states:", states.map((s) => s.label));
      return;
    }
    
    // remove bubble layer
    if (bubbleLayerRef.current) {
      mapRef.current.removeLayer(bubbleLayerRef.current);
      bubbleLayerRef.current = null;
    }
  
    setShowBubbleLayer(false);
      setIsStateView(false);     
    setSelectedPlan(null);
    setMapLoading(false);
    await fetchTehsilPlans(stateObj);
  };
  
  const handleBackToStateView = () => {
    const map = mapRef.current;
    if (!map) return;
  
    // Remove plan layer
    if (planLayerRef.current) {
      map.removeLayer(planLayerRef.current);
      planLayerRef.current = null;
    }
  
    // Re-add blue bubbles
    setShowBubbleLayer(true);
    addStateBubbles();
  
    // Switch view mode
    setIsStateView(true);
    setSelectedPlan(null);
  
    // Reset map view (optional)
    map.getView().animate({
      center: [78.9, 23.6],  // India center
      zoom: 6,
      duration: 600,
    });
  };

  //              FETCH PLANS FOR A STATE → ADD RED DOTS
  const fetchTehsilPlans = async (stateObj) => {
    const allBlocks = stateObj.district
      ?.flatMap((d) => d.blocks)
      ?.map((b) => String(b.block_id));

    const result = await getPlans({ state: stateObj.state_id });

    const filtered = result.raw.filter((p) =>
      allBlocks.includes(String(p.block))
    );

    addPlanDots(filtered);

    return filtered;
  };

  //               ADD RED PLAN DOTS — SEPARATE FUNCTION
  const addPlanDots = (plans) => {
    if (!mapRef.current) return;

    // remove old plan layer
    if (planLayerRef.current) {
      mapRef.current.removeLayer(planLayerRef.current);
      planLayerRef.current = null;
    }

    const features = [];

    plans.forEach((p) => {
      const lat = parseFloat(p.latitude);
      const lon = parseFloat(p.longitude);
      if (!lat || !lon) return;

      const f = new Feature({
        geometry: new Point([lon, lat]),
        plan_details: p,
      });

      f.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 16,
            fill: new Fill({ color: "rgba(255,0,0,0.85)" }),
            stroke: new Stroke({ color: "#fff", width: 2 }),
          }),
          text: new Text({
            text: p.plan || "",  // short label
            font: "bold 12px sans-serif",
            fill: new Fill({ color: "#333" }),
            stroke: new Stroke({ color: "#fff", width: 3 }),
            offsetY: -15, // move text above the dot
          }),
        })
      );

      features.push(f);
    });

    const layer = new VectorLayer({
      source: new VectorSource({ features }),
    });
    layer.set("layerName", "planLayer");

    planLayerRef.current = layer;
    mapRef.current.addLayer(layer);

    // auto zoom to extent
    if (features.length > 0) {
      mapRef.current
        .getView()
        .fit(layer.getSource().getExtent(), {
          padding: [40, 40, 40, 40],
          duration: 500,
        });
    }
  };

  // --- HOVER ANIMATION FOR PLAN DOTS ---
useEffect(() => {
  const map = mapRef.current;
  if (!map) return;

  let lastHovered = null;

  const handlePointerMove = (evt) => {
    if (!planLayerRef.current) return;

    map.getTargetElement().style.cursor = "default";

    let hitFeature = null;

    map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
      if (layer?.get("layerName") === "planLayer") {
        hitFeature = feature;
      }
    });

    if (hitFeature !== lastHovered) {
      // Reset previous hover style
      if (lastHovered) {
        resetDotStyle(lastHovered);
      }

      // Apply new hover style
      if (hitFeature) {
        applyHoverStyle(hitFeature);
        map.getTargetElement().style.cursor = "pointer";
      }

      lastHovered = hitFeature;
    }
  };

  map.on("pointermove", handlePointerMove);

  return () => map.un("pointermove", handlePointerMove);
}, []);

const applyHoverStyle = (feature) => {
  const p = feature.get("plan_details");

  feature.setStyle(
    new Style({
      image: new CircleStyle({
        radius: 20, // bigger dot on hover
        fill: new Fill({ color: "rgba(255,0,0,0.95)" }),
        stroke: new Stroke({ color: "#fff", width: 2 }),
      }),
      text: new Text({
        text: p.plan || "",
        font: "bold 14px sans-serif",
        fill: new Fill({ color: "#111" }),
        stroke: new Stroke({ color: "#fff", width: 4 }),
        offsetY: -20,
      }),
    })
  );
};

const resetDotStyle = (feature) => {
  const p = feature.get("plan_details");

  feature.setStyle(
    new Style({
      image: new CircleStyle({
        radius: 16,
        fill: new Fill({ color: "rgba(255,0,0,0.85)" }),
        stroke: new Stroke({ color: "#fff", width: 2 }),
      }),
      text: new Text({
        text: p.plan || "",
        font: "bold 12px sans-serif",
        fill: new Fill({ color: "#333" }),
        stroke: new Stroke({ color: "#fff", width: 3 }),
        offsetY: -15,
      }),
    })
  );
};

  //                 CLICK HANDLER FOR MAP
  useEffect(() => {
    if (!mapRef.current || !states || states.length === 0) return; 

    const map = mapRef.current;

    const handleClick = (evt) => {
      let found = false;

      map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        const layerName = layer?.get("layerName");

        if (layerName === "planLayer") {
          setSelectedPlan(feature.get("plan_details"));
          found = true;
        }

        if (!found && layerName === "bubbleLayer" && showBubbleLayer) {
          handleStateBubbleClick(feature);
          found = true;
        }
      });
    };

    map.on("click", handleClick);
    return () => map.un("click", handleClick);
  }, [states, showBubbleLayer]);
  
    return (
    <div className="bg-white min-h-screen">
      <LandingNavbar />
      <div className="flex gap-8 items-start p-6">
        {/* MAP */}
        <div  className="relative border border-gray-300 rounded-lg overflow-hidden shadow" style={{ width: "60%", height: "900px" }}>
          <div ref={mapElement} className="w-full h-full" />
          {mapLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[999]">
              <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
)}

          {/* <div className="absolute bottom-4 right-0 w-full max-w-xl px-4">
            <YearSlider currentLayer={[{ name: "lulc_test_layer" }]} />
          </div> */}
                {/* ZOOM CONTROLS */}
      <div className="absolute top-10 right-4 flex flex-col gap-1 z-[1100]">
        {["+", "–"].map((sign) => (
          <button
            key={sign}
            className="bg-white border border-gray-300 rounded-md w-10 h-10 text-xl 
                     cursor-pointer hover:bg-gray-100 active:scale-95 transition"
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              const view = map.getView();
              const delta = sign === "+" ? 1 : -1;

              view.animate({
                zoom: view.getZoom() + delta,
                duration: 300,
              });
            }}
          >
            {sign}
          </button>
        ))}
        {/* BACK BUTTON (visible only when NOT in state bubble view) */}
{!isStateView && (
  <button
    className="bg-white border border-gray-300 rounded-md w-10 h-10 text-lg 
               cursor-pointer hover:bg-gray-100 active:scale-95 transition mt-2 flex items-center justify-center"
    onClick={handleBackToStateView}
  >
    ←
  </button>
)}

      </div>
        </div>
        {/* SIDEBAR */}
        <div className="flex flex-col items-start gap-4 w-[25%] text-left mt-16">
          <label className="font-semibold text-gray-700 text-lg">
            Select Organization
          </label>
          <div className="flex items-center gap-2">
          <SelectReact value={organization} 
                      onChange={async (selected) => { setOrganization(selected);
                      if (!selected) {
                                  setMetaStats(await getPlanMetaStats());
                                  return;
                            }
                      const fullStats = await getPlanMetaStats();
                      // FILTER BY ORG
                      const orgData = fullStats.organization_breakdown.find(
                        (o) => o.organization_id === selected.value
                      );
                      if (!orgData) {
                        console.warn("No stats found for selected organization");
                        return;
                      }
                      // BUILD NEW FILTERED SUMMARY
                      const filteredStats = {
                        ...fullStats,
                        summary: {
                          total_plans: orgData.total_plans,
                          completed_plans: orgData.completed_plans,
                          in_progress_plans: orgData.total_plans - orgData.completed_plans,
                          dpr_generated: orgData.dpr_generated,
                          dpr_reviewed: orgData.dpr_approved,
                        },
                        filters_applied: {
                          organization_id: selected.value,
                        },
                      };

                      setMetaStats(filteredStats);
                    }}
                      options={organizationOptions}
                      placeholder="Select Organization"
                      styles={{
                        control: (base) => ({
                                    ...base,
                                    width: "260px",      
                                    minWidth: "260px",   
                                    maxWidth: "260px",   
                                    height: "48px",
                                    borderRadius: "8px",
                                    borderColor: "#cbd5e1",
                                    boxShadow: "none",
                                    "&:hover": {
                                      borderColor: "#94a3b8",
                                    },
                                  }),
                        menu: (base) => ({
                          ...base,
                          width: "260px",      
                        }),
                }}
            />   
            {organization && (
                <button
                    className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 shadow"
                    onClick={async () => {
                      setOrganization(null);
                        const stats = await getPlanMetaStats(); // reload full data
                        setMetaStats(stats);
                      }}>
                      Clear
                </button>
            )}     
        </div>

 {/* METRICS CARD — hide when a plan is selected */}
{!selectedPlan && (
  <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6 shadow-sm mt-4">
    <h3 className="font-semibold text-gray-800 text-lg mb-4">
      Overview Metrics
    </h3>

    <div className="grid grid-cols-1 gap-4">

      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <span className="text-gray-600 font-medium">Commons Connect Operational In</span>
        <span className="text-blue-600 font-bold text-xl">--</span>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <span className="text-gray-600 font-medium">Total no. of Plans</span>
        <span className="text-blue-600 font-bold text-xl">
          {metaStats?.summary?.total_plans ?? 0}
        </span>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <span className="text-gray-600 font-medium">DPRs Submitted</span>
        <span className="text-purple-600 font-bold text-xl">
          {metaStats?.summary?.dpr_generated ?? 0}
        </span>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <span className="text-gray-600 font-medium">Demands Approved</span>
        <span className="text-green-600 font-bold text-xl">
          {metaStats?.summary?.dpr_reviewed ?? 0}
        </span>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <span className="text-gray-600 font-medium">Landscape Stewards Working</span>
        <span className="text-rose-600 font-bold text-xl">--</span>
      </div>

    </div>
  </div>
)}


{selectedPlan && (
  <div
    className="w-[620px] bg-white border border-gray-200 rounded-2xl p-6 shadow-lg mt-6 relative"
  >
    {/* ❌ Close Button */}
    <button
      className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
      onClick={() => setSelectedPlan(null)}
    >
      ×
    </button>

    <h3 className="font-bold text-gray-800 text-xl mb-5 flex items-center gap-2">
      <span className="text-blue-600">📄</span> Plan Details
    </h3>

    {/* 2-Column Grid */}
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <p className="font-semibold text-gray-700">Plan Name</p>
        <p className="text-gray-900">{selectedPlan.plan}</p>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <p className="font-semibold text-gray-700">District</p>
        <p className="text-gray-900">
          {districtLookup[selectedPlan.district] || selectedPlan.district}
        </p>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <p className="font-semibold text-gray-700">Block</p>
        <p className="text-gray-900">
          {blockLookup[selectedPlan.block] || selectedPlan.block}
        </p>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <p className="font-semibold text-gray-700">Village</p>
        <p className="text-gray-900">{selectedPlan.village_name || "--"}</p>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 group relative cursor-pointer">
        <p className="font-semibold text-gray-700">Steward</p>
        <div className="flex items-center justify-between mt-1">
          {/* LEFT: Name */}
          <p className="text-gray-900">{selectedPlan.facilitator_name || "--"}</p>
            {/* RIGHT: Arrow */}
            {selectedPlan.facilitator_name && (
              <img
                src={ArrowPlan}
                alt="arrow icon"
                className="w-4 h-4 cursor-pointer hover:opacity-80"
                onClick={() => setIsStewardModalOpen(true)}
                style={{
                  filter:
                    "brightness(0) saturate(100%) invert(32%) sepia(94%) saturate(2817%) hue-rotate(205deg) brightness(95%) contrast(101%)",
                }}
              />
            )}
        </div>

  {/* Tooltip */}
  <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 
                  bg-black text-white text-xs px-3 py-1 rounded-md
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
    Click the arrow to view steward details
  </div>
      </div>




      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <p className="font-semibold text-gray-700">Organization</p>
        <p className="text-gray-900">{selectedPlan.organization_name || "--"}</p>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <p className="font-semibold text-gray-700">Plan Status</p>
        <p
          className={`font-medium ${
            selectedPlan.is_completed ? "text-green-600" : "text-orange-600"
          }`}
        >
          {selectedPlan.is_completed ? "Completed" : "In Progress"}
        </p>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <p className="font-semibold text-gray-700">Demands Approved</p>
        <p className="text-gray-900">
          {selectedPlan.is_dpr_approved ? "Yes" : "No"}
        </p>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 col-span-2">
        <p className="font-semibold text-gray-700">
          Commons Connect Operational Since
        </p>
        <p className="text-gray-900">
          {selectedPlan.created_at
            ? new Date(selectedPlan.created_at).toLocaleDateString()
            : "--"}
        </p>
      </div>
    </div>

    {/* Button */}
    <div className="flex items-center gap-3 mt-6 justify-center">
      <button className="px-4 py-2 flex items-center gap-2 rounded-lg text-blue-600 text-sm hover:bg-blue-200"
onClick={() => navigate("/plan-view", { state: { plan: selectedPlan } })}
>
        <span>View Plan Page</span>
        <img src={ArrowPlan} alt="arrow icon" className="w-4 h-4"     style={{ filter: "brightness(0) saturate(100%) invert(32%) sepia(94%) saturate(2817%) hue-rotate(205deg) brightness(95%) contrast(101%)" }}
 />
      </button>

    </div>
  </div>
)}

      </div>
</div>

  {/* <PlanViewDialog
  open={isPlanModalOpen}
  onClose={() => setIsPlanModalOpen(false)}
  plan={selectedPlan}/> */}

  {/* STEWARD DETAIL DIALOG */}
    {isStewardModalOpen && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[3000]">
        <div className="bg-white w-[1000px] h-[850px] rounded-xl shadow-xl p-2 overflow-auto relative">
          {(() => (window.closeStewardModal = () => setIsStewardModalOpen(false)))()}
          <StewardDetailPage />
        </div>
      </div>
    )}


</div>


  );
};

export default PlansPage;