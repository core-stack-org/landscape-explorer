import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { defaults as defaultControls } from "ol/control";
import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import PinchZoom from "ol/interaction/PinchZoom";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Icon, Circle as CircleStyle, Fill, Stroke, Text } from "ol/style";
import LandingNavbar from "../components/landing_navbar.jsx";
import FilterListIcon from "@mui/icons-material/FilterList";
import SelectReact from "react-select";

const P = {
  base:    "oklch(49.6% 0.265 301.924)",
  light:   "oklch(94%  0.06  301.924)",
  lighter: "oklch(97%  0.03  301.924)",
  dark:    "oklch(35%  0.265 301.924)",
  text:    "oklch(28%  0.18  301.924)",
  border:  "oklch(88%  0.08  301.924)",
  muted:   "oklch(62%  0.14  301.924)",
};

const PIN_COLOR   = "rgba(139, 63, 230, 1)";
const CHIP_BG     = "rgba(139, 63, 230, 0.92)";
const CHIP_STROKE = "rgba(255, 255, 255, 0.9)";

const transformName = (name) => {
    if (!name) return name;
    return name
      .replace(/[().]/g, "")        // Remove parentheses and dots
      .replace(/[-\s]+/g, "_")      // Replace dashes and spaces with "_"
      .replace(/_+/g, "_")          // Collapse multiple underscores
      .replace(/^_|_$/g, "")        // Remove leading/trailing underscores
      .toLowerCase();
};

// ── API HELPERS ───────────────────────────────────────────────────────────────

const fetchMetaStats = async (organizationId = null, stateId = null) => {
  let url = `${process.env.REACT_APP_API_URL}/watershed/plans/meta-stats/`;
  const params = new URLSearchParams();
  if (organizationId) params.append("organization", organizationId);
  if (stateId)        params.append("state", stateId);
  if (params.toString()) url += `?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "420",
      "X-API-Key": process.env.REACT_APP_API_KEY,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
};

const fetchOrganizations = async () => {
  const res = await fetch(
    `${process.env.REACT_APP_API_URL}/auth/register/available_organizations/?app_type=watershed`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "420",
      },
    }
  );
  if (!res.ok) throw new Error(`Org fetch error ${res.status}`);
  const data = await res.json();
  return data.map((org) => ({ value: org.id, label: org.name }));
};

// NEW: fetch plans by state (with optional org filter)
const fetchPlansByState = async (stateId, organizationId = null) => {
  let url = `${process.env.REACT_APP_API_URL}/watershed/plans/?state=${stateId}`;
  if (organizationId) url += `&organization=${encodeURIComponent(organizationId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "420",
      "X-API-Key": process.env.REACT_APP_API_KEY,
    },
  });
  if (!res.ok) throw new Error(`Plans fetch error ${res.status}`);
  return res.json();
};

// ── PIN STYLE ─────────────────────────────────────────────────────────────────

const createPinStyle = (stateName, count) => {
  const label      = `${stateName}  ·  ${count.toLocaleString()}`;
  const fontSize   = 11;
  const font       = `bold ${fontSize}px sans-serif`;
  const paddingX   = 10;
  const paddingY   = 5;
  const pinRadius  = 5;
  const pinHeight  = 10;

  const offscreen = document.createElement("canvas");
  const octx = offscreen.getContext("2d");
  octx.font = font;
  const textWidth  = octx.measureText(label).width;
  const chipWidth  = textWidth + paddingX * 2;
  const chipHeight = fontSize + paddingY * 2;
  const chipRadius = chipHeight / 2;
  const canvasW    = chipWidth + 4;
  const canvasH    = chipHeight + pinHeight + pinRadius * 2 + 4;

  const canvas = document.createElement("canvas");
  canvas.width  = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");

  const chipX = 2, chipY = 2;

  ctx.beginPath();
  ctx.moveTo(chipX + chipRadius, chipY);
  ctx.lineTo(chipX + chipWidth - chipRadius, chipY);
  ctx.arcTo(chipX + chipWidth, chipY, chipX + chipWidth, chipY + chipHeight, chipRadius);
  ctx.lineTo(chipX + chipWidth, chipY + chipHeight);
  ctx.arcTo(chipX + chipWidth, chipY + chipHeight, chipX + chipWidth - chipRadius, chipY + chipHeight, chipRadius);
  ctx.lineTo(chipX + chipRadius, chipY + chipHeight);
  ctx.arcTo(chipX, chipY + chipHeight, chipX, chipY, chipRadius);
  ctx.lineTo(chipX, chipY + chipRadius);
  ctx.arcTo(chipX, chipY, chipX + chipRadius, chipY, chipRadius);
  ctx.closePath();
  ctx.fillStyle   = CHIP_BG;
  ctx.fill();
  ctx.strokeStyle = CHIP_STROKE;
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  ctx.fillStyle    = "#ffffff";
  ctx.font         = font;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, canvasW / 2, chipY + chipHeight / 2);

  const stemX = canvasW / 2, stemY1 = chipY + chipHeight, stemY2 = stemY1 + pinHeight;
  ctx.beginPath();
  ctx.moveTo(stemX, stemY1);
  ctx.lineTo(stemX, stemY2);
  ctx.strokeStyle = PIN_COLOR;
  ctx.lineWidth   = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(stemX, stemY2 + pinRadius, pinRadius, 0, Math.PI * 2);
  ctx.fillStyle   = PIN_COLOR;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  return new Style({
    image: new Icon({
      img: canvas, width: canvasW, height: canvasH,
      anchor: [0.5, 1], anchorXUnits: "fraction", anchorYUnits: "fraction",
    }),
  });
};

// NEW: dot style for individual plan features
const DOT_DEFAULT  = () => new Style({
  image: new CircleStyle({
    radius: 8,
    fill:   new Fill({ color: "rgba(139, 63, 230, 0.85)" }),
    stroke: new Stroke({ color: "#ffffff", width: 2 }),
  }),
});

const DOT_HOVERED  = () => new Style({
  image: new CircleStyle({
    radius: 11,
    fill:   new Fill({ color: "rgba(139, 63, 230, 1)" }),
    stroke: new Stroke({ color: "#ffffff", width: 2.5 }),
  }),
});

const DOT_SELECTED = () => new Style({
  image: new CircleStyle({
    radius: 11,
    fill:   new Fill({ color: "rgba(255, 255, 255, 1)" }),
    stroke: new Stroke({ color: "rgba(139, 63, 230, 1)", width: 3 }),
  }),
});

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────

const StatCard = ({ label, value }) => (
  <div className="text-center rounded-xl p-3"
    style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
    <p className="text-2xl font-bold" style={{ color: P.base }}>{value ?? "--"}</p>
    <p className="text-xs font-medium mt-1" style={{ color: P.muted }}>{label}</p>
  </div>
);

const SidebarSkeleton = () => (
  <div className="flex flex-col gap-4 animate-pulse">
    <div className="h-10 rounded-xl"  style={{ background: P.light }} />
    <div className="h-36 rounded-2xl" style={{ background: P.light }} />
    <div className="h-28 rounded-2xl" style={{ background: P.light }} />
    <div className="h-28 rounded-2xl" style={{ background: P.light }} />
    <div className="h-20 rounded-2xl" style={{ background: P.light }} />
  </div>
);

const selectStyles = {
  control: (base) => ({
    ...base,
    minHeight: "42px",
    borderRadius: "12px",
    border: "1px solid rgba(220, 200, 240, 0.8)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
    paddingLeft: "32px",
    backgroundColor: "rgba(255,255,255,0.97)",
    backdropFilter: "blur(6px)",
    cursor: "pointer",
  }),
  placeholder: (base) => ({ ...base, color: "oklch(62% 0.14 301.924)", fontSize: "14px" }),
  singleValue:  (base) => ({ ...base, color: "oklch(28% 0.18 301.924)", fontSize: "14px" }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? "oklch(49.6% 0.265 301.924)" : state.isFocused ? "oklch(94% 0.06 301.924)" : "white",
    color: state.isSelected ? "#fff" : "oklch(28% 0.18 301.924)",
    fontSize: "14px",
    cursor: "pointer",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, color: "oklch(62% 0.14 301.924)", paddingRight: "8px" }),
  menu: (base) => ({ ...base, borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }),
};

// ── PAGE ──────────────────────────────────────────────────────────────────────

const PlansPage = () => {
    const navigate       = useNavigate();
    const location       = useLocation();
    const mapElement     = useRef(null);
    const mapRef         = useRef(null);
    const bubbleLayerRef = useRef(null);
    const planLayerRef   = useRef(null);   
    const orgRef         = useRef(null);
    const hoveredFeatureRef  = useRef(null);
    const selectedFeatureRef = useRef(null);
    const districtLookupRef = useRef({});
    const tehsilLookupRef   = useRef({});  
    const currentStateRef = useRef(null);

    const [viewMode,            setViewMode]            = useState("plans");
    const [metaStats,           setMetaStats]           = useState(null);
    const [statsLoading,        setStatsLoading]        = useState(true);
    const [statsError,          setStatsError]          = useState(false);
    const [organization,        setOrganization]        = useState(null);
    const [organizationOptions, setOrganizationOptions] = useState([]);
    const [isStateView,         setIsStateView]         = useState(true);  
    const [mapLoading,          setMapLoading]          = useState(false); 
    const [selectedPlan,        setSelectedPlan]        = useState(null);

    // ── MAP INIT ────────────────────────────────────────────────
    useEffect(() => {
        const map = new Map({
        target: mapElement.current,
        layers: [
            new TileLayer({
            source: new XYZ({
                url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
                maxZoom: 30,
            }),
            }),
        ],
        view: new View({ center: [78.9, 23.6], zoom: 5, projection: "EPSG:4326" }),
        controls: defaultControls({ zoom: false }),
        });

        map.getInteractions().forEach((i) => {
        if (i instanceof MouseWheelZoom || i instanceof PinchZoom || i instanceof DoubleClickZoom)
            i.setActive(false);
        });

        mapRef.current = map;
        return () => map.setTarget(null);
    }, []);

    // ── ORGS ────────────────────────────────────────────────────
    useEffect(() => {
        fetchOrganizations()
        .then(setOrganizationOptions)
        .catch((err) => console.error("Failed to load orgs:", err));
    }, []);

    const fetchProposedBlocks = async () => {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/proposed_blocks/`, {
            method: "GET",
            headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "420",
            },
        });
        if (!res.ok) throw new Error(`Blocks fetch error ${res.status}`);
        return res.json();
    };

    useEffect(() => {
        fetchProposedBlocks()
            .then((states) => {
            const districtMap = {};
            const tehsilMap   = {};

            states.forEach((state) => {
                state.district?.forEach((d) => {
                districtMap[d.district_id] = d.label;
                d.blocks?.forEach((b) => {
                    tehsilMap[b.block_id] = b.label;
                });
                });
            });

            districtLookupRef.current = districtMap;
            tehsilLookupRef.current   = tehsilMap;
            })
            .catch((err) => console.error("Failed to load proposed blocks:", err));
    }, []);

    useEffect(() => {
      const ctx = location.state?.returnContext;
      if (!ctx?.stateId) return;

      // Wait for map and metaStats to be ready before restoring
      const tryRestore = setInterval(() => {
        if (mapRef.current && metaStats) {
          clearInterval(tryRestore);
          handleStatePinClick({
            state_id:   ctx.stateId,
            state_name: ctx.stateName,
          });
        }
      }, 100);

      return () => clearInterval(tryRestore);
    }, [metaStats]);

    // ── STATS ───────────────────────────────────────────────────
    const loadStats = async (orgId = null) => {
        setStatsLoading(true);
        setStatsError(false);
        try {
        const data = await fetchMetaStats(orgId);
        setMetaStats(data);
        } catch (err) {
        console.error("Failed to fetch meta stats:", err);
        setStatsError(true);
        } finally {
        setStatsLoading(false);
        }
    };

    useEffect(() => { loadStats(); }, []);

    // ── PIN LAYER ───────────────────────────────────────────────
    const addStateBubbles = (statsData) => {
        const map = mapRef.current;
        if (!map) return;

        if (bubbleLayerRef.current) {
        map.removeLayer(bubbleLayerRef.current);
        bubbleLayerRef.current = null;
        }

        const stateBreakdown = statsData?.state_breakdown ?? [];
        if (!stateBreakdown.length) return;

        const features = stateBreakdown
        .filter((s) => s.centroid?.lat && s.centroid?.lon)
        .map((s) => {
            const f = new Feature({
            geometry:  new Point([s.centroid.lon, s.centroid.lat]),
            stateData: s,
            });
            f.setStyle(createPinStyle(s.state_name, s.total_plans));
            return f;
        });

        const layer = new VectorLayer({ source: new VectorSource({ features }), zIndex: 10 });
        layer.set("layerName", "bubbleLayer");
        bubbleLayerRef.current = layer;
        map.addLayer(layer);
    };

    useEffect(() => {
        if (metaStats && isStateView) addStateBubbles(metaStats);
    }, [metaStats, isStateView]);

    // ── PLAN DOTS ───────────────────────────────────────────────
    const addPlanDots = (plans) => {
        const map = mapRef.current;
        if (!map) return;

        if (planLayerRef.current) {
        map.removeLayer(planLayerRef.current);
        planLayerRef.current = null;
        }

        const features = plans
        .filter((p) => p.latitude && p.longitude)
        .map((p) => {
            const f = new Feature({
            geometry:    new Point([parseFloat(p.longitude), parseFloat(p.latitude)]),
            planDetails: p,
            });
            f.setStyle(DOT_DEFAULT());
            return f;
        });

        if (!features.length) return;

        const layer = new VectorLayer({
        source: new VectorSource({ features }),
        zIndex: 20,
        });
        layer.set("layerName", "planLayer");
        planLayerRef.current = layer;
        map.addLayer(layer);

        // Zoom to fit all dots
        map.getView().fit(layer.getSource().getExtent(), {
        padding:  [60, 60, 60, 60],
        duration: 600,
        });
    };

    // ── STATE CLICK → DRILL DOWN ────────────────────────────────
    const handleStatePinClick = async (stateData) => {
      currentStateRef.current = stateData;
        setMapLoading(true);
        // Remove pin layer immediately
        if (bubbleLayerRef.current) {
            mapRef.current.removeLayer(bubbleLayerRef.current);
            bubbleLayerRef.current = null;
        }
        try {
            // Fetch plans + state-filtered stats in parallel
            const [plans, stateStats] = await Promise.all([
            fetchPlansByState(stateData.state_id, orgRef.current?.value ?? null),
            fetchMetaStats(orgRef.current?.value ?? null, stateData.state_id),
            ]);
            addPlanDots(plans);
            setMetaStats(stateStats);   // sidebar now reflects this state
            setIsStateView(false);
        } catch (err) {
            console.error("Failed to fetch state data:", err);
            addStateBubbles(metaStats); // restore pins on failure
        } finally {
            setMapLoading(false);
        }
    };

    // ── BACK TO STATE VIEW ──────────────────────────────────────
    const handleBackToStateView = async () => {
      currentStateRef.current = null;
        const map = mapRef.current;
        if (!map) return;
        
        // Reset dot selection refs
        if (selectedFeatureRef.current) selectedFeatureRef.current = null;
        hoveredFeatureRef.current = null;
        setSelectedPlan(null);


        if (planLayerRef.current) {
            map.removeLayer(planLayerRef.current);
            planLayerRef.current = null;
        }

        // Restore global stats
        setStatsLoading(true);
        try {
            const globalStats = await fetchMetaStats(orgRef.current?.value ?? null);
            setMetaStats(globalStats);
        } catch (err) {
            console.error("Failed to restore global stats:", err);
        } finally {
            setStatsLoading(false);
        }

        addStateBubbles(metaStats);
        setSelectedPlan(null);
        setIsStateView(true);
        map.getView().animate({ center: [78.9, 23.6], zoom: 5, duration: 600 });
    };

    // ── MAP CLICK HANDLER ───────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const handleClick = (evt) => {
            map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
            const layerName = layer?.get("layerName");

            if (layerName === "planLayer") {
                // Reset previously selected dot
                if (selectedFeatureRef.current && selectedFeatureRef.current !== feature) {
                selectedFeatureRef.current.setStyle(DOT_DEFAULT());
                }
                // Apply selected style
                feature.setStyle(DOT_SELECTED());
                selectedFeatureRef.current = feature;

                setSelectedPlan(feature.get("planDetails"));
                return true;
            }

            if (layerName === "bubbleLayer") {
                const stateData = feature.get("stateData");
                if (stateData) handleStatePinClick(stateData);
                return true;
            }
            });
        };

        const handlePointerMove = (evt) => {
            let hitFeature  = null;
            let hitLayer    = null;

            map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
                hitFeature = feature;
                hitLayer   = layer;
                return true;
            });

            const layerName = hitLayer?.get("layerName");

            // Reset previous hover (only if it's not the selected feature)
            if (
            hoveredFeatureRef.current &&
            hoveredFeatureRef.current !== hitFeature &&
            hoveredFeatureRef.current !== selectedFeatureRef.current
            ) {
                hoveredFeatureRef.current.setStyle(DOT_DEFAULT());
                hoveredFeatureRef.current = null;
            }

            if (hitFeature && layerName === "planLayer" && hitFeature !== selectedFeatureRef.current) {
            hitFeature.setStyle(DOT_HOVERED());
            hoveredFeatureRef.current = hitFeature;
                map.getTargetElement().style.cursor = "pointer";
            } else if (hitFeature && layerName === "bubbleLayer") {
                map.getTargetElement().style.cursor = "pointer";
            } else if (!hitFeature) {
                map.getTargetElement().style.cursor = "default";
            }
        };

        map.on("click",       handleClick);
        map.on("pointermove", handlePointerMove);
        return () => {
            map.un("click",       handleClick);
            map.un("pointermove", handlePointerMove);
        };
    }, [metaStats]);

    // ── ORG CHANGE ──────────────────────────────────────────────
    const handleOrgChange = (selected) => {
        setOrganization(selected);
        orgRef.current = selected;
        loadStats(selected?.value ?? null);
    };

    // ── ZOOM ────────────────────────────────────────────────────
    const handleZoom = (delta) => {
        const view = mapRef.current?.getView();
        if (!view) return;
        view.animate({ zoom: view.getZoom() + delta, duration: 300 });
    };
  

  const summary  = metaStats?.summary                     ?? {};
  const commons  = metaStats?.commons_connect_operational  ?? {};
  const stewards = metaStats?.landscape_stewards           ?? {};

  return (
    <div className="min-h-screen" style={{ background: P.lighter }}>
      <LandingNavbar />

      <div className="bg-white rounded-2xl border shadow-xl m-6" style={{ borderColor: P.border }}>

        {/* PAGE HEADER */}
        <div className="max-w-[1800px] mx-auto px-6 pt-6 pb-4">
          <h1 className="text-2xl lg:text-4xl font-semibold text-center" style={{ color: P.text }}>
            Landscape Stewardship Network
          </h1>
          <p className="text-xl mt-1 text-center" style={{ color: P.muted }}>
            Commoning for Resilience and Equality
          </p>
          <p className="text-sm mt-2 text-slate-500">
            Landscape stewards from across 1000+ villages are building natural
            resource management plans from the ground-up in consultation with
            their communities. This dashboard shows the network coverage, and
            (coming soon) the sustainability potential and impact. Discover
            partner organizations and the on-ground work of landscape stewards
            in creating detailed project reports for their villages.
          </p>
          <p className="text-sm mt-2">
            <span className="text-slate-500">Drop an email to</span>{" "}
            <a href="mailto:contact@core-stack.org"
              className="hover:underline underline-offset-4" style={{ color: P.base }}>
              contact@core-stack.org
            </a>{" "}
            <span className="text-slate-500">for any further details.</span>
          </p>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-[1800px] mx-auto h-[calc(100vh-220px)]">

          {/* MAP */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full lg:w-[65%] h-[50vh] lg:h-full"
            style={{ border: `1px solid ${P.border}` }}>
            <div ref={mapElement} className="w-full h-full" />

            {/* MAP LOADING OVERLAY */}
            {mapLoading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[999]">
                <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: `${P.base} transparent transparent transparent` }} />
              </div>
            )}

            {/* BACK BUTTON */}
            {!isStateView && (
              <button
                onClick={handleBackToStateView}
                className="absolute top-4 left-4 z-[1000] flex items-center gap-2 px-3 py-2 rounded-xl
                           bg-white/95 backdrop-blur-sm text-sm font-semibold shadow-lg
                           hover:shadow-xl active:scale-95 transition-all duration-200"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                ← Back
              </button>
            )}

            {/* ORGANIZATION DROPDOWN */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-80">
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10"
                  style={{ color: P.muted }}>
                  <FilterListIcon style={{ fontSize: 18 }} />
                </div>
                <SelectReact
                  value={organization}
                  onChange={handleOrgChange}
                  options={organizationOptions}
                  isClearable
                  placeholder="Filter by organization"
                  styles={selectStyles}
                />
              </div>
            </div>

            {/* ZOOM CONTROLS */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
              {["+", "–"].map((sign) => (
                <button key={sign} onClick={() => handleZoom(sign === "+" ? 1 : -1)}
                  className="bg-white/90 backdrop-blur-sm rounded-xl w-11 h-11 text-xl font-semibold
                             flex items-center justify-center hover:bg-white hover:shadow-lg
                             active:scale-95 transition-all duration-200"
                  style={{ border: `1px solid ${P.border}`, color: P.text }}>
                  {sign}
                </button>
              ))}
            </div>
          </div>

          {/* SIDEBAR */}
            <div className="w-full lg:w-[35%] h-[50vh] lg:h-full overflow-y-auto flex flex-col gap-4 pr-1">
            {statsLoading ? <SidebarSkeleton /> : statsError ? (
                <div className="flex-1 flex items-center justify-center rounded-2xl"
                style={{ border: `1px solid ${P.border}` }}>
                <p className="text-sm" style={{ color: P.muted }}>Failed to load stats. Please refresh.</p>
                </div>
            ) : selectedPlan ? (
                // ── PLAN DETAIL PANEL ──
                <div className="flex flex-col gap-4">

                {/* HEADER */}
                <div className="rounded-2xl p-5 text-white shadow-lg relative"
                    style={{ background: `linear-gradient(135deg, ${P.base}, ${P.dark})` }}>
                    <button
                        onClick={() => {
                            if (selectedFeatureRef.current) {
                            selectedFeatureRef.current.setStyle(DOT_DEFAULT());
                            selectedFeatureRef.current = null;
                            }
                            setSelectedPlan(null);
                        }}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center
                                    transition-all hover:bg-white/20"
                        style={{ color: "white" }}
                    >
                        ✕
                    </button>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                    style={{ color: "oklch(90% 0.08 301.924)" }}>
                        Plan Details
                    </p>
                    <p className="text-2xl font-bold tracking-tight pr-8">{selectedPlan.plan}</p>
                    <p className="text-sm mt-1" style={{ color: "oklch(85% 0.08 301.924)" }}>
                        {selectedPlan.village_name || "--"}
                    </p>
                </div>

                {/* DETAIL GRID */}
                <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${P.border}` }}>
                    <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: "Organization", value: selectedPlan.organization_name },
                        { label: "Project",      value: selectedPlan.project_name      },
                        { label: "Facilitator",  value: selectedPlan.facilitator_name  },
                        { label: "Gram Panchayat", value: selectedPlan.gram_panchayat  },
                    ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl p-3"
                        style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
                        <p className="text-xs font-medium mb-1" style={{ color: P.muted }}>{label}</p>
                        <p className="text-sm font-semibold" style={{ color: P.text }}>{value || "--"}</p>
                        </div>
                    ))}
                    </div>
                </div>

                {/* STATUS BADGES */}
                <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${P.border}` }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: P.muted }}>
                    Status
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: "Plan",         active: selectedPlan.is_completed    },
                        { label: "DPR Generated", active: selectedPlan.is_dpr_generated },
                        { label: "DPR Reviewed",  active: selectedPlan.is_dpr_reviewed  },
                        { label: "DPR Approved",  active: selectedPlan.is_dpr_approved  },
                    ].map(({ label, active }) => (
                        <div key={label} className="rounded-xl p-3 flex items-center gap-2"
                        style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
                        <span className="text-base">{active ? "✅" : "⏳"}</span>
                        <div>
                            <p className="text-xs font-medium" style={{ color: P.muted }}>{label}</p>
                            <p className="text-xs font-semibold"
                            style={{ color: active ? "oklch(50% 0.18 145)" : P.muted }}>
                            {active ? "Done" : "Pending"}
                            </p>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>

                {/* DATES */}
                <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${P.border}` }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: P.muted }}>
                    Timeline
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: "Created",      value: selectedPlan.created_at },
                        { label: "Last Updated", value: selectedPlan.updated_at },
                    ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl p-3"
                        style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
                        <p className="text-xs font-medium mb-1" style={{ color: P.muted }}>{label}</p>
                        <p className="text-sm font-semibold" style={{ color: P.text }}>
                            {value ? new Date(value).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric"
                            }) : "--"}
                        </p>
                        </div>
                    ))}
                    </div>
                </div>

                {/* VIEW FULL PLAN */}
                <button
                    onClick={() => {
                        const districtLabel = transformName(districtLookupRef.current[selectedPlan.district_soi] || "");
                        const tehsilLabel   = transformName(tehsilLookupRef.current[selectedPlan.tehsil_soi]     || "");

                        navigate("/CCUsagePage/plan-view", {
                          state: {
                            plan: {
                              ...selectedPlan,
                              district: districtLabel,
                              block:    tehsilLabel,
                            },
                            returnContext: {
                              stateId:   currentStateRef.current?.state_id   ?? null,
                              stateName: currentStateRef.current?.state_name ?? null,
                            },
                          },
                        });
                    }}
                    className="w-full py-3 rounded-2xl text-white font-semibold text-sm flex-shrink-0
                                shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200"
                    style={{ background: `linear-gradient(135deg, ${P.base}, ${P.dark})` }}
                >
                View Full Plan →
                </button>

                </div>
            ) : (
                // ── STATS PANEL (unchanged) ──
                <>
                {/* VIEW MODE TOGGLE */}
                <div className="rounded-xl p-1 flex" style={{ background: P.light }}>
                    {["plans", "stewards"].map((mode) => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                        className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
                        style={viewMode === mode
                        ? { background: P.base, color: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }
                        : { color: P.muted }}>
                        {mode === "plans" ? "Plans" : "Stewards"}
                    </button>
                    ))}
                </div>

                {/* TOTAL PLANS BANNER */}
                <div className="rounded-2xl p-5 text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${P.base}, ${P.dark})` }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                    style={{ color: "oklch(90% 0.08 301.924)" }}>Total Plans</p>
                    <p className="text-5xl font-bold tracking-tight">
                    {(summary.total_plans ?? 0).toLocaleString()}
                    </p>
                    <div className="flex gap-4 mt-3 pt-3"
                    style={{ borderTop: "1px solid oklch(70% 0.12 301.924)" }}>
                    <div>
                        <p className="text-xs" style={{ color: "oklch(85% 0.08 301.924)" }}>Completed</p>
                        <p className="text-lg font-semibold">{(summary.completed_plans ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="w-px" style={{ background: "oklch(70% 0.12 301.924)" }} />
                    <div>
                        <p className="text-xs" style={{ color: "oklch(85% 0.08 301.924)" }}>In Progress</p>
                        <p className="text-lg font-semibold">{(summary.in_progress_plans ?? 0).toLocaleString()}</p>
                    </div>
                    </div>
                </div>

                {/* DPR STATUS */}
                <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${P.border}` }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: P.muted }}>
                    DPR Status
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: "Generated", value: summary.dpr_generated },
                        { label: "Reviewed",  value: summary.dpr_reviewed  },
                    ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl p-3"
                        style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
                        <p className="text-xs font-medium mb-1" style={{ color: P.muted }}>{label}</p>
                        <p className="text-3xl font-bold" style={{ color: P.base }}>{value ?? "--"}</p>
                        </div>
                    ))}
                    </div>
                </div>

                {/* COMMONS CONNECT OPERATIONAL */}
                <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${P.border}` }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: P.muted }}>
                    Commons Connect Operational
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Tehsils",   value: commons.active_tehsils   },
                        { label: "Districts", value: commons.active_districts  },
                        { label: "States",    value: commons.active_states     },
                    ].map(({ label, value }) => (
                        <StatCard key={label} label={label} value={value} />
                    ))}
                    </div>
                </div>

                {/* LANDSCAPE STEWARDS */}
                <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${P.border}` }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: P.muted }}>
                    Landscape Stewards
                    </p>
                    <div className="rounded-xl p-4 flex items-center justify-between"
                    style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
                    <p className="text-sm font-medium" style={{ color: P.text }}>Total Stewards</p>
                    <p className="text-3xl font-bold" style={{ color: P.base }}>
                        {(stewards.total_stewards ?? 0).toLocaleString()}
                    </p>
                    </div>
                </div>
                </>
            )}
            </div>

        </div>
      </div>
    </div>
  );
};

export default PlansPage;