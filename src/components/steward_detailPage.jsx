import React, { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!plan?.organization || !plan?.facilitator_name) return;

    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const url = `${process.env.REACT_APP_API_URL}/organizations/${plan.organization}/watershed/plans/steward-details/?facilitator_name=${encodeURIComponent(plan.facilitator_name)}`;
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
  }, [plan]);

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

  return (
    <div className="flex flex-col h-full">

      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 rounded-t-2xl p-6 relative"
        style={{ background: `linear-gradient(135deg, ${P.base}, ${P.dark})` }}>

        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center
                     justify-center font-bold transition-all hover:bg-white/20"
          style={{ color: "white" }}>
          ✕
        </button>

        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center
                          text-2xl font-bold text-white flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
            {stewardData.first_name?.[0] ?? stewardData.facilitator_name?.[0] ?? "S"}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: "oklch(88% 0.08 301.924)" }}>
              Landscape Steward
            </p>
            <h2 className="text-xl font-bold text-white truncate">
              {stewardData.facilitator_name}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "oklch(88% 0.08 301.924)" }}>
              {stewardData.organization?.name ?? "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

        {/* STATS ROW */}
        <div className="grid grid-cols-2 gap-4">
          <StatPill
            label="Total Villages"
            value={stewardData.statistics?.total_plans}
            accent={P.base}
          />
          <StatPill
            label="DPRs Completed"
            value={stewardData.statistics?.dpr_completed}
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
                  <p className="text-sm font-medium truncate" style={{ color: P.text }}>
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