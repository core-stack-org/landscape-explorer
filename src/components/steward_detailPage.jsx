import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LandingNavbar from "./landing_navbar";
import { useNavigate, useLocation } from "react-router-dom";
import { useSearchParams } from "react-router-dom";

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
  console.log(plan);
};

  return (
    <div className="flex flex-col h-full">
      <LandingNavbar />
      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="sticky top-0 z-50 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${P.base}, ${P.dark})` }}>
    <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
  <div className="flex items-center gap-4 min-w-0">

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
      className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold
                 text-sm transition-all duration-200 active:scale-95"
      style={{
        background: "rgba(255,255,255,0.95)",
        color: P.dark,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      }}
    >
      ← Back
    </button>

    <div className="min-w-0">
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "oklch(88% 0.08 301.924)" }}
      >
        Landscape Steward
      </p>

      <h1 className="text-lg font-bold text-white truncate">
        {stewardData.facilitator_name}
      </h1>
    </div>

  </div>
</div>
      </div>

      {/* ── BODY ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

        {/* STATS ROW */}
        <div className="grid grid-cols-2 gap-4">
          <StatPill
            label="Total Villages Covered"
            value={stewardData.statistics?.total_plans}
            accent={P.base}
          />
          <StatPill
            label="Planning Completed For"
            value={stewardData.plans?.filter(p => p.is_completed).length ?? 0}
            accent={P.dark}
          />
        </div>

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
                  window.open(
                    `/landscape-stewardship/plan-view?id=${p.id}` +
                      `&stateId=${returnContext?.stateId ?? ""}` +
                      `&stateName=${encodeURIComponent(returnContext?.stateName ?? "")}` +
                      `&districtId=${returnContext?.districtId ?? ""}` +
                      `&districtName=${encodeURIComponent(returnContext?.districtName ?? "")}`,
                    "_blank"
                  );
                }}
                className="text-sm font-medium truncate cursor-pointer hover:underline"
                style={{ color: P.base }}
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