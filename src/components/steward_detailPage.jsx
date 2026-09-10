import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import LandingNavbar from "./landing_navbar";
import { useNavigate, useLocation } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import StewardIcon from "../assets/steward_icon_final.png";
import MapSection from "./planMapSection";
import getVectorLayers from "../actions/getVectorLayers";
import { Fill, Stroke, Style, Text, Circle as CircleStyle  } from "ol/style";
import Feature from "ol/Feature";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import Point from "ol/geom/Point";
import Overlay from "ol/Overlay";
import planIcon from "../assets/plan_icon_final.png";
import Icon from "ol/style/Icon";
import { Home } from "lucide-react";


const P = {
  base:    "oklch(60% 0.2 301.924)",
  light:   "oklch(95% 0.05 301.924)",
  lighter: "oklch(98% 0.02 301.924)",
  dark:    "oklch(45% 0.2  301.924)",
  text:    "oklch(28% 0.18 301.924)",
  border:  "oklch(90% 0.06 301.924)",
  muted:   "oklch(65% 0.12 301.924)",
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between py-2.5"
    style={{ borderBottom: `1px solid ${P.border}` }}>
    <p className="text-xs font-semibold uppercase tracking-widest w-2/5 flex-shrink-0"
      style={{ color: P.muted }}>{label}</p>
    <p className="text-sm font-medium text-right" style={{ color: P.text }}>
      {value || "N/A"}
    </p>
  </div>
);

const StatPill = ({ label, value, accent }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl p-4"
    style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
    <p className="text-3xl font-bold" style={{ color: accent ?? P.base }}>{value ?? 0}</p>
    <p className="text-xs font-semibold mt-1 text-center" style={{ color: P.muted }}>{label}</p>
  </div>
);

const StewardDetailPage = ({ plan, onClose }) => {
  const [stewardData, setStewardData] = useState(null);
  const [planMetadata, setPlanMetadata] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const { organization, facilitator } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams] = useSearchParams();
const returnContext = {
  stateId: searchParams.get("stateId"),
  stateName: searchParams.get("stateName"),
  districtId: searchParams.get("districtId"),
  districtName: searchParams.get("districtName"),
};

// ── STEWARD VILLAGES MAP ───────────────────────────────
const loadStewardVillages = useCallback(async (map) => {
  const plans = stewardData.plans ?? [];
  const validPlans = plans.filter(
    (p) =>
      p?.latitude &&
      p?.longitude &&
      !isNaN(parseFloat(p.latitude)) &&
      !isNaN(parseFloat(p.longitude))
  );
  if (validPlans.length === 0) return;

  const features = validPlans.map((p) => {
    const lon = parseFloat(p.longitude);
    const lat = parseFloat(p.latitude);

    const feature = new Feature({
      geometry: new Point([lon, lat]),
      planId: p.id,
      planName: p.name || "Plan",
      isCompleted: p.is_completed,

    });

    return feature;
  });

  const villageLayer = new VectorLayer({
    source: new VectorSource({
      features,
    }),
    zIndex: 10,
  });

villageLayer.setStyle((feature) => {
  const isCompleted = feature.get("isCompleted");

  return [
    // Status boundary
    new Style({
      image: new CircleStyle({
        radius: 20,
        fill: new Fill({
          color: "transparent",
        }),
        stroke: new Stroke({
          color: isCompleted ? "#22c55e" : "#ef4444",
          width: 4,
        }),
      }),
    }),

    // Plan icon
    new Style({
      image: new Icon({
        src: planIcon,
        scale: 0.12,
        anchor: [0.5, 0.5],
        anchorXUnits: "fraction",
        anchorYUnits: "fraction",
      }),
    }),
  ];
});
map.addLayer(villageLayer);

// ─────────────────────────────────────────────
// PLAN NAME HOVER TOOLTIP
// ─────────────────────────────────────────────

const tooltipElement = document.createElement("div");

tooltipElement.className =
  "px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg";

tooltipElement.style.background = P.dark;
tooltipElement.style.color = "#ffffff";
tooltipElement.style.whiteSpace = "nowrap";
tooltipElement.style.pointerEvents = "none";
tooltipElement.style.display = "none";

const tooltipOverlay = new Overlay({
  element: tooltipElement,
  offset: [0, -12],
  positioning: "bottom-center",
  stopEvent: false,
});

map.addOverlay(tooltipOverlay);


// ─────────────────────────────────────────────
// HOVER EVENT
// ─────────────────────────────────────────────

map.on("pointermove", (event) => {
  const feature = map.forEachFeatureAtPixel(
    event.pixel,
    (feature) => feature,
    {
      hitTolerance: 6,
    }
  );

  if (feature && feature.get("planName")) {
    const coordinate = feature
      .getGeometry()
      .getCoordinates();

    tooltipElement.innerText = feature.get("planName");

    tooltipElement.style.display = "block";

    tooltipOverlay.setPosition(coordinate);

    map.getTargetElement().style.cursor = "pointer";
  } else {
    tooltipElement.style.display = "none";

    tooltipOverlay.setPosition(undefined);

    map.getTargetElement().style.cursor = "";
  }
});

map.on("singleclick", (event) => {
  const feature = map.forEachFeatureAtPixel(
    event.pixel,
    (feature) => feature,
    {
      hitTolerance: 6,
    }
  );

  if (!feature) return;

  const planId = feature.get("planId");
  const isCompleted = feature.get("isCompleted");

  // Only completed plans are clickable
  if (!planId || !isCompleted) return;

  window.open(
    `/landscape-stewardship/plan-view?id=${planId}` +
      `&stateId=${returnContext?.stateId ?? ""}` +
      `&stateName=${encodeURIComponent(returnContext?.stateName ?? "")}` +
      `&districtId=${returnContext?.districtId ?? ""}` +
      `&districtName=${encodeURIComponent(
        returnContext?.districtName ?? ""
      )}`,
    "_blank"
  );
});


const extent = villageLayer.getSource().getExtent();

  if (extent && !extent.some(isNaN)) {
    map.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      maxZoom: 14,
      duration: 500,
    });
  }
}, [stewardData?.plans]);

  useEffect(() => {
if (!organization || !facilitator) return;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const url = `${process.env.REACT_APP_API_URL}/organizations/${organization}/watershed/plans/steward-details/?facilitator_name=${encodeURIComponent(
  facilitator.replace(/-/g, " ")
)}`;
        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "420",
            "X-API-Key": process.env.REACT_APP_API_KEY,
          },
        });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = await res.json();
        setStewardData(data);
      } catch (err) {
        console.error("Steward detail fetch failed:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    load();
}, [organization, facilitator]);

useEffect(() => {
  if (!stewardData?.plans?.length) {
    return;
  }

  const fetchPlanMetadata = async () => {
    try {
      const tehsilId = stewardData.working_locations?.tehsils?.[0]?.id;
      const planIds = stewardData.plans.map((plan) => plan.id);

      if (!tehsilId) {
        console.error("Tehsil ID not found");
        return;
      }

      const url = `${process.env.REACT_APP_API_URL}/watershed/plans/?tehsil=${tehsilId}&filter_test_plan=true`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "420",
          "X-API-Key": process.env.REACT_APP_API_KEY,
        },
      });
      if (!res.ok) {
        throw new Error(`Plans fetch error ${res.status}`);
      }

      const data = await res.json();
      const results = data.filter((plan) =>
        planIds.includes(plan.id)
      );
      setPlanMetadata(results);
    } catch (err) {
      console.error("Error fetching plan metadata:", err);
      setPlanMetadata([]);
    }
  };

  fetchPlanMetadata();
}, [stewardData]);

  // ── LOADING ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: `${P.base} transparent transparent transparent` }} />
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────
  if (error || !stewardData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm font-medium" style={{ color: P.muted }}>
          Failed to load steward details.
        </p>
        <button onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: P.base }}>
          Close
        </button>
      </div>
    );
  }

  const locations = stewardData.working_locations ?? {};
  const states    = (locations.states    ?? []).map(s => s.name).join(", ");
  const districts = (locations.districts ?? []).map(d => d.name).join(", ");
  const tehsils   = (locations.tehsils   ?? []).map(t => t.name).join(", ");
  const projects  = (stewardData.projects ?? []).map(p => p.name).join(", ");
  
  
  const openPlan = async (plan) => {
};

const planYears = [
  ...new Set(
    planMetadata
      .map((plan) => {
        if (!plan.created_at) return null;

        return new Date(plan.created_at).getFullYear();
      })
      .filter(Boolean)
  ),
].sort((a, b) => b - a);

  return (
    <div className="flex flex-col h-full">
      <LandingNavbar />

{/* ───────────────────── PURPLE HEADER ───────────────────── */}
<div
  className="relative z-10 h-28"
  style={{
    background: `linear-gradient(135deg, ${P.base}, ${P.dark})`,
  }}
>
  {/* HOME BUTTON */}
  <button
    onClick={() => {
      navigate(
        `/landscape-stewardship?state=${returnContext?.stateId}&stateName=${encodeURIComponent(
          returnContext?.stateName || ""
        )}&district=${returnContext?.districtId}&districtName=${encodeURIComponent(
          returnContext?.districtName || ""
        )}&view=steward`
      );
    }}
    className="absolute left-6 top-6 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
    style={{
      background: "rgba(255,255,255,0.95)",
      color: P.dark,
      boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
    }}
    title="Home"
  >
    <Home size={20} strokeWidth={2.5} />
  </button>
</div>

{/* ───────────────────── BODY ───────────────────── */}
<div className="flex-1 overflow-visible p-6">

  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">

    {/* =====================================================
        LEFT SIDE — BASIC STEWARD DETAILS
    ====================================================== */}
    <div className="lg:col-span-2 flex flex-col gap-4">
{/* PROFILE CARD */}
<div
  className="relative z-20 bg-white rounded-2xl p-5 pt-20 shadow-sm h-full flex flex-col"
  style={{ border: `1px solid ${P.border}` }}
>

  {/* PROFILE PHOTO */}
  <div
    className="absolute left-1/2 -translate-x-1/2 -top-14"
  >
    <div
      className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center"
      style={{
        background: P.light,
        border: "5px solid white",
        boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
      }}
    >
      <img
        src={StewardIcon}
        alt="Steward"
        className="w-full h-full object-cover"
      />
    </div>
  </div>

  {/* NAME */}
  <div className="text-center mb-5 p-6">

    <h1
      className="text-xl font-bold"
      style={{ color: P.text }}
    >
      {stewardData.facilitator_name
        ?.split(" ")
        .map(
          (word) =>
            word.charAt(0).toUpperCase() +
            word.slice(1).toLowerCase()
        )
        .join(" ")}
    </h1>

    {/* GENDER + AGE */}
    <div className="flex items-center justify-center gap-3 mt-1">

      <span
        className="text-sm font-medium"
        style={{ color: P.muted }}
      >
        {stewardData.gender || "N/A"}
      </span>

      <span
        className="w-1 h-1 rounded-full"
        style={{ background: P.muted }}
      />

      <span
        className="text-sm font-medium"
        style={{ color: P.muted }}
      >
        {stewardData.age ? `${stewardData.age} yrs old` : "N/A"}
      </span>

    </div>

  </div>
        {/* OTHER DETAILS */}
        {/* <InfoRow
          label="Years of Experience"
          value={returnContext?.districtName || "N/A"}
        /> */}
        <div className="flex flex-col gap-2.5 mb-4 p-10 rounded-xl" style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
           <InfoRow
          label="Gram Panchayat"
          value={returnContext?.districtName || "N/A"}
        />

        <InfoRow
          label="No. of Villages Covered"
          value={stewardData.statistics?.total_plans ?? 0}
        />

        <InfoRow
          label="Organization"
          value={stewardData.organization?.name}
        />

        <InfoRow
          label="Education"
          value={stewardData.education_qualification}
        />
        </div>
     
</div>


      {/* YOUTUBE LINKS — PLACEHOLDER FOR NEXT STEP */}
      {/* <div
        className="bg-white rounded-2xl p-4 shadow-sm"
        style={{ border: `1px solid ${P.border}` }}
      >
      <p
        className="text-base font-bold uppercase tracking-wider mb-2"
        style={{ color: P.text }}
      >
        Story Links
      </p>
       <div className="bg-white rounded-2xl p-5 shadow-sm"
        style={{ border: `1px solid ${P.border}` }}>
          <a
            href="https://www.youtube.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm hover:underline"
            style={{ color: P.base }}
          >
            • Stewardship Story
          </a>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm mt-3"
        style={{ border: `1px solid ${P.border}` }}>
          <a
            href="https://www.youtube.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm hover:underline"
            style={{ color: P.base }}
          >
            • NRM Planning with Commons Connect
          </a>
        </div>
      </div> */}

    </div>


    {/* =====================================================
        RIGHT SIDE — MAP
    ====================================================== */}
    <div className="lg:col-span-3 h-full">

      <div
        className="bg-white rounded-2xl p-5 shadow-sm h-full flex flex-col"
        style={{ border: `1px solid ${P.border}` }}
      >

        <div className="flex items-center justify-between mb-4">

            {/* LEFT — STEWARDSHIP AREA */}
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: P.muted }}
            >
              Stewardship across {tehsils || "N/A"}
            </p>

            {/* RIGHT — YEAR */}
           <select
              className="px-3 py-1.5 rounded-lg text-xs font-semibold outline-none"
              style={{
                color: P.dark,
                border: `1px solid ${P.border}`,
                background: "#ffffff",
              }}
              defaultValue=""
            >
              <option value="" disabled>
                Year
              </option>

              {planYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-xl overflow-hidden w-full" style={{ height: "500px" }}>
            <MapSection
              title=""
              loadLayer={loadStewardVillages}
              loadBoundary={() => {}}
              districtNameSafe=""
              blockNameSafe=""
              plan={stewardData.plans?.[0] ?? null}
            />
          </div>
      </div>
    </div>
  </div>
</div>
</div>
  );
};

export default StewardDetailPage;