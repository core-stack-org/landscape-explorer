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
import StewardDetailPage from "../components/steward_detailPage.jsx";

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
      .replace(/[().]/g, "")
      .replace(/[-\s]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .toLowerCase();
};

// ── API HELPERS ───────────────────────────────────────────────────────────────

const fetchMetaStats = async (organizationId = null, stateId = null, districtId = null) => {
  let url = `${process.env.REACT_APP_API_URL}/watershed/plans/meta-stats/`;
  const params = new URLSearchParams();
  if (organizationId) params.append("organization", organizationId);
  if (stateId)        params.append("state",        stateId);
  if (districtId)     params.append("district",     districtId);
  if (params.toString()) url += `?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "420",
      "X-API-Key": process.env.REACT_APP_API_KEY,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
};

const fetchStewardStats = async (organizationId = null, stateId = null) => {
  let url = `${process.env.REACT_APP_API_URL}/watershed/plans/steward-meta-stats/`;
  const params = new URLSearchParams();
  if (organizationId) params.append("organization", organizationId);
  if (stateId)        params.append("state", stateId);
  if (params.toString()) url += `?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "420",
      "X-API-Key": process.env.REACT_APP_API_KEY,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
};

const fetchStewardListing = async (stateId, organizationId = null, districtId = null) => {
  const params = new URLSearchParams();
  if (stateId)        params.append("state",        stateId);
  if (organizationId) params.append("organization",  organizationId);
  if (districtId)     params.append("district",      districtId);

  let url = `${process.env.REACT_APP_API_URL}/watershed/plans/steward-listing/?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "420",
      "X-API-Key": process.env.REACT_APP_API_KEY,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
};

const fetchDistrictCentroid = async (districtName) => {
  const url = `${process.env.REACT_APP_GEOSERVER_URL}pan_india_asset/ows`;
  const params = new URLSearchParams({
    service:      "WFS",
    version:      "1.0.0",
    request:      "GetFeature",
    typeName:     "pan_india_asset:pan_india_district_boundary_dataset",
    outputFormat: "application/json",
    CQL_FILTER:   `Name='${districtName}'`,
  });
  try {
    const res  = await fetch(`${url}?${params}`);
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    if (feature.bbox) {
      return {
        lon: (feature.bbox[0] + feature.bbox[2]) / 2,
        lat: (feature.bbox[1] + feature.bbox[3]) / 2,
      };
    }

    const coords = feature.geometry?.coordinates?.[0]?.[0];
    if (coords) {
      const lons = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      return {
        lon: (Math.min(...lons) + Math.max(...lons)) / 2,
        lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      };
    }
    return null;
  } catch (err) {
    console.error(`Centroid fetch failed for ${districtName}:`, err);
    return null;
  }
};

const fetchPlansByState = async (stateId, organizationId = null) => {
  let url = `${process.env.REACT_APP_API_URL}/watershed/plans/?state=${stateId}&filter_test_plan=true`;
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

// ── PLAN DOT STYLES ──────────────────────────────────────────────────────────

const PLAN_STATUS_COLORS = {
  in_progress:   { fill: "#FF6FFF", stroke: "#ffffff" }, // magenta
  dpr_completed: { fill: "#CCFF00", stroke: "#3E5800" }, // chartreuse
};

const getPlanStatus = (plan) => {
  if (!plan) return "in_progress";
  if (plan.is_dpr_reviewed) return "dpr_completed";
  return "in_progress";
};

const getFeatureStatus = (feature) => getPlanStatus(feature.get("planDetails"));

const DOT_DEFAULT  = (status = "in_progress") => new Style({
  image: new CircleStyle({
    radius: 9,
    fill:   new Fill({ color: PLAN_STATUS_COLORS[status].fill }),
    stroke: new Stroke({ color: PLAN_STATUS_COLORS[status].stroke, width: 2 }),
  }),
});

const DOT_HOVERED  = (status = "in_progress") => new Style({
  image: new CircleStyle({
    radius: 12,
    fill:   new Fill({ color: PLAN_STATUS_COLORS[status].fill }),
    stroke: new Stroke({ color: "#ffffff", width: 2.5 }),
  }),
});

const DOT_SELECTED = (status = "in_progress") => new Style({
  image: new CircleStyle({
    radius: 12,
    fill:   new Fill({ color: "#ffffff" }),
    stroke: new Stroke({ color: PLAN_STATUS_COLORS[status].fill, width: 3.5 }),
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
    const districtLayerRef = useRef(null);
    const statePlansRef       = useRef([]);
    const currentDistrictRef  = useRef(null);
    const metaStatsRef    = useRef(null);
    const hasRestoredRef  = useRef(false);
    const viewModeRef = useRef("plans");

    const [viewMode,            setViewMode]            = useState("plans");
    const [metaStats,           setMetaStats]           = useState(null);
    const [statsLoading,        setStatsLoading]        = useState(true);
    const [statsError,          setStatsError]          = useState(false);
    const [organization,        setOrganization]        = useState(null);
    const [organizationOptions, setOrganizationOptions] = useState([]);
    const [isStateView,         setIsStateView]         = useState(true);
    const [mapLoading,          setMapLoading]          = useState(false);
    const [selectedPlan,        setSelectedPlan]        = useState(null);

    const [stewardStats,    setStewardStats]    = useState(null);
    const [stewardListing,  setStewardListing]  = useState([]);
    const [selectedSteward, setSelectedSteward] = useState(null);
    const [stewardLoading,  setStewardLoading]  = useState(false);
    const [stewardModalPlan, setStewardModalPlan] = useState(null);
    const [planDotsVisible, setPlanDotsVisible] = useState(false);

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
        view: new View({
          center: [78.9, 23.6],
          zoom: 5,
          projection: "EPSG:4326",
          maxZoom: 16,
        }),
        controls: defaultControls({ zoom: false }),
        });

        map.getInteractions().forEach((i) => {
        if (i instanceof MouseWheelZoom || i instanceof PinchZoom || i instanceof DoubleClickZoom)
            i.setActive(false);
        });

        mapRef.current = map;
        return () => map.setTarget(null);
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

    const fetchPlansByDistrict = async (districtId, organizationId = null) => {
      let url = `${process.env.REACT_APP_API_URL}/watershed/plans/?district=${districtId}&filter_test_plan=true`;
      if (organizationId) url += `&organization=${encodeURIComponent(organizationId)}`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "420",
          "X-API-Key": process.env.REACT_APP_API_KEY,
        },
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
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
      metaStatsRef.current = metaStats;
    }, [metaStats]);

    useEffect(() => {
      viewModeRef.current = viewMode;
    }, [viewMode]);

    // ── MAP RESIZE FIX ──────────────────────────────────────────
    // OL calculates canvas size at init — call updateSize() whenever
    // loading states clear so the map fills its container correctly.
    useEffect(() => {
      if (!mapLoading && !statsLoading && mapRef.current) {
        setTimeout(() => mapRef.current?.updateSize(), 50);
      }
    }, [mapLoading, statsLoading]);

    useEffect(() => {
      const ctx = location.state?.returnContext;
      if (!ctx?.stateId) return;

      const tryRestore = setInterval(() => {
        if (mapRef.current && metaStatsRef.current && !hasRestoredRef.current) {
          clearInterval(tryRestore);
          hasRestoredRef.current = true;
          handleStatePinClick({
            state_id:   ctx.stateId,
            state_name: ctx.stateName,
          });
        }
      }, 100);

      return () => clearInterval(tryRestore);
    }, []);

    // ── STATS ───────────────────────────────────────────────────
    const loadStats = async (orgId = null, stateId = null) => {
      setStatsLoading(true);
      setStatsError(false);
      try {
        if (viewMode === "plans") {
          const data = await fetchMetaStats(orgId, stateId);
          setMetaStats(data);
          // Populate org options from meta-stats (only present when no org filter active)
          if (data.organization_breakdown) {
            setOrganizationOptions(
              data.organization_breakdown.map((o) => ({
                value: o.organization_id,
                label: o.organization_name,
              }))
            );
          }
        } else {
          const data = await fetchStewardStats(orgId, stateId);
          setStewardStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
        setStatsError(true);
      } finally {
        setStatsLoading(false);
      }
    };

    useEffect(() => {
      loadStats(orgRef.current?.value ?? null);
    }, [viewMode]);

    // ── PIN LAYER ───────────────────────────────────────────────
    const addStateBubbles = (statsData, mode = viewMode) => {
      const map = mapRef.current;
      if (!map) return;

      if (bubbleLayerRef.current) {
        map.removeLayer(bubbleLayerRef.current);
        bubbleLayerRef.current = null;
      }

      const stateData = mode === "stewards"
        ? (statsData?.state_level ?? []).map(s => ({
            ...s,
            total_plans: s.steward_count,
            centroid:    null,
            state_name:  s.state_name,
          }))
        : (statsData?.state_breakdown ?? []);

      if (!stateData.length) return;

      const features = stateData
        .filter((s) => s.centroid?.lat || s.centroid?.lon ||
          (s.centroid === null && s.state_name))
        .map((s) => {
          let coords;
          if (s.centroid?.lat && s.centroid?.lon) {
            coords = [s.centroid.lon, s.centroid.lat];
          } else if (mode === "stewards" && metaStatsRef.current?.state_breakdown) {
            const match = metaStatsRef.current.state_breakdown.find(
              (p) => p.state_name === s.state_name
            );
            if (match?.centroid) coords = [match.centroid.lon, match.centroid.lat];
          }
          if (!coords) return null;

          const feature = new Feature({
            geometry:  new Point(coords),
            stateData: { ...s, state_id: s.state_id },
          });
          feature.setStyle(createPinStyle(s.state_name, s.steward_count ?? s.total_plans));
          return feature;
        })
        .filter(Boolean);

      if (!features.length) return;

      const layer = new VectorLayer({
        source: new VectorSource({ features }),
        zIndex: 10,
      });
      layer.set("layerName", "bubbleLayer");
      bubbleLayerRef.current = layer;
      map.addLayer(layer);
    };

    useEffect(() => {
      if (viewMode === "plans"    && metaStats    && isStateView) addStateBubbles(metaStats,    "plans");
      if (viewMode === "stewards" && stewardStats && isStateView) addStateBubbles(stewardStats, "stewards");
    }, [metaStats, stewardStats, isStateView, viewMode]);

    const addDistrictPins = async (districtLevel) => {
      const map = mapRef.current;
      if (!map || !districtLevel?.length) return;

      if (districtLayerRef.current) {
        map.removeLayer(districtLayerRef.current);
        districtLayerRef.current = null;
      }

      const centroidResults = await Promise.all(
        districtLevel.map(async (d) => {
          const centroid = await fetchDistrictCentroid(d.district_name);
          return { ...d, centroid };
        })
      );

      const features = centroidResults
        .filter((d) => d.centroid)
        .map((d) => {
          const feature = new Feature({
            geometry:     new Point([d.centroid.lon, d.centroid.lat]),
            districtData: d,
          });
          feature.setStyle(createPinStyle(d.district_name, d.steward_count));
          return feature;
        });

      if (!features.length) return;

      const layer = new VectorLayer({
        source: new VectorSource({ features }),
        zIndex: 10,
      });
      layer.set("layerName", "districtLayer");
      districtLayerRef.current = layer;
      map.addLayer(layer);

      map.getView().fit(layer.getSource().getExtent(), {
        padding:  [60, 60, 60, 60],
        duration: 600,
        maxZoom:  14,
      });
    };

    const addPlanDistrictPins = async (plans) => {
      const map = mapRef.current;
      if (!map) return;

      if (districtLayerRef.current) {
        map.removeLayer(districtLayerRef.current);
        districtLayerRef.current = null;
      }

      const districtCounts = {};
      plans.forEach((p) => {
        if (!p.district_soi) return;
        if (!districtCounts[p.district_soi]) {
          districtCounts[p.district_soi] = { count: 0, district_id: p.district_soi };
        }
        districtCounts[p.district_soi].count += 1;
      });

      const entries = Object.values(districtCounts);
      const centroidResults = await Promise.all(
        entries.map(async (entry) => {
          const districtName = districtLookupRef.current[entry.district_id];
          if (!districtName) return null;
          const centroid = await fetchDistrictCentroid(districtName);
          return centroid ? { ...entry, districtName, centroid } : null;
        })
      );

      const features = centroidResults
        .filter(Boolean)
        .map((d) => {
          const feature = new Feature({
            geometry:     new Point([d.centroid.lon, d.centroid.lat]),
            districtData: d,
          });
          feature.setStyle(createPinStyle(d.districtName, d.count));
          return feature;
        });

      if (!features.length) return;

      const layer = new VectorLayer({
        source: new VectorSource({ features }),
        zIndex: 10,
      });
      layer.set("layerName", "districtLayer");
      districtLayerRef.current = layer;
      map.addLayer(layer);

      map.getView().fit(layer.getSource().getExtent(), {
        padding: [60, 60, 60, 60], duration: 600,
      });
    };

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
            f.setStyle(DOT_DEFAULT(getPlanStatus(p)));
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
        setPlanDotsVisible(true);

        map.getView().fit(layer.getSource().getExtent(), {
        padding:  [60, 60, 60, 60],
        duration: 600,
        });
    };

    // ── STATE CLICK → DRILL DOWN ────────────────────────────────
    const handleStatePinClick = async (stateData) => {
      currentStateRef.current = stateData;
      setMapLoading(true);

      if (bubbleLayerRef.current) {
        mapRef.current.removeLayer(bubbleLayerRef.current);
        bubbleLayerRef.current = null;
      }

      try {
        if (viewModeRef.current === "plans") {
          const [plans, stateStats] = await Promise.all([
            fetchPlansByState(stateData.state_id, orgRef.current?.value ?? null),
            fetchMetaStats(orgRef.current?.value ?? null, stateData.state_id),
          ]);

          statePlansRef.current = plans;

          if (bubbleLayerRef.current) {
            mapRef.current.removeLayer(bubbleLayerRef.current);
            bubbleLayerRef.current = null;
          }

          setMetaStats(stateStats);
          setIsStateView(false);
          await addPlanDistrictPins(plans);
        } else {
          const [stewardData, stateMetaStats] = await Promise.all([
            fetchStewardStats(orgRef.current?.value ?? null, stateData.state_id),
            fetchMetaStats(orgRef.current?.value ?? null, stateData.state_id),
          ]);
          setStewardStats(stewardData);
          setMetaStats(stateMetaStats);

          if (bubbleLayerRef.current) {
            mapRef.current.removeLayer(bubbleLayerRef.current);
            bubbleLayerRef.current = null;
          }

          setIsStateView(false);
          await addDistrictPins(stewardData.district_level ?? []);
        }
        setIsStateView(false);
      } catch (err) {
        console.error("State pin click failed:", err);
        addStateBubbles(metaStats);
      } finally {
        setMapLoading(false);
      }
    };

    const handleDistrictPinClick = async (districtData) => {
      if (!districtData) return;

      if (viewModeRef.current === "plans") {
        setMapLoading(true);
        currentDistrictRef.current = districtData;

        if (districtLayerRef.current) {
          mapRef.current.removeLayer(districtLayerRef.current);
          districtLayerRef.current = null;
        }

        try {
          const plans = await fetchPlansByDistrict(
            districtData.district_id,
            orgRef.current?.value ?? null
          );
          addPlanDots(plans);

          const districtStats = await fetchMetaStats(
            orgRef.current?.value ?? null,
            null,
            districtData.district_id
          );
          setMetaStats(districtStats);
        } catch (err) {
          console.error("District plans fetch failed:", err);
        } finally {
          setMapLoading(false);
        }
      } else {
        setStewardLoading(true);
        setSelectedSteward(null);
        currentDistrictRef.current = districtData;
        try {
          const data = await fetchStewardListing(
            currentStateRef.current?.state_id,
            orgRef.current?.value ?? null,
            districtData.district_id
          );
          setStewardListing(data.stewards ?? []);
        } catch (err) {
          console.error("Steward listing failed:", err);
        } finally {
          setStewardLoading(false);
        }
      }
    };

    // ── BACK TO STATE VIEW ──────────────────────────────────────
    const handleBackToStateView = async () => {
      const map = mapRef.current;
      if (!map) return;

      if (planLayerRef.current) {
        map.removeLayer(planLayerRef.current);
        planLayerRef.current = null;
      }
      if (districtLayerRef.current) {
        map.removeLayer(districtLayerRef.current);
        districtLayerRef.current = null;
      }

      if (selectedFeatureRef.current) selectedFeatureRef.current = null;
      hoveredFeatureRef.current  = null;
      currentDistrictRef.current = null;
      statePlansRef.current      = [];

      setSelectedPlan(null);
      setSelectedSteward(null);
      setStewardListing([]);
      setIsStateView(true);
      setPlanDotsVisible(false);

      setStatsLoading(true);
      try {
        if (viewModeRef.current === "plans") {
          const globalStats = await fetchMetaStats(orgRef.current?.value ?? null);
          setMetaStats(globalStats);
          // Repopulate org options from fresh global stats
          if (globalStats.organization_breakdown) {
            setOrganizationOptions(
              globalStats.organization_breakdown.map((o) => ({
                value: o.organization_id,
                label: o.organization_name,
              }))
            );
          }
          addStateBubbles(globalStats, "plans");
        } else {
          const [stewardData, orgMeta, globalMeta] = await Promise.all([
            fetchStewardStats(orgRef.current?.value ?? null),
            fetchMetaStats(orgRef.current?.value ?? null),         // org-filtered — for display
            orgRef.current?.value ? fetchMetaStats(null) : Promise.resolve(null), // global — for centroid lookups
          ]);
          // metaStatsRef must hold global (all-states) meta so centroid fallback works for every pin
          metaStatsRef.current = globalMeta ?? orgMeta;
          setMetaStats(orgMeta);
          setStewardStats(stewardData);
          addStateBubbles(stewardData, "stewards");
        }
      } catch (err) {
        console.error("Failed to restore global stats:", err);
      } finally {
        setStatsLoading(false);
      }

      map.getView().animate({ center: [78.9, 23.6], zoom: 5, duration: 600 });
    };

    // ── BACK TO DISTRICT VIEW ───────────────────────────────────
    const handleBackToDistrictPins = async () => {
      const map = mapRef.current;
      if (!map) return;

      currentDistrictRef.current = null;

      if (viewModeRef.current === "plans") {
        // Remove plan dots, reset selection
        if (planLayerRef.current) {
          map.removeLayer(planLayerRef.current);
          planLayerRef.current = null;
        }
        if (selectedFeatureRef.current) selectedFeatureRef.current = null;
        hoveredFeatureRef.current = null;
        setSelectedPlan(null);
        setPlanDotsVisible(false);

        // Restore state-level stats and re-render district pins from cache
        setStatsLoading(true);
        try {
          const stateStats = await fetchMetaStats(
            orgRef.current?.value ?? null,
            currentStateRef.current.state_id
          );
          setMetaStats(stateStats);
          await addPlanDistrictPins(statePlansRef.current);
        } catch (err) {
          console.error("Back to district pins failed:", err);
        } finally {
          setStatsLoading(false);
        }
      } else {
        // Stewards: just clear the listing, district pins are still on the map
        setStewardListing([]);
        setSelectedSteward(null);
      }
    };

    // ── MAP CLICK HANDLER ───────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const handleClick = (evt) => {
          map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
            const layerName = layer?.get("layerName");

            if (layerName === "planLayer") {
              if (selectedFeatureRef.current && selectedFeatureRef.current !== feature) {
                selectedFeatureRef.current.setStyle(DOT_DEFAULT(getFeatureStatus(selectedFeatureRef.current)));
              }
              feature.setStyle(DOT_SELECTED(getFeatureStatus(feature)));
              selectedFeatureRef.current = feature;
              setSelectedPlan(feature.get("planDetails"));
              return true;
            }

            if (layerName === "bubbleLayer") {
              const stateData = feature.get("stateData");
              if (stateData) handleStatePinClick(stateData);
              return true;
            }

            if (layerName === "districtLayer") {
              handleDistrictPinClick(feature.get("districtData"));
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

            if (
            hoveredFeatureRef.current &&
            hoveredFeatureRef.current !== hitFeature &&
            hoveredFeatureRef.current !== selectedFeatureRef.current
            ) {
                hoveredFeatureRef.current.setStyle(DOT_DEFAULT(getFeatureStatus(hoveredFeatureRef.current)));
                hoveredFeatureRef.current = null;
            }

            if (hitFeature && layerName === "planLayer" && hitFeature !== selectedFeatureRef.current) {
            hitFeature.setStyle(DOT_HOVERED(getFeatureStatus(hitFeature)));
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
    const handleOrgChange = async (selected) => {
      setOrganization(selected);
      orgRef.current = selected;

      if (!isStateView && currentStateRef.current) {
        setMapLoading(true);
        try {
          if (viewModeRef.current === "plans") {
            const plans = await fetchPlansByState(
              currentStateRef.current.state_id,
              selected?.value ?? null
            );
            statePlansRef.current = plans;
            if (districtLayerRef.current) {
              mapRef.current.removeLayer(districtLayerRef.current);
              districtLayerRef.current = null;
            }
            if (planLayerRef.current) {
              mapRef.current.removeLayer(planLayerRef.current);
              planLayerRef.current = null;
            }
            const stateStats = await fetchMetaStats(
              selected?.value ?? null,
              currentStateRef.current.state_id
            );
            setMetaStats(stateStats);
            await addPlanDistrictPins(plans);
          } else {
            const [stewardData, stateOrgMeta] = await Promise.all([
              fetchStewardStats(selected?.value ?? null, currentStateRef.current.state_id),
              fetchMetaStats(selected?.value ?? null, currentStateRef.current.state_id),
            ]);
            setStewardStats(stewardData);
            setMetaStats(stateOrgMeta);
            if (districtLayerRef.current) {
              mapRef.current.removeLayer(districtLayerRef.current);
              districtLayerRef.current = null;
            }
            await addDistrictPins(stewardData.district_level ?? []);
            setStewardListing([]);
            setSelectedSteward(null);
          }
        } catch (err) {
          console.error("Org change drill-down failed:", err);
        } finally {
          setMapLoading(false);
        }

      } else {
        setStatsLoading(true);
        try {
          if (viewModeRef.current === "plans") {
            const data = await fetchMetaStats(selected?.value ?? null);
            setMetaStats(data);
            if (data.organization_breakdown) {
              setOrganizationOptions(
                data.organization_breakdown.map((o) => ({
                  value: o.organization_id,
                  label: o.organization_name,
                }))
              );
            }
          } else {
            const [stewardData, orgMeta, globalMeta] = await Promise.all([
              fetchStewardStats(selected?.value ?? null),
              fetchMetaStats(selected?.value ?? null),         // org-filtered — for stats display
              selected?.value ? fetchMetaStats(null) : Promise.resolve(null), // global — for centroid fallback
            ]);
            // Keep global (unfiltered) meta in ref so centroid lookups in addStateBubbles still work
            metaStatsRef.current = globalMeta ?? orgMeta;
            setMetaStats(orgMeta);
            if (orgMeta.organization_breakdown) {
              setOrganizationOptions(
                orgMeta.organization_breakdown.map((o) => ({
                  value: o.organization_id,
                  label: o.organization_name,
                }))
              );
            }
            setStewardStats(stewardData);
          }
        } catch (err) {
          console.error("Org change failed:", err);
        } finally {
          setStatsLoading(false);
        }
      }
    };

    // ── ZOOM ────────────────────────────────────────────────────
    const handleZoom = (delta) => {
      const view = mapRef.current?.getView();
      if (!view) return;
      const currentZoom = view.getZoom();
      const newZoom = Math.min(currentZoom + delta, 16);
      view.animate({ zoom: newZoom, duration: 300 });
    };

    const getStewardOrgId = (facilitatorName) => {
      if (orgRef.current?.value) return orgRef.current.value;
      const match = statePlansRef.current?.find(
        (p) => p.facilitator_name === facilitatorName
      );
      return match?.organization ?? null;
    };

    const filteredOrgOptions = isStateView ? organizationOptions : viewModeRef.current === "plans" ? (metaStats?.organization_breakdown ?? []).map(o => ({ value: o.organization_id, label: o.organization_name })) : (stewardStats?.by_organization ?? []).map(o => ({ value: o.organization_id, label: o.organization_name }));


  const summary  = metaStats?.summary                     ?? {};
  const commons  = metaStats?.commons_connect_operational  ?? {};
  const stewards = metaStats?.landscape_stewards           ?? {};

  return (
    <div className="min-h-screen" style={{ background: P.lighter }}>
      <LandingNavbar />

      <div className="bg-white rounded-2xl border shadow-xl m-6" style={{ borderColor: P.border }}>

        <div className="max-w-[1800px] mx-auto px-6 pt-6 pb-4 relative">

          <a href="mailto:contact@core-stack.org"
            className="absolute top-5 right-6 flex items-center gap-1.5 px-3 py-2 rounded-xl
                      text-xs font-semibold hover:shadow-md transition-all duration-200"
            style={{
              color:      P.base,
              border:     `1px solid ${P.border}`,
            }}>
            Contact Us
            </a>

          <h1 className="text-2xl lg:text-4xl font-semibold text-center" style={{ color: P.text }}>
            Landscape Stewardship Network
          </h1>
          <p className="text-xl mt-1 text-center" style={{ color: P.muted }}>
            Commoning for Resilience and Equality
          </p>
          <p className="text-md mt-2 text-slate-500 text-center">
            Landscape stewards from across 1000+ villages are building natural
            resource management plans from the ground-up in consultation with
            their communities. This dashboard shows the network coverage, the sustainability potential and impact. Discover
            partner organizations and the on-ground work of landscape stewards
            in creating detailed project reports for their villages.
          </p>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-[1800px] mx-auto h-[calc(100vh-220px)]">

          {/* MAP */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full lg:w-[65%] h-[50vh] lg:h-full"
            style={{ border: `1px solid ${P.border}` }}>
            <div ref={mapElement} className="w-full h-full" />

            {mapLoading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[999]">
                <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: `${P.base} transparent transparent transparent` }} />
              </div>
            )}

            {!isStateView && (
              <button
                onClick={currentDistrictRef.current ? handleBackToDistrictPins : handleBackToStateView}
                className="absolute top-4 left-4 z-[1000] flex items-center gap-2 px-3 py-2 rounded-xl
                           bg-white/95 backdrop-blur-sm text-sm font-semibold shadow-lg
                           hover:shadow-xl active:scale-95 transition-all duration-200"
                style={{ border: `1px solid ${P.border}`, color: P.text }}
              >
                ← Back
              </button>
            )}

            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-80">
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10"
                  style={{ color: P.muted }}>
                  <FilterListIcon style={{ fontSize: 18 }} />
                </div>
                <SelectReact
                  value={organization}
                  onChange={handleOrgChange}
                  options={filteredOrgOptions}
                  isClearable
                  placeholder="Filter by organization"
                  styles={selectStyles}
                />
              </div>
            </div>

            {/* PLAN STATUS LEGEND */}
            {planDotsVisible && (
              <div className="absolute bottom-4 left-4 z-[1000] rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
                style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)",
                         border: "1px solid rgba(220,220,220,0.8)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#555" }}>Plan Status</p>
                {[
                  { color: PLAN_STATUS_COLORS.in_progress.fill,   label: "In Progress"    },
                  { color: PLAN_STATUS_COLORS.dpr_completed.fill, label: "DPR Completed"  },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ background: color, border: "2px solid rgba(0,0,0,0.15)" }} />
                    <p className="text-xs font-medium" style={{ color: "#333" }}>{label}</p>
                  </div>
                ))}
              </div>
            )}

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
         <div className={`w-full lg:w-[35%] h-[50vh] lg:h-full flex flex-col pr-1 relative ${
            selectedPlan ? "overflow-hidden" : "overflow-y-auto gap-4"
          }`}>

            {(mapLoading || statsLoading) && (
              <div
                className="absolute inset-0 z-[500] rounded-2xl flex flex-col items-center
                          justify-center gap-3"
                style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}
              >
                <div
                  className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: `${P.base} transparent transparent transparent` }}
                />
                <p className="text-sm font-semibold" style={{ color: P.muted }}>
                  Loading data...
                </p>
              </div>
            )}
            {statsLoading ? <SidebarSkeleton /> : statsError ? (
              <div className="flex-1 flex items-center justify-center rounded-2xl"
                style={{ border: `1px solid ${P.border}` }}>
                <p className="text-sm" style={{ color: P.muted }}>Failed to load stats. Please refresh.</p>
              </div>
            ) : selectedPlan ? (

              <div className="flex flex-col h-full gap-4">
                <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1">

                  <div className="rounded-2xl p-5 text-white shadow-lg relative"
                    style={{ background: `linear-gradient(135deg, ${P.base}, ${P.dark})` }}>
                    <button
                      onClick={() => {
                        if (selectedFeatureRef.current) {
                          selectedFeatureRef.current.setStyle(DOT_DEFAULT(getFeatureStatus(selectedFeatureRef.current)));
                          selectedFeatureRef.current = null;
                        }
                        setSelectedPlan(null);
                      }}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center
                                justify-center transition-all hover:bg-white/20"
                      style={{ color: "white" }}
                    >✕</button>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                      style={{ color: "oklch(90% 0.08 301.924)" }}>Plan Details</p>
                    <p className="text-2xl font-bold tracking-tight pr-8">{selectedPlan.plan}</p>
                    <p className="text-sm mt-1" style={{ color: "oklch(85% 0.08 301.924)" }}>
                      {selectedPlan.village_name || "--"}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm"
                    style={{ border: `1px solid ${P.border}` }}>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Organization",   value: selectedPlan.organization_name },
                        { label: "Project",        value: selectedPlan.project_name      },
                        { label: "Gram Panchayat", value: selectedPlan.gram_panchayat    },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl p-3"
                          style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
                          <p className="text-xs font-medium mb-1" style={{ color: P.muted }}>{label}</p>
                          <p className="text-sm font-semibold" style={{ color: P.text }}>{value || "--"}</p>
                        </div>
                      ))}

                      {selectedPlan.facilitator_name && (
                        <div
                          className="rounded-xl p-3 cursor-pointer hover:shadow-md transition-all duration-200"
                          style={{ background: P.light, border: `1px solid ${P.base}` }}
                          onClick={() => setStewardModalPlan({
                            facilitator_name: selectedPlan.facilitator_name,
                            organization:     selectedPlan.organization,
                          })}
                        >
                          <p className="text-xs font-medium mb-1" style={{ color: P.muted }}>Steward</p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold" style={{ color: P.base }}>
                              {selectedPlan.facilitator_name}
                            </p>
                            <span className="text-xs font-semibold" style={{ color: P.base }}>↗</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm"
                    style={{ border: `1px solid ${P.border}` }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ color: P.muted }}>Status</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Plan",         active: selectedPlan.is_completed    },
                        { label: "DPR Completed", active: selectedPlan.is_dpr_reviewed },
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
                </div>

                <button
                  onClick={() => {
                    const districtLabel = transformName(districtLookupRef.current[selectedPlan.district_soi] || "");
                    const tehsilLabel   = transformName(tehsilLookupRef.current[selectedPlan.tehsil_soi]     || "");
                    navigate(`/CCUsagePage/plan-view?id=${selectedPlan.id}&completed=${!!selectedPlan.is_completed}&dpr_reviewed=${!!selectedPlan.is_dpr_reviewed}&dpr_generated=${!!selectedPlan.is_dpr_generated}&dpr_approved=${!!selectedPlan.is_dpr_approved}`, {
                      state: {
                        plan: { ...selectedPlan, district: districtLabel, block: tehsilLabel },
                        returnContext: {
                          stateId:   currentStateRef.current?.state_id   ?? null,
                          stateName: currentStateRef.current?.state_name ?? null,
                        },
                      },
                    });
                  }}
                  className="w-full py-3 rounded-2xl text-white font-semibold text-sm flex-shrink-0
                            shadow-lg transition-all duration-200"
                  disabled={!selectedPlan.is_dpr_reviewed}
                  style={{
                    background: selectedPlan.is_dpr_reviewed
                      ? `linear-gradient(135deg, ${P.base}, ${P.dark})`
                      : "oklch(85% 0.04 301.924)",
                    color: selectedPlan.is_dpr_reviewed ? "#fff" : P.muted,
                    cursor: selectedPlan.is_dpr_reviewed ? "pointer" : "not-allowed",
                  }}
                >
                  View Full Plan →
                </button>
              </div>

            ) : (

              <>
                <div className="rounded-xl p-1 flex" style={{ background: P.light }}>
                  {["plans", "stewards"].map((mode) => (
                    <button key={mode}
                      onClick={async () => {
                        if (mode === viewMode) return;

                        setViewMode(mode);

                        // Clear all layers and selection state
                        if (planLayerRef.current) {
                          mapRef.current.removeLayer(planLayerRef.current);
                          planLayerRef.current = null;
                        }
                        if (districtLayerRef.current) {
                          mapRef.current.removeLayer(districtLayerRef.current);
                          districtLayerRef.current = null;
                        }
                        if (bubbleLayerRef.current) {
                          mapRef.current.removeLayer(bubbleLayerRef.current);
                          bubbleLayerRef.current = null;
                        }
                        setSelectedPlan(null);
                        setSelectedSteward(null);
                        setStewardListing([]);
                        setPlanDotsVisible(false);
                        if (selectedFeatureRef.current) selectedFeatureRef.current = null;
                        hoveredFeatureRef.current  = null;
                        // Always reset district — stewards max depth is district level
                        currentDistrictRef.current = null;

                        setStatsLoading(true);
                        try {
                          if (!isStateView && currentStateRef.current) {
                            // ── Preserve state selection ──────────────────
                            // Both modes land at district-pin level for the same state
                            if (mode === "plans") {
                              const [plans, stateStats] = await Promise.all([
                                fetchPlansByState(currentStateRef.current.state_id, orgRef.current?.value ?? null),
                                fetchMetaStats(orgRef.current?.value ?? null, currentStateRef.current.state_id),
                              ]);
                              statePlansRef.current = plans;
                              setMetaStats(stateStats);
                              await addPlanDistrictPins(plans);
                            } else {
                              statePlansRef.current = [];
                              const [stewardData, stateMetaStats] = await Promise.all([
                                fetchStewardStats(orgRef.current?.value ?? null, currentStateRef.current.state_id),
                                fetchMetaStats(orgRef.current?.value ?? null, currentStateRef.current.state_id),
                              ]);
                              setStewardStats(stewardData);
                              setMetaStats(stateMetaStats);
                              await addDistrictPins(stewardData.district_level ?? []);
                            }
                          } else {
                            // ── Global state view ─────────────────────────
                            if (mode === "plans") {
                              const data = await fetchMetaStats(orgRef.current?.value ?? null);
                              setMetaStats(data);
                              addStateBubbles(data, "plans");
                            } else {
                              const [stewardData, plansMeta] = await Promise.all([
                                fetchStewardStats(orgRef.current?.value ?? null),
                                fetchMetaStats(null),
                              ]);
                              metaStatsRef.current = plansMeta;
                              setMetaStats(plansMeta);
                              setStewardStats(stewardData);
                              addStateBubbles(stewardData, "stewards");
                            }
                          }
                        } catch (err) {
                          console.error("Mode switch failed:", err);
                          setStatsError(true);
                        } finally {
                          setStatsLoading(false);
                        }
                      }}
                      className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
                      style={viewMode === mode
                        ? { background: P.base, color: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }
                        : { color: P.muted }}>
                      {mode === "plans" ? "Plans" : "Stewards"}
                    </button>
                  ))}
                </div>

                {viewMode === "stewards" ? (
                  <>
                    <div className="rounded-2xl p-5 text-white shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${P.base}, ${P.dark})` }}>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                        style={{ color: "oklch(90% 0.08 301.924)" }}>Total Stewards</p>
                      <p className="text-5xl font-bold tracking-tight">
                        {(stewardStats?.total_stewards ?? 0).toLocaleString()}
                      </p>
                      <div className="flex gap-4 mt-3 pt-3"
                        style={{ borderTop: "1px solid oklch(70% 0.12 301.924)" }}>
                        <div>
                          <p className="text-xs" style={{ color: "oklch(85% 0.08 301.924)" }}>Female</p>
                          <p className="text-lg font-semibold">{stewards?.gender_breakdown?.female}</p>
                        </div>
                        <div className="w-px" style={{ background: "oklch(70% 0.12 301.924)" }} />
                        <div>
                          <p className="text-xs" style={{ color: "oklch(85% 0.08 301.924)" }}>Male</p>
                          <p className="text-lg font-semibold">{stewards?.gender_breakdown?.male}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${P.border}` }}>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: P.muted }}>Progress Report</p>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="rounded-xl p-3"
                          style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
                          <p className="text-xs font-medium mb-1" style={{ color: P.muted }}>DPR Completed</p>
                          <p className="text-3xl font-bold" style={{ color: P.base }}>
                            {(summary.dpr_reviewed ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl p-3"
                          style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
                          <p className="text-xs font-medium mb-1" style={{ color: P.muted }}>DPR Submitted</p>
                          <p className="text-3xl font-bold" style={{ color: P.base }}>--</p>
                        </div>
                      </div>

                      <div className="rounded-xl p-3"
                        style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
                        <p className="text-xs font-medium mb-3" style={{ color: P.muted }}>Demands Generated</p>

                        <div className="flex flex-col gap-2">
                          <div className="rounded-lg p-3 flex items-center justify-between"
                            style={{ background: "white", border: `1px solid ${P.border}` }}>
                            <p className="text-xs font-semibold" style={{ color: P.text }}>Community</p>
                            <p className="text-sm font-bold" style={{ color: P.base }}>{metaStats?.demand_overview?.community_demands}</p>
                          </div>

                          <div className="rounded-lg p-3 flex items-center justify-between"
                            style={{ background: "white", border: `1px solid ${P.border}` }}>
                            <p className="text-xs font-semibold" style={{ color: P.text }}>Individual</p>
                            <p className="text-sm font-bold" style={{ color: P.base }}>{metaStats?.demand_overview?.individual_demands}</p>
                          </div>
                        </div>
                      </div>
                    </div>


                    <div className="bg-white rounded-2xl p-4 shadow-sm"
                      style={{ border: `1px solid ${P.border}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold uppercase tracking-widest"
                          style={{ color: P.muted }}>
                          {stewardListing.length > 0 ? "Stewards" : "Stewards by Organization"}
                        </p>
                      </div>

                      {stewardLoading ? (
                        <div className="flex items-center justify-center h-20">
                          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                            style={{ borderColor: `${P.base} transparent transparent transparent` }} />
                        </div>
                      ) : stewardListing.length > 0 ? (
                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                          {stewardListing.map((s, i) => (
                            <div key={i} className="flex flex-col gap-1">
                              <div
                                className="w-full px-3 py-2.5 rounded-xl flex items-center
                                          justify-between gap-2 transition-all duration-200 cursor-pointer
                                          hover:shadow-md"
                                style={{
                                  background: selectedSteward === s ? P.light : P.lighter,
                                  border: `1px solid ${selectedSteward === s ? P.base : P.border}`,
                                }}
                              >
                                <div className="min-w-0 flex-1"
                                  onClick={() => setSelectedSteward(selectedSteward === s ? null : s)}>
                                  <p className="text-sm font-semibold truncate" style={{ color: P.text }}>
                                    {s.facilitator_name}
                                  </p>
                                  <p className="text-xs" style={{ color: P.muted }}>
                                    {s.plan_count} plans · {s.completed_count} completed
                                  </p>
                                </div>
                                <button
                                  onClick={() => setStewardModalPlan({
                                    facilitator_name: s.facilitator_name,
                                    organization:     s.organization?.id ?? getStewardOrgId(s.facilitator_name),
                                  })}
                                  className="flex-shrink-0 px-2 py-1 rounded-lg text-xs font-semibold
                                            transition-all duration-200 hover:shadow-sm cursor-pointer"
                                  style={{ background: P.base, color: "#fff" }}
                                >
                                  View
                                </button>
                                <span className="text-xs flex-shrink-0 cursor-pointer" style={{ color: P.muted }}
                                  onClick={() => setSelectedSteward(selectedSteward === s ? null : s)}>
                                  {selectedSteward === s ? "▲" : "▼"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                          {(stewardStats?.by_organization ?? []).map((org, i) => (
                            <div key={org.organization_id ?? i}
                              className="px-3 py-2.5 rounded-xl flex items-center justify-between
                                        cursor-pointer hover:shadow-md transition-all duration-200"
                              style={{
                                background: organization?.value === org.organization_id ? P.light : P.lighter,
                                border: `1px solid ${organization?.value === org.organization_id ? P.base : P.border}`,
                              }}
                              onClick={() => {
                                const selected = {
                                  value: org.organization_id,
                                  label: org.organization_name,
                                };
                                if (organization?.value === org.organization_id) {
                                  handleOrgChange(null);
                                } else {
                                  handleOrgChange(selected);
                                }
                              }}
                            >
                              <p className="text-sm font-semibold truncate"
                                style={{ color: organization?.value === org.organization_id ? P.base : P.text }}>
                                {org.organization_name}
                              </p>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <p className="text-lg font-bold" style={{ color: P.base }}>
                                  {org.steward_count}
                                </p>
                                <p className="text-xs" style={{ color: P.muted }}>stewards</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedSteward && (
                        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${P.border}` }}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase tracking-widest"
                              style={{ color: P.muted }}>
                              Plans by {selectedSteward.facilitator_name}
                            </p>
                            <button onClick={() => setSelectedSteward(null)}
                              className="text-xs" style={{ color: P.muted }}>✕</button>
                          </div>
                          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                            {(selectedSteward.plans ?? []).map((p, i) => (
                              <div key={i} className="px-3 py-2 rounded-lg flex items-center justify-between"
                                style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
                                <p className="text-xs font-medium truncate" style={{ color: P.text }}>
                                  {p.plan || p.name}
                                </p>
                                <span className="text-xs ml-2 flex-shrink-0 font-semibold"
                                  style={{ color: p.is_completed ? "oklch(50% 0.18 145)" : P.muted }}>
                                  {p.is_completed ? "✓" : "⏳"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>

                ) : (

                  <>
                    <div className="rounded-2xl p-5 text-white shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${P.base}, ${P.dark})` }}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                            style={{ color: "oklch(90% 0.08 301.924)" }}>Total Plans</p>
                          <p className="text-5xl font-bold tracking-tight">
                            {(summary.total_plans ?? 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="w-px self-stretch" style={{ background: "oklch(70% 0.12 301.924)" }} />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                            style={{ color: "oklch(90% 0.08 301.924)" }}>Total Demands</p>
                          <p className="text-5xl font-bold tracking-tight">
                            {((metaStats?.demand_overview?.community_demands ?? 0) + (metaStats?.demand_overview?.individual_demands ?? 0)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm"
                      style={{ border: `1px solid ${P.border}` }}>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                        style={{ color: P.muted }}>Commons Connect Footprint</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "States",    value: commons.active_states    },
                          { label: "Districts", value: commons.active_districts },
                          { label: "Tehsils",   value: commons.active_tehsils   },
                        ].map(({ label, value }) => (
                          <StatCard key={label} label={label} value={value} />
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm"
                    style={{ border: `1px solid ${P.border}` }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ color: P.muted }}>Detailed Project Reports</p>

                    <div className="rounded-xl p-3"
                      style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold" style={{ color: P.text }}>DPR Completed</p>
                        <p className="text-xl font-bold" style={{ color: P.base }}>
                          {(summary.dpr_reviewed ?? 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-lg p-3"
                        style={{ background: "white", border: `1px solid ${P.border}` }}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold" style={{ color: P.text }}>DPR Submitted</p>
                          <p className="text-lg font-bold" style={{ color: P.base }}>--</p>
                        </div>

                        <div className="rounded-lg p-3 flex items-center justify-between"
                          style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
                          <p className="text-xs font-semibold" style={{ color: P.text }}>DPR Approved</p>
                          <p className="text-base font-bold" style={{ color: P.base }}>--</p>
                        </div>
                      </div>

                    </div>
                  </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm"
                    style={{ border: `1px solid ${P.border}` }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ color: P.muted }}>NRM and Livelihood Demands</p>

                    <div className="rounded-xl p-3"
                      style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold" style={{ color: P.text }}>Demands Submitted</p>
                        <p className="text-xl font-bold" style={{ color: P.base }}>--</p>
                      </div>

                      <div className="rounded-lg p-3 flex items-center justify-between"
                        style={{ background: "white", border: `1px solid ${P.border}` }}>
                        <p className="text-xs font-semibold" style={{ color: P.text }}>Demands Approved</p>
                        <p className="text-lg font-bold" style={{ color: P.base }}>--</p>
                      </div>

                    </div>
                  </div>

                    {(metaStats?.landscape_stewards?.by_organization?.length > 0) && (
                      <div className="bg-white rounded-2xl p-4 shadow-sm"
                        style={{ border: `1px solid ${P.border}` }}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold uppercase tracking-widest"
                            style={{ color: P.muted }}>
                            Partner Organizations
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                          {metaStats.landscape_stewards.by_organization.map((org, i) => (
                            <span
                              key={org.organization_id ?? i}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold"
                              style={{
                                background: P.lighter,
                                border:     `1px solid ${P.border}`,
                                color:      P.text,
                              }}
                            >
                              {org.organization_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

        </div>
      </div>
      {stewardModalPlan && (
        <div
          className="fixed inset-0 z-[3000] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setStewardModalPlan(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[900px] max-w-[95vw] max-h-[85vh]
                      overflow-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setStewardModalPlan(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center
                        justify-center text-lg font-bold transition-all hover:bg-slate-100"
              style={{ color: P.muted }}
            >
              ✕
            </button>

            {stewardModalPlan.organization ? (
              <StewardDetailPage
                plan={stewardModalPlan}
                onClose={() => setStewardModalPlan(null)}
              />
            ) : (
              <div className="p-10 text-center">
                <p className="text-sm font-medium" style={{ color: P.muted }}>
                  Please select an organization filter to view steward details.
                </p>
                <button
                  onClick={() => setStewardModalPlan(null)}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: P.base }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansPage;