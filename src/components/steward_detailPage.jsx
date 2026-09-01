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
console.log("Loading steward villages on map:", plans);
  const validPlans = plans.filter(
    (p) =>
      p?.latitude &&
      p?.longitude &&
      !isNaN(parseFloat(p.latitude)) &&
      !isNaN(parseFloat(p.longitude))
  );
  if (validPlans.length === 0) return;
  console.log("Valid plans for map:", validPlans);

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
     console.log("organization:", organization);
  console.log("facilitator:", facilitator);

if (!organization || !facilitator) return;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const url = `${process.env.REACT_APP_API_URL}/organizations/${organization}/watershed/plans/steward-details/?facilitator_name=${encodeURIComponent(
  facilitator.replace(/-/g, " ")
)}`;
        console.log("Request URL:", url);
        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "420",
            "X-API-Key": process.env.REACT_APP_API_KEY,
          },
        });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        console.log("Status:", res.status);
console.log("Response OK:", res.ok);
        const data = await res.json();
        console.log("Steward API Response:", data);

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





  return (
    <div className="flex flex-col h-full">
      <LandingNavbar />

{/* ───────────────────── STEWARD HEADER ───────────────────── */}
<div
  className="relative z-10"
  style={{
    background: `linear-gradient(135deg, ${P.base}, ${P.dark})`,
  }}
>
  <div className="max-w-[1800px] mx-auto px-6 py-12">

    {/* HEADER CONTENT */}
    <div className="flex items-center gap-4">

      {/* BACK BUTTON */}
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
        className="
          flex-shrink-0
          inline-flex
          items-center
          gap-1
          px-3
          py-1.5
          rounded-lg
          text-[10px]
          font-semibold
          transition-all
          duration-200
          active:scale-95
        "
        style={{
          background: "rgba(255,255,255,0.96)",
          color: P.dark,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        ← Back
      </button>


      {/* STEWARD DETAILS */}
      <div className="min-w-0">

        {/* NAME + PREVIEW */}
        <div className="flex items-center gap-2">

          <h1 className="text-lg font-bold text-white leading-tight">
            {stewardData.facilitator_name
              ?.split(" ")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() +
                  word.slice(1).toLowerCase()
              )
              .join(" ")}
          </h1>

        </div>


        {/* SUPPORT DISTRICT */}
        <p
          className="text-[10px] mt-0.5"
          style={{
            color: "rgba(255,255,255,0.72)",
          }}
        >
          Support District · {returnContext?.districtName || "—"}
        </p>

      </div>

    </div>

  </div>
</div>


{/* ───────────────────── BODY ───────────────────── */}
<div className="flex-1 overflow-visible p-6 flex flex-col gap-6">

  {/* ───────────────────── STATS ROW ───────────────────── */}
  <div className="z-20 -mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* TOTAL VILLAGES */}
    <StatPill
      label="Total Villages Covered"
      value={stewardData.statistics?.total_plans ?? 0}
      accent={P.base}
    />

    {/* PLANNING COMPLETED */}
    <StatPill
      label="Planning Completed For"
      value={
        stewardData.plans?.filter((p) => p.is_completed).length ?? 0
      }
      accent={P.dark}
    />

    {/* OVERALL PLANNING PROGRESS */}
    <div
      className="rounded-xl bg-white px-4 py-3"
      style={{
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-2">

        <p
          className="text-[8px] font-bold uppercase tracking-wider"
          style={{
            color: P.dark,
          }}
        >
          Overall Planning Progress
        </p>

      </div>

      <div className="flex items-center gap-2">

        <span
          className="text-lg font-bold"
          style={{
            color: P.dark,
          }}
        >
          {stewardData.plans?.filter((p) => p.is_completed).length ?? 0}
        </span>

        <span className="text-[9px] text-slate-400">
          of {stewardData.statistics?.total_plans ?? 0} villages
        </span>

      </div>

      {/* Progress Bar */}
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">

        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${
              stewardData.statistics?.total_plans
                ? Math.min(
                    100,
                    ((stewardData.plans?.filter(
                      (p) => p.is_completed
                    ).length ?? 0) /
                      stewardData.statistics.total_plans) *
                      100
                  )
                : 0
            }%`,
            background: P.base,
          }}
        />

      </div>

    </div>

  </div>


  {/* ───────────────────── EXISTING CONTENT ───────────────────── */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* PERSONAL DETAILS */}
        <div className="bg-white rounded-2xl p-5 shadow-sm"
          style={{ border: `1px solid ${P.border}` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: P.muted }}>
            Personal Details
          </p>
          <InfoRow label="Gender"            value={stewardData.gender}                    />
          <InfoRow label="Age"               value={stewardData.age}                       />
          <InfoRow label="Education"         value={stewardData.education_qualification}   />
          <InfoRow label="Organization"      value={stewardData.organization?.name}        />
          <InfoRow label="Projects"          value={projects}                              />
        </div>

        {/* WORKING LOCATIONS */}
        <div className="bg-white rounded-2xl p-5 shadow-sm"
          style={{ border: `1px solid ${P.border}` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: P.muted }}>
            Working Locations
          </p>
          <InfoRow label="States"    value={states    || "N/A"} />
          <InfoRow label="Districts" value={districts || "N/A"} />
          <InfoRow label="Tehsils"   value={tehsils   || "N/A"} />
        </div>

        </div>


{/* ───────────────────── VILLAGES MAP OVERVIEW ───────────────────── */}
<div
  className="bg-white rounded-2xl p-5 shadow-sm"
  style={{ border: `1px solid ${P.border}` }}
>
  <div className="flex items-center justify-between mb-4">
    <p
      className="text-xs font-semibold uppercase tracking-widest"
      style={{ color: P.muted }}
    >
      Villages Map Overview
    </p>

    {/* <div className="flex items-center gap-2 flex-wrap">
      {(stewardData.plans ?? []).map((p, i) => (
        <span
          key={p.id ?? i}
          className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
          style={{
            background: P.light,
            color: P.base,
            border: `1px solid ${P.border}`,
          }}
        >
          {p.village_name || p.plan || "Village"}
        </span>
      ))}
    </div> */}
  </div>

  <div className="w-full">
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

        {/* PLANS */}
        <div className="bg-white rounded-2xl p-5 shadow-sm"
          style={{ border: `1px solid ${P.border}` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: P.muted }}>
            Plans ({stewardData.plans?.length ?? 0})
          </p>

          <div className="flex flex-col gap-2">
            {(stewardData.plans ?? []).length === 0 ? (
              <p className="text-sm" style={{ color: P.muted }}>No plans found.</p>
            ) : (
              stewardData.plans.map((p, i) => (
                <div key={p.id ?? i}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: P.lighter, border: `1px solid ${P.border}` }}>
              <p
                onClick={() => {
                  if (!p.is_completed) return;
                  window.open(
                    `/landscape-stewardship/plan-view?id=${p.id}` +
                      `&stateId=${returnContext?.stateId ?? ""}` +
                      `&stateName=${encodeURIComponent(returnContext?.stateName ?? "")}` +
                      `&districtId=${returnContext?.districtId ?? ""}` +
                      `&districtName=${encodeURIComponent(returnContext?.districtName ?? "")}`,
                    "_blank"
                  );
                }}
             className={`text-sm font-medium truncate ${
            p.is_completed
              ? "cursor-pointer hover:underline"
              : "cursor-not-allowed"
          }`}
          style={{
            color: p.is_completed ? P.base : "#9CA3AF", // grey for incomplete
            textDecoration: p.is_completed ? "underline" : "none",
            opacity: p.is_completed ? 1 : 0.65,
          }}

              >
                {p.name}
              </p>
                  <span
                    className="text-xs font-semibold ml-3 flex-shrink-0 px-2 py-1 rounded-full"
                    style={{
                      background: p.is_completed
                        ? "oklch(93% 0.08 145)"
                        : "oklch(95% 0.05 60)",
                      color: p.is_completed
                        ? "oklch(38% 0.14 145)"
                        : "oklch(45% 0.12 60)",
                    }}
                  >
                    {p.is_completed ? "✓ Completed" : "⏳ In Progress"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StewardDetailPage;