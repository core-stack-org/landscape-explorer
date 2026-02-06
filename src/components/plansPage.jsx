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
import getStates from "../actions/getStates";
import getPlans from "../actions/getPlans";
import getVectorLayers from "../actions/getVectorLayers.js";

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

const getPlanMetaStats = async (organizationId = null) => {
  try {
    const url = organizationId
      ? `${process.env.REACT_APP_API_URL}/watershed/plans/meta-stats/?organization=${organizationId}`
      : `${process.env.REACT_APP_API_URL}/watershed/plans/meta-stats/`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "420",
        "X-API-Key" : `${process.env.REACT_APP_API_KEY}`
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

  const [organization, setOrganization] = useState();
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [metaStats, setMetaStats] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isStewardModalOpen, setIsStewardModalOpen] = useState(false);
  const [showBubbleLayer, setShowBubbleLayer] = useState(true);
  const [isStateView, setIsStateView] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [noMapData, setNoMapData] = useState(false);
  const [plans, setPlans] = useRecoilState(plansAtom);
  const [rawStateData, setRawStateData] = useRecoilState(stateDataAtom);
  const [states, setStates] = useRecoilState(stateAtom);
  const [districts, setDistricts] = useRecoilState(districtAtom);
  const [blocks, setBlocks] = useRecoilState(blockAtom);
  const [districtLookup, setDistrictLookup] =    useRecoilState(districtLookupAtom);
  const [blockLookup, setBlockLookup] = useRecoilState(blockLookupAtom);
  const bubbleLayerRef = useRef(null);
  const planLayerRef = useRef(null);
  const organizationRef = useRef(null);
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const [activeState, setActiveState] = useState(null);


  //  Load Meta Stats
  useEffect(() => {
    const loadMeta = async () => {
      const stats = await getPlanMetaStats();
      setMetaStats(stats);
    };
    loadMeta();
  }, []);

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
  
  const addStateBubbles = () => {
    if (!mapRef.current) return;
  
    // remove old bubble layer
    if (bubbleLayerRef.current) {
      mapRef.current.removeLayer(bubbleLayerRef.current);
      bubbleLayerRef.current = null;
    }
      if (
      !metaStats?.state_breakdown ||
      !Array.isArray(metaStats.state_breakdown) ||
      metaStats.state_breakdown.length === 0
    ) {
      console.warn("⚠ No state data available");
      setNoMapData(true);
      return;
    }
  
    setNoMapData(false);
  
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
            text: String(s.total_plans ?? "--"),
            fill: new Fill({ color: "#fff" }),
            font: "bold 14px sans-serif",
          }),
        })
      );
  
      features.push(f);
    });
  
    if (features.length === 0) {
      setNoMapData(true);
      return;
    }
    const layer = new VectorLayer({
      source: new VectorSource({ features }),
    });
    layer.set("layerName", "bubbleLayer");
    bubbleLayerRef.current = layer;
    mapRef.current.addLayer(layer);
  };

  const lowerFirst = (str) => {
    if (!str || typeof str !== "string") return str;
    return str.charAt(0).toLowerCase() + str.slice(1);
  };  
  
  useEffect(() => {
    if (showBubbleLayer) addStateBubbles();
  }, [metaStats, showBubbleLayer]);

  const handleStateBubbleClick = async (feature) => {
    if (!feature) {
      console.warn("handleStateBubbleClick: feature is null");
      return;
    }
      if (!states || !Array.isArray(states) || states.length === 0) {
      console.warn("handleStateBubbleClick: states not loaded yet!");
      return;
    }
  
    const clickedStateName = feature.get("name");
    const stateObj = states.find((s) => s.label === clickedStateName);
  
    if (!stateObj) {
      console.warn("State NOT FOUND in states list:", clickedStateName);
      console.warn("Available states:", states.map((s) => s.label));
      return;
    }
  
    setShowBubbleLayer(false);
    setIsStateView(false);     
    setSelectedPlan(null);
    setTimeout(() => {
      if (bubbleLayerRef.current) {
        mapRef.current.removeLayer(bubbleLayerRef.current);
        bubbleLayerRef.current = null;
      }
    }, 600);
    setActiveState(stateObj);
    await fetchTehsilPlans(stateObj);
    setTimeout(() => setMapLoading(false), 300);
  };
  
  const handleBackToStateView = async() => {
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
  
    const stats = await getPlanMetaStats(
      organizationRef.current?.value || null
    );
    setMetaStats(stats);
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

  const transformName = (name) => {
    if (!name) return "";
  
    // Extract base + alias from parentheses
    const match = name.match(/^(.+?)\s*\((.+?)\)$/);
  
    let parts = [];
  
    if (match) {
      const main = match[1];
      const alias = match[2];
  
      parts = [main, alias];
    } else {
      // no parentheses → repeat twice
      parts = [name];
    }
  
    return parts
      .map((p) =>
        p
          .replace(/[^\w\s-]/g, "") // remove special chars
          .replace(/\s+/g, "_")     // Space
          .replace(/_+/g, "_")      // collapse _
          .replace(/^_|_$/g, "")    // trim _
          .toLowerCase()
      )
      .join("_");
  };

  const getUniqueTehsils = (plans) => {
    const unique = {};   //  simple JS object
  
    plans.forEach((p) => {
      const districtRaw = districtLookup[p.district_soi];
      const tehsilRaw = blockLookup[p.tehsil_soi];
  
      if (!districtRaw || !tehsilRaw) return;
  
      const district = transformName(districtRaw);
      const tehsil = transformName(tehsilRaw);
  
      const key = `${district}_${tehsil}`;
  
      if (!unique[key]) {
        unique[key] = { district, tehsil };
      }
    });
  
    return Object.values(unique);
  };

  const buildMetaStatsFromPlans = (plans) => {
    const uniqueTehsils = new Set();
    const uniqueStewards = new Set();
  
    plans.forEach((p) => {
      if (p.tehsil_soi) uniqueTehsils.add(p.tehsil_soi);
      if (p.facilitator_id) uniqueStewards.add(p.facilitator_id);
    });
  
    return {
      summary: {
        total_plans: plans.length,
        dpr_generated: plans.filter(p => p.is_dpr_generated).length,
        dpr_reviewed: plans.filter(p => p.is_dpr_approved).length,
      },
      commons_connect_operational: {
        active_tehsils: uniqueTehsils.size,
      },
      landscape_stewards: {
        total_stewards: uniqueStewards.size,
      },
    };
  };
  

  const getTehsilIdsFromState = (stateObj) => {
    return stateObj.district
      ?.flatMap((d) => d.blocks || [])
      ?.map((b) => String(b.tehsil_id || b.block_id))
      ?.filter(Boolean);
  };

  const fetchTehsilPlans = async (stateObj) => {
  setMapLoading(true);

  const selectedOrg = organizationRef.current || null;
  const tehsilIds = getTehsilIdsFromState(stateObj);

  if (!tehsilIds.length) {
    console.warn("No tehsils found");
    setMapLoading(false);
    return [];
  }

  //  parallel API calls
  const promises = tehsilIds.map((tehsilId) =>
    getPlans({
      tehsil: tehsilId,
      filter_test_plan: true,
    }).then((res) => res.raw)
  );

  const results = await Promise.all(promises);
  console.log(results)
  let allPlans = results.flat();

  // optional org filter
  if (selectedOrg?.value) {
    allPlans = allPlans.filter(
      (p) => String(p.organization) === String(selectedOrg.value)
    );
  }
console.log(allPlans
  
)
  addPlanDots(allPlans);
  setMetaStats(buildMetaStatsFromPlans(allPlans));
  setMapLoading(false);

  return allPlans;
};

  
  
  

  // const fetchTehsilPlans = async (stateObj) => {
  //   const allBlocks = stateObj.district
  //     ?.flatMap((d) => d.blocks)
  //     ?.map((b) => String(b.block_id));
  //   const selectedOrg = organizationRef.current || null;
  //   console.log(stateObj)
  //   const result = await getPlans(stateObj.state_id );
  //   console.log(result)

  //   let filtered = result.raw.filter((p) =>
  //     allBlocks.includes(String(p.tehsil_soi))
  //   );  
    
  //   if (selectedOrg?.value) {
  //     filtered = filtered.filter(
  //       (p) => String(p.organization) === String(selectedOrg.value)
  //     );
  //   }
    
  //   addPlanDots(filtered);
  //   if (filtered.length > 0) {
  //     const uniqueTehsils = getUniqueTehsils(filtered);
    
  //     uniqueTehsils.forEach(({ district, tehsil }) => {
  //       // loadTehsilBoundary(district, tehsil);
  //     });
  //   }
    
  
  //   return filtered;
  // };

  // const loadTehsilBoundary = async (districtName, tehsilName) => {
  //   const map = mapRef.current;
  //   if (!map) return;
  
  //   const key = `${districtName}_${tehsilName}`;
  
  //   // already loaded → skip
  //   if (tehsilBoundaryRef.current[key]) return;
  
  //   const layer = await getVectorLayers(
  //     "panchayat_boundaries",
  //     key,
  //     true
  //   );
  //   layer.setZIndex(10); 
  //   tehsilBoundaryRef.current[key] = layer;
  //   map.addLayer(layer);
  // };
  
  
  const addPlanDots = (plans) => {
    if (!mapRef.current) return;
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
            text: p.plan || "", 
            font: "bold 12px sans-serif",
            fill: new Fill({ color: "#333" }),
            stroke: new Stroke({ color: "#fff", width: 3 }),
            offsetY: -15, 
          }),
        })
      );
      features.push(f);
    });

    const layer = new VectorLayer({
      source: new VectorSource({ features }),
      zIndex: 50,
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
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <LandingNavbar />
      
      <div className="flex flex-col lg:flex-row gap-6 items-stretch
                p-4 lg:p-6 max-w-[1800px] mx-auto
                min-h-[calc(100vh-120px)]">
      {/* MAP */}
      <div
  className="relative border border-slate-300 rounded-2xl overflow-hidden shadow-2xl
             w-full lg:w-[65%]
             h-[60vh] sm:h-[65vh] lg:h-[80vh]"
>


          <div ref={mapElement} className="w-full h-full" />
          {noMapData && (
            <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
              <span className="text-4xl font-bold text-slate-400">--</span>
            </div>
          )}
          {mapLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[999]">
              <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}

          {/* ZOOM CONTROLS */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {["+", "–"].map((sign) => (
              <button
                key={sign}
                className="bg-white/90 backdrop-blur-sm border border-slate-300 rounded-xl w-11 h-11 text-xl font-semibold
                          cursor-pointer hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200"
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
            {/* BACK BUTTON */}
            {!isStateView && (
              <button
                className="bg-white/90 backdrop-blur-sm border border-slate-300 rounded-xl w-11 h-11 text-lg font-semibold
                          cursor-pointer hover:bg-white hover:shadow-lg active:scale-95 transition-all duration-200 mt-2 flex items-center justify-center"
                onClick={handleBackToStateView}
              >
                ←
              </button>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="flex flex-col gap-6 w-full lg:w-[35%] text-left
                h-full overflow-y-auto">

        {/* ORGANIZATION SELECTOR */}
          <div className="w-full bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-6 shadow-lg">
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-3">
      <label className="text-sm font-semibold text-slate-700">
        Select Organization
      </label>
    </div>

    {/* CLEAR BUTTON */}
    {organization && (
        <button
          onClick={async () => {
            setOrganization(null);
            organizationRef.current = null;
            const stats = await getPlanMetaStats();
            setMetaStats(stats);
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center
                    bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600
                    transition-all duration-200"
          title="Clear organization"
        >
          ✕
        </button>
      )}
     </div>

      <SelectReact
        value={organization}
        onChange={async (selected) => {
          setOrganization(selected);
          organizationRef.current = selected;
          const stats = await getPlanMetaStats(selected?.value);
          setMetaStats(stats);
        }}
        options={organizationOptions}
        placeholder="Choose an organization..."
        styles={{
          control: (base) => ({
            ...base,
            height: "48px",
            borderRadius: "12px",
            borderColor: "#cbd5e1",
            backgroundColor: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }),
        }}
      />
    </div>


          {!selectedPlan && (
            <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
              {/* HEADER */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 pb-8">
                <div className="flex items-center gap-3 mb-2 text-center">
                  <h3 className="text-lg font-bold text-white text-center">
                    Platform Analytics
                  </h3>
                </div>
              </div>

              {/* BIG PRIMARY METRIC */}
              <div className="relative mt-4 mx-6 mb-6">
                <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 
                                rounded-2xl p-6 text-white shadow-xl border border-blue-400/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium opacity-90">Total Plans</p>
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <span className="text-2xl">📋</span>
                    </div>
                  </div>
                  <p className="text-5xl font-bold tracking-tight">
                    {metaStats?.summary?.total_plans ?? 0}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-blue-100 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                    <span>Active monitoring</span>
                  </div>
                </div>
              </div>

              {/* SECONDARY METRICS GRID */}
              <div className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🎯</span>
                      <p className="text-xs font-semibold text-blue-900/70">Active Tehsils</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-700">
                      {metaStats?.commons_connect_operational?.active_tehsils ?? 0}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">📄</span>
                      <p className="text-xs font-semibold text-purple-900/70">DPRs Submitted</p>
                    </div>
                    <p className="text-3xl font-bold text-purple-700">
                      {metaStats?.summary?.dpr_generated ?? 0}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">✅</span>
                      <p className="text-xs font-semibold text-emerald-900/70">DPRs Reviewed</p>
                    </div>
                    <p className="text-3xl font-bold text-emerald-700">
                      {metaStats?.summary?.dpr_reviewed ?? 0}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">👥</span>
                      <p className="text-xs font-semibold text-rose-900/70">Stewards Active</p>
                    </div>
                    <p className="text-3xl font-bold text-rose-700">
                      {metaStats?.landscape_stewards?.total_stewards ?? 0}
                    </p>
                  </div>
                </div>

                {/* ADDITIONAL STATS ROW */}
                {/* <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-800">
                      {metaStats?.state_breakdown?.length ?? 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">States</p>
                  </div>
                </div> */}
              </div>
            </div>
          )}

          {selectedPlan && (
            <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden relative">
              <button
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 text-2xl z-10 
                          w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all"
                onClick={() => setSelectedPlan(null)}
              >
                ×
              </button>

              {/* HEADER */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-2xl">📄</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">Plan Details</h3>
                    <p className="text-blue-100 text-sm">{selectedPlan.plan}</p>
                  </div>
                </div>
              </div>

              {/* CONTENT */}
              <div className="p-6">
                {/* 2-Column Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-600 text-xs mb-1">District</p>
                    <p className="text-slate-900 font-medium">
                      {districtLookup[selectedPlan.district] || selectedPlan.district}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-600 text-xs mb-1">Tehsil</p>
                    <p className="text-slate-900 font-medium">
                      {blockLookup[selectedPlan.block] || selectedPlan.block}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-600 text-xs mb-1">Village</p>
                    <p className="text-slate-900 font-medium">{selectedPlan.village_name || "--"}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 group relative cursor-pointer">
                    <p className="font-semibold text-slate-600 text-xs mb-1">Steward</p>
                    <div className="flex items-center justify-between">
                      <p className="text-slate-900 font-medium">{selectedPlan.facilitator_name || "--"}</p>
                      {selectedPlan.facilitator_name && (
                        <img
                          src={ArrowPlan}
                          alt="arrow icon"
                          className="w-4 h-4 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setIsStewardModalOpen(true)}
                          style={{
                            filter: "brightness(0) saturate(100%) invert(32%) sepia(94%) saturate(2817%) hue-rotate(205deg) brightness(95%) contrast(101%)",
                          }}
                        />
                      )}
                    </div>
                    <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 
                                    bg-slate-900 text-white text-xs px-3 py-1 rounded-md whitespace-nowrap
                                    opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      Click arrow for details
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-600 text-xs mb-1">Organization</p>
                    <p className="text-slate-900 font-medium">{selectedPlan.organization_name || "--"}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-600 text-xs mb-1">Plan Status</p>
                    <p className={`font-semibold ${selectedPlan.is_completed ? "text-green-600" : "text-orange-600"}`}>
                      {selectedPlan.is_completed ? "✓ Completed" : "⏳ In Progress"}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-600 text-xs mb-1">Demands Approved</p>
                    <p className={`font-semibold ${selectedPlan.is_dpr_approved ? "text-green-600" : "text-slate-500"}`}>
                      {selectedPlan.is_dpr_approved ? "✓ Yes" : "○ No"}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 col-span-2">
                    <p className="font-semibold text-slate-600 text-xs mb-1">
                      Commons Connect Operational Since
                    </p>
                    <p className="text-slate-900 font-medium">
                      {selectedPlan.created_at ? new Date(selectedPlan.created_at).toLocaleDateString() : "--"}
                    </p>
                  </div>
                </div>

                {/* ACTION BUTTON */}
                <button 
                  className="w-full px-6 py-3 flex items-center justify-center gap-3 rounded-xl 
                            bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold
                            hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 
                            shadow-lg hover:shadow-xl active:scale-[0.98]"
                  onClick={() => navigate("/plan-view", { state: { plan: selectedPlan } })}
                >
                  <span>View Full Plan</span>
                  <img 
                    src={ArrowPlan} 
                    alt="arrow icon" 
                    className="w-4 h-4"
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STEWARD DETAIL DIALOG */}
      {isStewardModalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[3000]">
          <div className="bg-white w-[1000px] h-[850px] rounded-2xl shadow-2xl p-2 overflow-auto relative">
            {(() => (window.closeStewardModal = () => setIsStewardModalOpen(false)))()}
            <StewardDetailPage plan={selectedPlan} onClose={() => setIsStewardModalOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansPage;