import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LandingNavbar from "../components/landing_navbar.jsx";
import MapSection from "../components/planMapSection.jsx";
import getVectorLayers from "../actions/getVectorLayers";
import getImageLayer from "../actions/getImageLayers";
import { Fill, Stroke, Style } from "ol/style";

const P = {
  base:    "oklch(60% 0.2 301.924)",
  light:   "oklch(95% 0.05 301.924)",
  lighter: "oklch(98% 0.02 301.924)",
  dark:    "oklch(45% 0.2  301.924)",
  text:    "oklch(28% 0.18 301.924)",
  border:  "oklch(90% 0.06 301.924)",
  muted:   "oklch(65% 0.12 301.924)",
};

const TABS = [
  { id: "settlement",  label: "Settlement"  },
  { id: "wells",       label: "Wells"       },
  { id: "waterbodies", label: "Waterbodies" },
  { id: "works",       label: "Works"       },
  { id: "livelihood",  label: "Livelihood"  },
];

// ── API HELPERS ───────────────────────────────────────────

const apiFetch = (url) =>
  fetch(url, {
    headers: {
      "X-API-Key": process.env.REACT_APP_API_KEY,
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "420",
    },
  }).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const fetchSummary     = (id) => apiFetch(`${process.env.REACT_APP_API_URL}/dpr_data/${id}/summary/`);
const fetchTeamDetails = (id) => apiFetch(`${process.env.REACT_APP_API_URL}/dpr_data/${id}/team-details/`);
const fetchVillageBrief = (id) => apiFetch(`${process.env.REACT_APP_API_URL}/dpr_data/${id}/village-brief/`);

// ── SHARED COMPONENTS ─────────────────────────────────────

const StatusBadge = ({ label, active }) => (
  <div
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
    style={{
      background: active ? "oklch(93% 0.08 145)" : "rgba(255,255,255,0.15)",
      color:      active ? "oklch(38% 0.14 145)" : "rgba(255,255,255,0.85)",
      border:     `1px solid ${active ? "oklch(82% 0.1 145)" : "rgba(255,255,255,0.25)"}`,
    }}
  >
    <span>{active ? "✓" : "○"}</span>
    {label}
  </div>
);

const InfoChip = ({ label, value }) => (
  <div
    className="flex flex-col gap-1 p-3 rounded-xl"
    style={{ background: P.lighter, border: `1px solid ${P.border}` }}
  >
    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: P.muted }}>
      {label}
    </p>
    <p className="text-sm font-semibold" style={{ color: P.text }}>
      {value || "--"}
    </p>
  </div>
);

const SummarySkeleton = () => (
  <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
    {Array.from({ length: 7 }).map((_, i) => (
      <div key={i} className="h-16 rounded-xl" style={{ background: P.light }} />
    ))}
  </div>
);

// ── PAGE ──────────────────────────────────────────────────

const PlanViewPage = () => {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const plan      = state?.plan;
  const returnContext = state?.returnContext;

  const [activeTab,    setActiveTab]    = useState("settlement");
  const [summary,      setSummary]      = useState(null);
  const [teamDetails,  setTeamDetails]  = useState(null);
  const [villageBrief, setVillageBrief] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError,   setSummaryError]   = useState(false);

  const districtNameSafe = plan?.district || "";
  const blockNameSafe    = plan?.block    || "";

  // ── FETCH NON-PAGINATED DATA ────────────────────────────
  useEffect(() => {
    if (!plan?.id) return;

    const load = async () => {
      setSummaryLoading(true);
      setSummaryError(false);
      try {
        const [s, t, v] = await Promise.all([
          fetchSummary(plan.id),
          fetchTeamDetails(plan.id),
          fetchVillageBrief(plan.id),
        ]);
        setSummary(s);
        setTeamDetails(t);
        setVillageBrief(v);
      } catch (err) {
        console.error("Failed to load plan data:", err);
        setSummaryError(true);
      } finally {
        setSummaryLoading(false);
      }
    };

    load();
  }, [plan?.id]);

  // ── MAP LOAD FUNCTIONS ──────────────────────────────────
  const loadLULC = async (map) => {
    const lulcLayer = await getImageLayer(
      "LULC_level_3",
      `LULC_24_25_${districtNameSafe}_${blockNameSafe}_level_3`,
      true,
      "lulc_level_3_style"
    );
    lulcLayer.set("layerName", "lulcLayer");
    map.addLayer(lulcLayer);
  };

  const loadAdminBoundary = async (map) => {
    await loadLULC(map);
    const layer = await getVectorLayers(
      "panchayat_boundaries",
      `${districtNameSafe}_${blockNameSafe}`,
      true
    );
    layer.setStyle(
      new Style({
        stroke: new Stroke({ color: "#000", width: 2 }),
        fill:   new Fill({ color: "rgba(0,0,0,0)" }),
      })
    );
    map.addLayer(layer);
    layer.getSource().once("change", () => {
      if (layer.getSource().getState() === "ready") {
        const view = map.getView();
        const extent = layer.getSource().getExtent();
        view.fit(extent, { padding: [30, 30, 30, 30], duration: 400 });
        setTimeout(() => view.animate({ zoom: view.getZoom() + 1, duration: 300 }), 450);
      }
    });
  };

  const loadNothing = async () => {};

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: P.lighter }}>
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: P.text }}>No plan data found</p>
          <button
            onClick={() => navigate("/CCUsagePage", { state: { returnContext } })}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: P.base }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: P.lighter }}>
      <LandingNavbar />

      {/* ── HEADER ───────────────────────────────────────── */}
      <div
        className="sticky top-0 z-50 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${P.base}, ${P.dark})` }}
      >
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between gap-4">

          {/* Back button + title */}
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => navigate(-1)}
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
                Resource & Demand Map Report
              </p>
              <h1 className="text-lg font-bold text-white truncate">{plan.plan}</h1>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex-shrink-0 flex items-center gap-2 flex-wrap justify-end">
            <StatusBadge label="Completed"     active={plan.is_completed}     />
            <StatusBadge label="DPR Generated" active={plan.is_dpr_generated} />
            <StatusBadge label="DPR Reviewed"  active={plan.is_dpr_reviewed}  />
            <StatusBadge label="DPR Approved"  active={plan.is_dpr_approved}  />
          </div>

        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6 flex flex-col gap-6">

        {/* ── VILLAGE SUMMARY + MAP ─────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Summary card */}
          <div
            className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5 w-full lg:w-[40%]"
            style={{ border: `1px solid ${P.border}` }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: P.muted }}>
              Village Summary
            </p>

            {summaryLoading ? (
              <SummarySkeleton />
            ) : summaryError ? (
              <p className="text-sm" style={{ color: P.muted }}>Failed to load summary.</p>
            ) : (
              <>
                {/* Location info */}
                <div className="grid grid-cols-2 gap-3">
                  <InfoChip label="Village"        value={villageBrief?.village_name}    />
                  <InfoChip label="Gram Panchayat" value={villageBrief?.gram_panchayat}  />
                  <InfoChip label="Tehsil"         value={villageBrief?.tehsil}          />
                  <InfoChip label="District"       value={villageBrief?.district}        />
                  <InfoChip label="State"          value={villageBrief?.state}           />
                  <InfoChip label="Settlements"    value={villageBrief?.total_settlements} />
                </div>

                {/* Divider */}
                <div className="w-full h-px" style={{ background: P.border }} />

                {/* Team info */}
                <div className="grid grid-cols-2 gap-3">
                  <InfoChip label="Organization" value={teamDetails?.organization} />
                  <InfoChip label="Project"      value={teamDetails?.project}      />
                  <InfoChip label="Facilitator"  value={teamDetails?.facilitator}  />
                  <InfoChip label="Process"      value={teamDetails?.process}      />
                </div>

                {/* Divider */}
                <div className="w-full h-px" style={{ background: P.border }} />

                {/* Section counts from summary */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: P.muted }}>
                    Data Sections
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Settlements", value: summary?.sections?.settlements    },
                      { label: "Crops",       value: summary?.sections?.crops          },
                      { label: "Wells",       value: summary?.sections?.wells          },
                      { label: "Waterbodies", value: summary?.sections?.waterbodies    },
                      { label: "NRM Works",   value:
                          (summary?.sections?.nrm_works?.recharge ?? 0) +
                          (summary?.sections?.nrm_works?.irrigation ?? 0)              },
                      { label: "Livelihood",  value: summary?.sections?.livelihood     },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="text-center rounded-xl p-2"
                        style={{ background: P.lighter, border: `1px solid ${P.border}` }}
                      >
                        <p className="text-lg font-bold" style={{ color: P.base }}>
                          {value ?? "--"}
                        </p>
                        <p className="text-xs" style={{ color: P.muted }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Admin boundary map */}
          <div className="w-full lg:w-[60%]">
            <MapSection
              title="Village Overview"
              loadLayer={loadAdminBoundary}
              loadBoundary={loadNothing}
              districtNameSafe={districtNameSafe}
              blockNameSafe={blockNameSafe}
              plan={plan}
            />
          </div>

        </div>

        {/* ── TAB BAR ──────────────────────────────────── */}
        <div
          className="bg-white rounded-2xl shadow-sm p-1.5 flex gap-1"
          style={{ border: `1px solid ${P.border}` }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200"
              style={
                activeTab === tab.id
                  ? { background: P.base, color: "#fff", boxShadow: "0 2px 8px rgba(139,63,230,0.25)" }
                  : { color: P.muted }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT (placeholder) ────────────────── */}
        <div
          className="bg-white rounded-2xl shadow-sm flex items-center justify-center"
          style={{ border: `1px solid ${P.border}`, minHeight: "400px" }}
        >
          <p className="text-sm font-medium" style={{ color: P.muted }}>
            {TABS.find(t => t.id === activeTab)?.label} content coming in next step
          </p>
        </div>

      </div>
    </div>
  );
};

export default PlanViewPage;