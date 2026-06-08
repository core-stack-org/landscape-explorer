import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import LandingNavbar from "../components/landing_navbar.jsx";
import MapSection from "../components/planMapSection.jsx";
import getVectorLayers from "../actions/getVectorLayers";
import { Fill, Stroke, Style, Icon, Text } from "ol/style";
import Feature from "ol/Feature";
import Polygon from "ol/geom/Polygon";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import SettlementIcon from "../assets/settlement_icon.svg";
import WellIcon from "../assets/well_proposed.svg";
import WaterStructureIcon from "../assets/waterbodies_proposed.svg";
import RechargeIcon from "../assets/recharge_icon.svg";
import IrrigationIcon from "../assets/irrigation_icon.svg";
import LivelihoodIcon from "../assets/livelihood_proposed.svg";

const P = {
  base: "oklch(60% 0.2 301.924)",
  light: "oklch(95% 0.05 301.924)",
  lighter: "oklch(98% 0.02 301.924)",
  dark: "oklch(45% 0.2  301.924)",
  text: "oklch(28% 0.18 301.924)",
  border: "oklch(90% 0.06 301.924)",
  muted: "oklch(65% 0.12 301.924)",
};

const TABS = [
  { id: "settlement", label: "Settlement" },
  { id: "wells", label: "Wells" },
  { id: "waterbodies", label: "Waterbodies" },
  { id: "works", label: "NRM Work Demands" },
  { id: "livelihood", label: "Livelihood Demands" },
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

const fetchSummary = (id) =>
  apiFetch(`${process.env.REACT_APP_API_URL}/dpr_data/${id}/summary/`);
const fetchTeamDetails = (id) =>
  apiFetch(`${process.env.REACT_APP_API_URL}/dpr_data/${id}/team-details/`);
const fetchVillageBrief = (id) =>
  apiFetch(`${process.env.REACT_APP_API_URL}/dpr_data/${id}/village-brief/`);

const fetchAllPages = async (url) => {
  let results = [];
  let nextUrl = url;
  while (nextUrl) {
    const data = await apiFetch(nextUrl);
    if (Array.isArray(data)) {
      results = data;
      break;
    }
    results = [...results, ...(data.results ?? [])];
    nextUrl = data.next ?? null;
  }
  return results;
};

const fetchSettlements = (id) =>
  fetchAllPages(`${process.env.REACT_APP_API_URL}/dpr_data/${id}/settlements/`);
const fetchCrops = (id) =>
  fetchAllPages(`${process.env.REACT_APP_API_URL}/dpr_data/${id}/crops/`);
const fetchLivestock = (id) =>
  fetchAllPages(`${process.env.REACT_APP_API_URL}/dpr_data/${id}/livestock/`);
const fetchWells = (id) =>
  fetchAllPages(`${process.env.REACT_APP_API_URL}/dpr_data/${id}/wells/`);
const fetchWaterbodies = (id) =>
  fetchAllPages(`${process.env.REACT_APP_API_URL}/dpr_data/${id}/waterbodies/`);
const fetchNrmWorks = (id) =>
  fetchAllPages(`${process.env.REACT_APP_API_URL}/dpr_data/${id}/nrm-works/`);
const fetchMaintenance = (id, type) =>
  fetchAllPages(
    `${process.env.REACT_APP_API_URL}/dpr_data/${id}/maintenance/?type=${type}`,
  );
const fetchLivelihood = (id) =>
  fetchAllPages(`${process.env.REACT_APP_API_URL}/dpr_data/${id}/livelihood/`);

// ── SHARED COMPONENTS ─────────────────────────────────────

const toTitleCase = (str) => {
  if (!str) return str;
  return str.replace(
    /\w\S*/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
};

const transformName = (name) => {
  return name
    .replace(/[().]/g, "")
    .replace(/[-\s]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
};

const formatUnderscoreText = (text) => {
  if (!text) return "--";
  // If no underscores, it's plain text — return as-is without splitting
  if (!text.includes("_")) return text.trim();
  // Otherwise treat space-separated tokens where each token uses underscores for internal spaces
  return text
    .split(" ")
    .map((item) => item.replace(/_/g, " ").trim())
    .filter(Boolean)
    .join(", ");
};

// ── CROP FORMATTER ────────────────────────────────────────
// - No name or "NA" → "Not Filled"
// - Name present but area is 0/null → "CropName (Area not Provided)"
// - Name + area → "CropName (X ac)"
const formatCrop = (cropName, acres) => {
  const nameEmpty = !cropName || cropName.trim().toLowerCase() === "na";
  const areaEmpty = !acres || Number(acres) === 0;

  if (nameEmpty) return "Not Filled";
  if (areaEmpty) return `${cropName} (Area not Provided)`;
  return `${cropName} (${acres} ac)`;
};

const StatusBadge = ({ label, active }) => (
  <div
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
    style={{
      background: active ? "oklch(93% 0.08 145)" : "rgba(255,255,255,0.15)",
      color: active ? "oklch(38% 0.14 145)" : "rgba(255,255,255,0.85)",
      border: `1px solid ${active ? "oklch(82% 0.1 145)" : "rgba(255,255,255,0.25)"}`,
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
    <p
      className="text-xs font-semibold uppercase tracking-widest"
      style={{ color: P.muted }}
    >
      {label}
    </p>
    <p className="text-sm font-semibold" style={{ color: P.text }}>
      {value ?? "--"}
    </p>
  </div>
);

const SummarySkeleton = () => (
  <div className="animate-pulse grid grid-cols-2 gap-3">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="h-16 rounded-xl"
        style={{ background: P.light }}
      />
    ))}
  </div>
);

const TabSkeleton = () => (
  <div className="animate-pulse flex flex-col gap-4">
    <div className="h-64 rounded-2xl" style={{ background: P.light }} />
    <div className="h-32 rounded-2xl" style={{ background: P.light }} />
    <div className="h-32 rounded-2xl" style={{ background: P.light }} />
  </div>
);

const DataRow = ({ label, value }) => (
  <div
    className="flex justify-between items-start py-2"
    style={{ borderBottom: `1px solid ${P.border}` }}
  >
    <p className="text-xs font-semibold w-2/5" style={{ color: P.muted }}>
      {label}
    </p>
    <p
      className="text-xs text-right w-3/5 font-medium"
      style={{ color: P.text }}
    >
      {value ?? "--"}
    </p>
  </div>
);

const SettlementCard = ({ s, livestockData, cropsData }) => {
  const livestock = livestockData?.find(
    (l) => l.settlement_name === s.settlement_name,
  );
  const crops = cropsData?.filter(
    (c) => c.beneficiary_settlement === s.settlement_name,
  );

  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm"
      style={{ border: `1px solid ${P.border}` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: P.light }}
        >
          <img src={SettlementIcon} alt="" className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: P.text }}>
            {s.settlement_name || "--"}
          </p>
          <p className="text-xs" style={{ color: P.muted }}>
            {s.settlement_type || "--"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6">
        {/* Left column — Demographics */}
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: P.muted }}
          >
            Demographics
          </p>
          <DataRow label="Households" value={s.number_of_households} />
          <DataRow
            label="Caste Detail"
            value={formatUnderscoreText(s.caste_group_detail)}
          />
          <DataRow label="SC" value={s.caste_counts?.sc} />
          <DataRow label="ST" value={s.caste_counts?.st} />
          <DataRow label="OBC" value={s.caste_counts?.obc} />
          <DataRow label="General" value={s.caste_counts?.general} />
          <DataRow label="Marginal Farmers" value={s.marginal_farmers} />

          {livestock && (
            <>
              <p
                className="text-xs font-semibold uppercase tracking-widest mt-4 mb-2"
                style={{ color: P.muted }}
              >
                Livestock
              </p>
              <DataRow label="Goats" value={livestock.goats} />
              <DataRow label="Sheep" value={livestock.sheep} />
              <DataRow label="Cattle" value={livestock.cattle} />
              <DataRow label="Piggery" value={livestock.piggery} />
              <DataRow label="Poultry" value={livestock.poultry} />
            </>
          )}
        </div>

        {/* Right column — MGNREGA */}
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: P.muted }}
          >
            MGNREGA
          </p>
          <DataRow label="Applied" value={s.nrega_job_applied} />
          <DataRow label="Job Cards" value={s.nrega_job_card} />
          <DataRow label="Work Days" value={s.nrega_work_days} />
          <DataRow
            label="Past Work"
            value={formatUnderscoreText(s.nrega_past_work)}
          />
          <DataRow
            label="Demand"
            value={formatUnderscoreText(s.nrega_demand)}
          />
          <DataRow
            label="Issues"
            value={formatUnderscoreText(s.nrega_issues)}
          />

          {crops?.length > 0 && (
            <>
              <p
                className="text-xs font-semibold uppercase tracking-widest mt-4 mb-2"
                style={{ color: P.muted }}
              >
                Crops
              </p>
              {crops.map((c, i) => (
                <div key={i} className="mb-3">
                  <DataRow label="Irrigation" value={c.irrigation_source} />
                  <DataRow label="Land Type" value={c.land_classification} />
                  <DataRow label="Intensity" value={c.cropping_intensity} />
                  <DataRow
                    label="Kharif"
                    value={formatCrop(c.kharif_crops, c.kharif_acres)}
                  />
                  <DataRow
                    label="Rabi"
                    value={formatCrop(c.rabi_crops, c.rabi_acres)}
                  />
                  <DataRow
                    label="Zaid"
                    value={formatCrop(c.zaid_crops, c.zaid_acres)}
                  />
                  {i < crops.length - 1 && (
                    <div
                      className="my-2 w-full h-px"
                      style={{ background: P.border }}
                    />
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const WellDetailCard = ({ w, onClose }) => (
  <div
    className="rounded-2xl p-5 shadow-sm relative"
    style={{ border: `1px solid ${P.border}`, background: P.lighter }}
  >
    <button
      onClick={onClose}
      className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center
                 justify-center text-xs transition-all hover:bg-white"
      style={{ color: P.muted }}
    >
      ✕
    </button>
    <p
      className="text-xs font-semibold uppercase tracking-widest mb-3"
      style={{ color: P.muted }}
    >
      Well Detail
    </p>
    <div className="grid grid-cols-2 gap-x-6">
      <div>
        <DataRow label="Settlement" value={w.beneficiary_settlement} />
        <DataRow label="Well Type" value={w.well_type} />
        <DataRow label="Owner" value={w.owner} />
        <DataRow label="Beneficiary" value={w.beneficiary_name} />
        <DataRow label="Father Name" value={w.beneficiary_father_name} />
        <DataRow label="Caste Uses" value={w.caste_uses} />
      </div>
      <div>
        <DataRow label="Water Availability" value={w.water_availability} />
        <DataRow label="Households" value={w.households_benefitted} />
        <DataRow label="Usage" value={w.well_usage} />
        <DataRow label="Needs Maintenance" value={w.need_maintenance} />
        <DataRow label="Repair Activities" value={w.repair_activities} />
        <DataRow
          label="Coordinates"
          value={
            w.latitude && w.longitude ? `${w.latitude}, ${w.longitude}` : "--"
          }
        />
      </div>
    </div>
  </div>
);

const WaterbodyDetailCard = ({ w, onClose }) => (
  <div
    className="rounded-2xl p-5 shadow-sm relative"
    style={{ border: `1px solid ${P.border}`, background: P.lighter }}
  >
    <button
      onClick={onClose}
      className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center
                 justify-center text-xs transition-all hover:bg-white"
      style={{ color: P.muted }}
    >
      ✕
    </button>
    <p
      className="text-xs font-semibold uppercase tracking-widest mb-3"
      style={{ color: P.muted }}
    >
      Waterbody Detail
    </p>
    <div className="grid grid-cols-2 gap-x-6">
      <div>
        <DataRow label="Settlement" value={w.beneficiary_settlement} />
        <DataRow label="Owner" value={w.owner} />
        <DataRow label="Beneficiary" value={w.beneficiary_name} />
        <DataRow label="Father Name" value={w.beneficiary_father_name} />
        <DataRow label="Managed By" value={w.who_manages} />
        <DataRow label="Caste Users" value={w.caste_who_uses} />
      </div>
      <div>
        <DataRow label="Structure Type" value={w.water_structure_type} />
        <DataRow label="Usage" value={w.usage} />
        <DataRow label="Households" value={w.households_benefitted} />
        <DataRow label="Needs Maintenance" value={w.need_maintenance} />
        <DataRow label="Repair Activities" value={w.repair_activities} />
        <DataRow
          label="Coordinates"
          value={
            w.latitude && w.longitude ? `${w.latitude}, ${w.longitude}` : "--"
          }
        />
      </div>
    </div>
  </div>
);

const NrmDetailCard = ({ n, onClose }) => (
  <div
    className="rounded-2xl p-5 shadow-sm relative"
    style={{ border: `1px solid ${P.border}`, background: P.lighter }}
  >
    <button
      onClick={onClose}
      className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center
                 justify-center text-xs transition-all hover:bg-white"
      style={{ color: P.muted }}
    >
      ✕
    </button>
    <p
      className="text-xs font-semibold uppercase tracking-widest mb-3"
      style={{ color: P.muted }}
    >
      {n.work_category ?? n.structure_type ?? "Detail"}
    </p>
    <div className="grid grid-cols-2 gap-x-6">
      <div>
        <DataRow label="Demand Type" value={n.demand_type || n.work_demand} />
        <DataRow
          label="Work Demand"
          value={n.work_demand || n.structure_type}
        />
        <DataRow label="Settlement" value={n.beneficiary_settlement} />
        <DataRow label="Beneficiary" value={n.beneficiary_name} />
      </div>
      <div>
        <DataRow label="Father Name" value={n.beneficiary_father_name} />
        <DataRow label="Gender" value={n.gender} />
        <DataRow label="Repair" value={n.repair_activities} />
        <DataRow
          label="Coordinates"
          value={
            n.latitude && n.longitude ? `${n.latitude}, ${n.longitude}` : "--"
          }
        />
      </div>
    </div>
  </div>
);

const LivelihoodDetailCard = ({ l, onClose }) => (
  <div
    className="rounded-2xl p-5 shadow-sm relative"
    style={{ border: `1px solid ${P.border}`, background: P.lighter }}
  >
    <button
      onClick={onClose}
      className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center
                 justify-center text-xs transition-all hover:bg-white"
      style={{ color: P.muted }}
    >
      ✕
    </button>
    <p
      className="text-xs font-semibold uppercase tracking-widest mb-3"
      style={{ color: P.muted }}
    >
      Livelihood Detail
    </p>
    <div className="grid grid-cols-2 gap-x-6">
      <div>
        <DataRow label="Work Type" value={l.livelihood_work} />
        <DataRow label="Demand Type" value={l.demand_type} />
        <DataRow label="Work Demand" value={l.work_demand} />
        <DataRow label="Settlement" value={l.beneficiary_settlement} />
      </div>
      <div>
        <DataRow label="Beneficiary" value={l.beneficiary_name} />
        <DataRow label="Father Name" value={l.beneficiary_father_name} />
        <DataRow label="Gender" value={l.gender} />
        <DataRow label="Total Acres" value={l.total_acres} />
        <DataRow
          label="Coordinates"
          value={
            l.latitude && l.longitude ? `${l.latitude}, ${l.longitude}` : "--"
          }
        />
      </div>
    </div>
  </div>
);

// ── PAGE ──────────────────────────────────────────────────

const PlanViewPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [plan, setPlan] = useState(state?.plan ?? null);
  const [deepLinkLoading, setDeepLinkLoading] = useState(
    !state?.plan && !!searchParams.get("id"),
  );

  // ── DEEP LINK FETCH ─────────────────────────────────────
  useEffect(() => {
    if (state?.plan || !searchParams.get("id")) return;
    const planId = searchParams.get("id");

    const load = async () => {
      setDeepLinkLoading(true);
      try {
        const [brief, team] = await Promise.all([
          apiFetch(
            `${process.env.REACT_APP_API_URL}/dpr_data/${planId}/village-brief/`,
          ),
          apiFetch(
            `${process.env.REACT_APP_API_URL}/dpr_data/${planId}/team-details/`,
          ),
        ]);
        setPlan({
          id: parseInt(planId),
          plan: brief?.village_name ?? `Plan ${planId}`,
          village_name: brief?.village_name,
          gram_panchayat: brief?.gram_panchayat,
          district: transformName(brief?.district ?? ""),
          block: transformName(brief?.tehsil ?? ""),
          organization_name: team?.organization,
          project_name: team?.project,
          facilitator_name: team?.facilitator,
          is_completed: searchParams.get("completed") === "true",
          is_dpr_reviewed: searchParams.get("dpr_reviewed") === "true",
          is_dpr_generated: searchParams.get("dpr_generated") === "true",
          is_dpr_approved: searchParams.get("dpr_approved") === "true",
        });
      } catch (err) {
        console.error("Deep link plan fetch failed:", err);
      } finally {
        setDeepLinkLoading(false);
      }
    };
    load();
  }, []);

  const [activeTab, setActiveTab] = useState("settlement");
  const [summary, setSummary] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [villageBrief, setVillageBrief] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);

  const [settlements, setSettlements] = useState([]);
  const [crops, setCrops] = useState([]);
  const [livestock, setLivestock] = useState([]);
  const [settlementLoading, setSettlementLoading] = useState(false);

  const [wells, setWells] = useState([]);
  const [wellsLoading, setWellsLoading] = useState(false);
  const [selectedWell, setSelectedWell] = useState(null);

  const [waterbodies, setWaterbodies] = useState([]);
  const [waterbodiesLoading, setWaterbodiesLoading] = useState(false);
  const [selectedWaterbody, setSelectedWaterbody] = useState(null);

  const [nrmWorks, setNrmWorks] = useState([]);
  const [maintenanceGW, setMaintenanceGW] = useState([]);
  const [maintenanceAgri, setMaintenanceAgri] = useState([]);
  const [maintenanceSWB, setMaintenanceSWB] = useState([]);
  const [maintenanceSWBRS, setMaintenanceSWBRS] = useState([]);
  const [nrmLoading, setNrmLoading] = useState(false);
  const [selectedNrmWork, setSelectedNrmWork] = useState(null);
  const [worksSubTab, setWorksSubTab] = useState("nrm");

  const [livelihood, setLivelihood] = useState([]);
  const [livelihoodLoading, setLivelihoodLoading] = useState(false);
  const [selectedLivelihood, setSelectedLivelihood] = useState(null);

  const districtNameSafe = plan?.district || "";
  const blockNameSafe = plan?.block || "";

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
        console.error("Summary load failed:", err);
        setSummaryError(true);
      } finally {
        setSummaryLoading(false);
      }
    };
    load();
  }, [plan?.id]);

  useEffect(() => {
    if (!plan?.id || activeTab !== "settlement") return;
    if (settlements.length > 0) return;
    const load = async () => {
      setSettlementLoading(true);
      try {
        const [s, c, l] = await Promise.all([
          fetchSettlements(plan.id),
          fetchCrops(plan.id),
          fetchLivestock(plan.id),
        ]);
        setSettlements(s);
        setCrops(c);
        setLivestock(l);
      } catch (err) {
        console.error("Settlement load failed:", err);
      } finally {
        setSettlementLoading(false);
      }
    };
    load();
  }, [plan?.id, activeTab]);

  useEffect(() => {
    if (!plan?.id || activeTab !== "wells") return;
    if (wells.length > 0) return;
    const load = async () => {
      setWellsLoading(true);
      try {
        setWells(await fetchWells(plan.id));
      } catch (err) {
        console.error("Wells load failed:", err);
      } finally {
        setWellsLoading(false);
      }
    };
    load();
  }, [plan?.id, activeTab]);

  useEffect(() => {
    if (!plan?.id || activeTab !== "waterbodies") return;
    if (waterbodies.length > 0) return;
    const load = async () => {
      setWaterbodiesLoading(true);
      try {
        setWaterbodies(await fetchWaterbodies(plan.id));
      } catch (err) {
        console.error("Waterbodies load failed:", err);
      } finally {
        setWaterbodiesLoading(false);
      }
    };
    load();
  }, [plan?.id, activeTab]);

  useEffect(() => {
    if (!plan?.id || activeTab !== "works") return;
    if (nrmWorks.length > 0) return;
    const load = async () => {
      setNrmLoading(true);
      try {
        const [nrm, gw, agri, swb, swbrs] = await Promise.all([
          fetchNrmWorks(plan.id),
          fetchMaintenance(plan.id, "gw"),
          fetchMaintenance(plan.id, "agri"),
          fetchMaintenance(plan.id, "swb"),
          fetchMaintenance(plan.id, "swb_rs"),
        ]);
        setNrmWorks(nrm);
        setMaintenanceGW(gw);
        setMaintenanceAgri(agri);
        setMaintenanceSWB(swb);
        setMaintenanceSWBRS(swbrs);
      } catch (err) {
        console.error("NRM load failed:", err);
      } finally {
        setNrmLoading(false);
      }
    };
    load();
  }, [plan?.id, activeTab]);

  useEffect(() => {
    if (!plan?.id || activeTab !== "livelihood") return;
    if (livelihood.length > 0) return;
    const load = async () => {
      setLivelihoodLoading(true);
      try {
        setLivelihood(await fetchLivelihood(plan.id));
      } catch (err) {
        console.error("Livelihood load failed:", err);
      } finally {
        setLivelihoodLoading(false);
      }
    };
    load();
  }, [plan?.id, activeTab]);

  // ── MAP LOAD FUNCTIONS ──────────────────────────────────
  const loadMWS = useCallback(
    async (map) => {
      const mwsLayer = await getVectorLayers(
        "mws_layers",
        `deltaG_well_depth_${districtNameSafe}_${blockNameSafe}`,
        true,
      );
      mwsLayer.setStyle(
        new Style({
          stroke: new Stroke({ color: "#000", width: 2 }),
          fill: new Fill({ color: "rgba(0,0,0,0)" }),
        }),
      );
      map.addLayer(mwsLayer);
      return mwsLayer;
    },
    [districtNameSafe, blockNameSafe],
  );

  const loadAdminBoundary = useCallback(
    async (map) => {
      const lon = plan?.longitude ? parseFloat(plan.longitude) : null;
      const lat = plan?.latitude ? parseFloat(plan.latitude) : null;

      const addBoundingBox = () => {
        // ~1km bounding box around the plan coordinates
        const delta = 0.009;
        const ring = [
          [lon - delta, lat - delta],
          [lon + delta, lat - delta],
          [lon + delta, lat + delta],
          [lon - delta, lat + delta],
          [lon - delta, lat - delta],
        ];
        const feature = new Feature({ geometry: new Polygon([ring]) });
        const layer = new VectorLayer({
          source: new VectorSource({ features: [feature] }),
          zIndex: 5,
        });
        layer.setStyle(
          new Style({
            stroke: new Stroke({ color: "rgba(255, 255, 0, 1)", width: 2 }),
            fill: new Fill({ color: "rgba(0,0,0,0.05)" }),
          }),
        );
        map.addLayer(layer);
        map.getView().fit(layer.getSource().getExtent(), {
          padding: [40, 40, 40, 40],
          duration: 500,
          maxZoom: 15,
        });
      };

      // No coordinates — nothing useful to show
      if (!lon || !lat) return;

      const baseUrl = `${process.env.REACT_APP_GEOSERVER_URL}panchayat_boundaries/ows`;
      const params = new URLSearchParams({
        service: "WFS",
        version: "1.0.0",
        request: "GetFeature",
        typeName: `panchayat_boundaries:${districtNameSafe}_${blockNameSafe}`,
        outputFormat: "application/json",
        CQL_FILTER: `INTERSECTS(the_geom, POINT(${lon} ${lat}))`,
      });

      const layer = await getVectorLayers(
        "panchayat_boundaries",
        `${districtNameSafe}_${blockNameSafe}`,
        true,
      );

      // Override the source with the spatially filtered request
      const filteredUrl = `${baseUrl}?${params.toString()}`;
      layer.getSource().setUrl(filteredUrl);
      layer.getSource().clear();
      layer.getSource().refresh();

      layer.setStyle(
        new Style({
          stroke: new Stroke({ color: "rgba(255, 255, 0, 1)", width: 2 }),
          fill: new Fill({ color: "rgba(0,0,0,0)" }),
        }),
      );
      map.addLayer(layer);

      layer.getSource().once("change", () => {
        if (layer.getSource().getState() !== "ready") return;
        const features = layer.getSource().getFeatures();
        if (features.length > 0) {
          // GeoServer returned a real boundary — fit to it
          map.getView().fit(layer.getSource().getExtent(), {
            padding: [40, 40, 40, 40],
            duration: 500,
            maxZoom: 15,
          });
        } else {
          // Empty geometry returned — remove the empty layer and draw a bounding box
          map.removeLayer(layer);
          addBoundingBox();
        }
      });
    },
    [districtNameSafe, blockNameSafe, plan?.latitude, plan?.longitude],
  );

  const makeResourceLoader = useCallback(
    (prefix, icon, nameField) => async (map) => {
      const mwsLayer = await loadMWS(map);
      const layer = await getVectorLayers(
        "resources",
        `${prefix}_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
        true,
      );
      layer.setStyle((feature) => {
        if (feature.getGeometry()?.getType() === "Point") {
          const name = feature.get(nameField) || "";
          return new Style({
            image: new Icon({ src: icon, scale: 1.1 }),
            text: new Text({
              text: name,
              font: "bold 11px sans-serif",
              offsetY: -20,
              textAlign: "center",
              textBaseline: "middle",
              fill: new Fill({ color: "oklch(28% 0.18 301.924)" }),
              stroke: new Stroke({ color: "#ffffff", width: 3 }),
            }),
          });
        }
        return null;
      });
      map.addLayer(layer);
      layer.getSource().once("change", () => {
        if (layer.getSource().getState() === "ready") {
          const features = layer.getSource().getFeatures();
          if (features.length > 0) {
            map.getView().fit(layer.getSource().getExtent(), {
              padding: [60, 60, 60, 60],
              maxZoom: 16,
              duration: 500,
            });
          } else {
            const mwsExtent = mwsLayer.getSource().getExtent();
            if (mwsExtent && !mwsExtent.some(isNaN))
              map.getView().fit(mwsExtent, {
                padding: [40, 40, 40, 40],
                maxZoom: 14,
                duration: 500,
              });
          }
        }
      });
    },
    [districtNameSafe, blockNameSafe, plan?.id, loadMWS],
  );

  const loadSettlement = useCallback(
    makeResourceLoader("settlement", SettlementIcon, "sett_name"),
    [makeResourceLoader],
  );
  const loadWell = useCallback(
    makeResourceLoader("well", WellIcon, "Benefici_1"),
    [makeResourceLoader],
  );
  const loadWaterStructure = useCallback(
    makeResourceLoader("waterbody", WaterStructureIcon, "wbs_type"),
    [makeResourceLoader],
  );

  const loadNrmWorks = useCallback(
    async (map) => {
      const mwsLayer = await loadMWS(map);
      const makeLayer = async (prefix, icon) => {
        const l = await getVectorLayers(
          "works",
          `${prefix}_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
          true,
        );
        l.setStyle((feature) => {
          if (feature.getGeometry()?.getType() === "Point") {
            const name = feature.get("work_type") || "";
            return new Style({
              image: new Icon({ src: icon, scale: 1.1 }),
              text: new Text({
                text: name,
                font: "bold 11px sans-serif",
                offsetY: -20,
                textAlign: "center",
                textBaseline: "middle",
                fill: new Fill({ color: "oklch(28% 0.18 301.924)" }),
                stroke: new Stroke({ color: "#ffffff", width: 3 }),
              }),
            });
          }
          return null;
        });
        map.addLayer(l);
        return l;
      };
      const [rechargeLayer, irrigationLayer] = await Promise.all([
        makeLayer("plan_gw", RechargeIcon),
        makeLayer("plan_agri", IrrigationIcon),
      ]);
      const tryZoom = () => {
        const rF = rechargeLayer.getSource().getFeatures();
        const iF = irrigationLayer.getSource().getFeatures();
        if ([...rF, ...iF].length > 0) {
          const extents = [
            ...(rF.length > 0 ? [rechargeLayer.getSource().getExtent()] : []),
            ...(iF.length > 0 ? [irrigationLayer.getSource().getExtent()] : []),
          ];
          const combined = extents.reduce((acc, curr) => [
            Math.min(acc[0], curr[0]),
            Math.min(acc[1], curr[1]),
            Math.max(acc[2], curr[2]),
            Math.max(acc[3], curr[3]),
          ]);
          map.getView().fit(combined, {
            padding: [60, 60, 60, 60],
            maxZoom: 16,
            duration: 500,
          });
        } else {
          const mwsExtent = mwsLayer.getSource().getExtent();
          if (mwsExtent && !mwsExtent.some(isNaN))
            map.getView().fit(mwsExtent, {
              padding: [40, 40, 40, 40],
              maxZoom: 14,
              duration: 500,
            });
        }
      };
      rechargeLayer.getSource().once("change", () => {
        if (rechargeLayer.getSource().getState() === "ready") tryZoom();
      });
      irrigationLayer.getSource().once("change", () => {
        if (irrigationLayer.getSource().getState() === "ready") tryZoom();
      });
      setTimeout(tryZoom, 500);
    },
    [districtNameSafe, blockNameSafe, plan?.id, loadMWS],
  );

  const loadLivelihood = useCallback(
    async (map) => {
      const mwsLayer = await loadMWS(map);
      const layer = await getVectorLayers(
        "works",
        `livelihood_${plan.id}_${districtNameSafe}_${blockNameSafe}`,
        true,
      );
      layer.setStyle((feature) => {
        if (feature.getGeometry()?.getType() === "Point") {
          const name = feature.get("Livestoc_5") || "";
          return new Style({
            image: new Icon({ src: LivelihoodIcon, scale: 1.1 }),
            text: new Text({
              text: name,
              font: "bold 11px sans-serif",
              offsetY: -20,
              textAlign: "center",
              textBaseline: "middle",
              fill: new Fill({ color: "oklch(28% 0.18 301.924)" }),
              stroke: new Stroke({ color: "#ffffff", width: 3 }),
            }),
          });
        }
        return null;
      });
      map.addLayer(layer);
      layer.getSource().once("change", () => {
        if (layer.getSource().getState() === "ready") {
          const features = layer.getSource().getFeatures();
          if (features.length > 0) {
            map.getView().fit(layer.getSource().getExtent(), {
              padding: [60, 60, 60, 60],
              maxZoom: 16,
              duration: 500,
            });
          } else {
            const mwsExtent = mwsLayer.getSource().getExtent();
            if (mwsExtent && !mwsExtent.some(isNaN))
              map.getView().fit(mwsExtent, {
                padding: [40, 40, 40, 40],
                maxZoom: 14,
                duration: 500,
              });
          }
        }
      });
    },
    [districtNameSafe, blockNameSafe, plan?.id, loadMWS],
  );

  const loadNothing = useCallback(async () => {}, []);

  if (deepLinkLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: P.lighter }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{
              borderColor: `${P.base} transparent transparent transparent`,
            }}
          />
          <p className="text-sm font-semibold" style={{ color: P.muted }}>
            Loading plan...
          </p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: P.lighter }}
      >
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: P.text }}>
            No plan data found
          </p>
          <button
            onClick={() => navigate(-1)}
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
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() =>
                navigate("/landscape-stewardship", {
                  state: { returnContext: state?.returnContext },
                })
              }
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
              <h1 className="text-lg font-bold text-white truncate">
                {plan.plan}
              </h1>
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2 flex-wrap justify-end">
            <StatusBadge label="DPR Completed" active={plan.is_dpr_reviewed} />
            <StatusBadge label="DPR Submitted" active={plan.is_dpr_approved} />
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6 flex flex-col gap-6">
        {/* ── VILLAGE SUMMARY + MAP ─────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div
            className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5 w-full lg:w-[40%]"
            style={{ border: `1px solid ${P.border}` }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: P.muted }}
            >
              Village Summary
            </p>
            {summaryLoading ? (
              <SummarySkeleton />
            ) : summaryError ? (
              <p className="text-sm" style={{ color: P.muted }}>
                Failed to load summary.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <InfoChip
                    label="Village"
                    value={toTitleCase(villageBrief?.village_name)}
                  />
                  <InfoChip
                    label="Gram Panchayat"
                    value={toTitleCase(villageBrief?.gram_panchayat)}
                  />
                  <InfoChip
                    label="Tehsil"
                    value={toTitleCase(villageBrief?.tehsil)}
                  />
                  <InfoChip
                    label="District"
                    value={toTitleCase(villageBrief?.district)}
                  />
                  <InfoChip
                    label="State"
                    value={toTitleCase(villageBrief?.state)}
                  />
                  <InfoChip
                    label="Settlements"
                    value={villageBrief?.total_settlements}
                  />
                </div>
                <div className="w-full h-px" style={{ background: P.border }} />
                <div className="grid grid-cols-2 gap-3">
                  <InfoChip
                    label="Organization"
                    value={teamDetails?.organization}
                  />
                  <InfoChip label="Project" value={teamDetails?.project} />
                  <InfoChip
                    label="Facilitator"
                    value={teamDetails?.facilitator}
                  />
                  <InfoChip label="Process" value={teamDetails?.process} />
                </div>
                <div className="w-full h-px" style={{ background: P.border }} />
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: P.muted }}
                  >
                    Data Sections
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: "Settlements",
                        value: summary?.sections?.settlements,
                      },
                      { label: "Crops", value: summary?.sections?.crops },
                      { label: "Wells", value: summary?.sections?.wells },
                      {
                        label: "Waterbodies",
                        value: summary?.sections?.waterbodies,
                      },
                      {
                        label: "NRM Works",
                        value:
                          (summary?.sections?.nrm_works?.recharge ?? 0) +
                          (summary?.sections?.nrm_works?.irrigation ?? 0),
                      },
                      {
                        label: "Livelihood",
                        value: summary?.sections?.livelihood,
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="text-center rounded-xl p-2"
                        style={{
                          background: P.lighter,
                          border: `1px solid ${P.border}`,
                        }}
                      >
                        <p
                          className="text-lg font-bold"
                          style={{ color: P.base }}
                        >
                          {value ?? "--"}
                        </p>
                        <p className="text-xs" style={{ color: P.muted }}>
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
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
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedWell(null);
                setSelectedWaterbody(null);
                setSelectedNrmWork(null);
                setSelectedLivelihood(null);
                setWorksSubTab("nrm");
              }}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200"
              style={
                activeTab === tab.id
                  ? {
                      background: P.base,
                      color: "#fff",
                      boxShadow: "0 2px 8px rgba(139,63,230,0.25)",
                    }
                  : { color: P.muted }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ──────────────────────────────── */}

        {/* SETTLEMENT TAB */}
        {activeTab === "settlement" && (
          <div
            className="bg-white rounded-2xl shadow-sm p-6"
            style={{ border: `1px solid ${P.border}` }}
          >
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-[50%]">
                <MapSection
                  title="Settlement Overview"
                  loadLayer={loadSettlement}
                  loadBoundary={loadNothing}
                  districtNameSafe={districtNameSafe}
                  blockNameSafe={blockNameSafe}
                  plan={plan}
                />
              </div>
              <div className="w-full lg:w-[50%] flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-1">
                {settlementLoading ? (
                  <TabSkeleton />
                ) : (
                  <>
                    {settlements.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <p
                          className="text-xs font-semibold uppercase tracking-widest"
                          style={{ color: P.muted }}
                        >
                          Settlements ({settlements.length})
                        </p>
                        {settlements.map((s, i) => (
                          <SettlementCard
                            key={s.settlement_id ?? i}
                            s={s}
                            livestockData={livestock}
                            cropsData={crops}
                          />
                        ))}
                      </div>
                    )}
                    {settlements.length === 0 && (
                      <div
                        className="flex items-center justify-center h-40 rounded-2xl"
                        style={{ border: `1px solid ${P.border}` }}
                      >
                        <p className="text-sm" style={{ color: P.muted }}>
                          No settlement data available
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WELLS TAB */}
        {activeTab === "wells" && (
          <div
            className="bg-white rounded-2xl shadow-sm p-6"
            style={{ border: `1px solid ${P.border}` }}
          >
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-[50%]">
                <MapSection
                  title="Wells Overview"
                  loadLayer={loadWell}
                  loadBoundary={loadNothing}
                  districtNameSafe={districtNameSafe}
                  blockNameSafe={blockNameSafe}
                  plan={plan}
                />
              </div>
              <div className="w-full lg:w-[50%] flex flex-col gap-4">
                <div className="overflow-y-auto max-h-[350px] flex flex-col gap-2 pr-1">
                  {wellsLoading ? (
                    <TabSkeleton />
                  ) : wells.length === 0 ? (
                    <div
                      className="flex items-center justify-center h-40 rounded-2xl"
                      style={{ border: `1px solid ${P.border}` }}
                    >
                      <p className="text-sm" style={{ color: P.muted }}>
                        No wells data available
                      </p>
                    </div>
                  ) : (
                    <>
                      <p
                        className="text-xs font-semibold uppercase tracking-widest flex-shrink-0"
                        style={{ color: P.muted }}
                      >
                        Wells ({wells.length})
                      </p>
                      {wells.map((w, i) => (
                        <button
                          key={w.well_id ?? i}
                          onClick={() =>
                            setSelectedWell(
                              selectedWell?.well_id === w.well_id ? null : w,
                            )
                          }
                          className="w-full text-left px-4 py-3 rounded-xl flex items-center justify-between gap-3 transition-all duration-200"
                          style={{
                            background:
                              selectedWell?.well_id === w.well_id
                                ? P.light
                                : P.lighter,
                            border: `1px solid ${selectedWell?.well_id === w.well_id ? P.base : P.border}`,
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={WellIcon}
                              alt=""
                              className="w-5 h-5 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p
                                className="text-sm font-semibold truncate"
                                style={{ color: P.text }}
                              >
                                {w.beneficiary_name || w.owner || "--"}
                              </p>
                              <p
                                className="text-xs truncate"
                                style={{ color: P.muted }}
                              >
                                {w.beneficiary_settlement} · {w.well_type}
                              </p>
                            </div>
                          </div>
                          <span
                            className="text-xs flex-shrink-0"
                            style={{ color: P.muted }}
                          >
                            {selectedWell?.well_id === w.well_id ? "▲" : "▼"}
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
                {selectedWell && (
                  <WellDetailCard
                    w={selectedWell}
                    onClose={() => setSelectedWell(null)}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* WATERBODIES TAB */}
        {activeTab === "waterbodies" && (
          <div
            className="bg-white rounded-2xl shadow-sm p-6"
            style={{ border: `1px solid ${P.border}` }}
          >
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-[50%]">
                <MapSection
                  title="Waterbodies Overview"
                  loadLayer={loadWaterStructure}
                  loadBoundary={loadNothing}
                  districtNameSafe={districtNameSafe}
                  blockNameSafe={blockNameSafe}
                  plan={plan}
                />
              </div>
              <div className="w-full lg:w-[50%] flex flex-col gap-4">
                <div className="overflow-y-auto max-h-[350px] flex flex-col gap-2 pr-1">
                  {waterbodiesLoading ? (
                    <TabSkeleton />
                  ) : waterbodies.length === 0 ? (
                    <div
                      className="flex items-center justify-center h-40 rounded-2xl"
                      style={{ border: `1px solid ${P.border}` }}
                    >
                      <p className="text-sm" style={{ color: P.muted }}>
                        No waterbodies data available
                      </p>
                    </div>
                  ) : (
                    <>
                      <p
                        className="text-xs font-semibold uppercase tracking-widest flex-shrink-0"
                        style={{ color: P.muted }}
                      >
                        Waterbodies ({waterbodies.length})
                      </p>
                      {waterbodies.map((w, i) => (
                        <button
                          key={w.waterbody_id ?? i}
                          onClick={() =>
                            setSelectedWaterbody(
                              selectedWaterbody?.waterbody_id === w.waterbody_id
                                ? null
                                : w,
                            )
                          }
                          className="w-full text-left px-4 py-3 rounded-xl flex items-center justify-between gap-3 transition-all duration-200"
                          style={{
                            background:
                              selectedWaterbody?.waterbody_id === w.waterbody_id
                                ? P.light
                                : P.lighter,
                            border: `1px solid ${selectedWaterbody?.waterbody_id === w.waterbody_id ? P.base : P.border}`,
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={WaterStructureIcon}
                              alt=""
                              className="w-5 h-5 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p
                                className="text-sm font-semibold truncate"
                                style={{ color: P.text }}
                              >
                                {w.beneficiary_name || w.owner || "--"}
                              </p>
                              <p
                                className="text-xs truncate"
                                style={{ color: P.muted }}
                              >
                                {w.beneficiary_settlement} ·{" "}
                                {w.water_structure_type}
                              </p>
                            </div>
                          </div>
                          <span
                            className="text-xs flex-shrink-0"
                            style={{ color: P.muted }}
                          >
                            {selectedWaterbody?.waterbody_id === w.waterbody_id
                              ? "▲"
                              : "▼"}
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
                {selectedWaterbody && (
                  <WaterbodyDetailCard
                    w={selectedWaterbody}
                    onClose={() => setSelectedWaterbody(null)}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* NRM WORK DEMANDS TAB */}
        {activeTab === "works" && (
          <div
            className="bg-white rounded-2xl shadow-sm p-6"
            style={{ border: `1px solid ${P.border}` }}
          >
            <div className="flex flex-col gap-6">
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: "nrm", label: "NRM Works" },
                  { id: "gw", label: "Maintenance GW" },
                  { id: "agri", label: "Maintenance Agri" },
                  { id: "swb", label: "Maintenance SWB" },
                  { id: "swb_rs", label: "Maintenance SWB RS" },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setWorksSubTab(sub.id);
                      setSelectedNrmWork(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                    style={
                      worksSubTab === sub.id
                        ? {
                            background: P.base,
                            color: "#fff",
                            boxShadow: "0 2px 8px rgba(139,63,230,0.25)",
                          }
                        : {
                            background: P.lighter,
                            color: P.muted,
                            border: `1px solid ${P.border}`,
                          }
                    }
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col lg:flex-row gap-6">
                {worksSubTab === "nrm" && (
                  <div className="w-full lg:w-[50%]">
                    <MapSection
                      title="NRM Work Demands"
                      loadLayer={loadNrmWorks}
                      loadBoundary={loadNothing}
                      districtNameSafe={districtNameSafe}
                      blockNameSafe={blockNameSafe}
                      plan={plan}
                    />
                  </div>
                )}
                <div
                  className={`flex flex-col gap-4 w-full ${worksSubTab === "nrm" ? "lg:w-[50%]" : ""}`}
                >
                  {nrmLoading ? (
                    <TabSkeleton />
                  ) : (
                    (() => {
                      const dataMap = {
                        nrm: nrmWorks,
                        gw: maintenanceGW,
                        agri: maintenanceAgri,
                        swb: maintenanceSWB,
                        swb_rs: maintenanceSWBRS,
                      };
                      const items = dataMap[worksSubTab] ?? [];
                      const getIcon = (item) =>
                        worksSubTab === "nrm" &&
                        item.work_category === "Irrigation Work"
                          ? IrrigationIcon
                          : RechargeIcon;
                      const getSubtitle = (item) =>
                        worksSubTab === "nrm"
                          ? `${item.beneficiary_settlement} · ${item.work_category}`
                          : `${item.beneficiary_settlement} · ${item.structure_type}`;
                      const getTitle = (item) =>
                        item.beneficiary_name || item.work_demand || "--";
                      const getId = (item, i) =>
                        item.id ?? `${worksSubTab}-${i}`;

                      return items.length === 0 ? (
                        <div
                          className="flex items-center justify-center h-40 rounded-2xl"
                          style={{ border: `1px solid ${P.border}` }}
                        >
                          <p className="text-sm" style={{ color: P.muted }}>
                            No data available
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="overflow-y-auto max-h-[350px] flex flex-col gap-2 pr-1">
                            <p
                              className="text-xs font-semibold uppercase tracking-widest flex-shrink-0"
                              style={{ color: P.muted }}
                            >
                              {items.length} records
                            </p>
                            {items.map((item, i) => (
                              <button
                                key={getId(item, i)}
                                onClick={() =>
                                  setSelectedNrmWork(
                                    selectedNrmWork &&
                                      getId(selectedNrmWork, -1) ===
                                        getId(item, i)
                                      ? null
                                      : item,
                                  )
                                }
                                className="w-full text-left px-4 py-3 rounded-xl flex items-center justify-between gap-3 transition-all duration-200"
                                style={{
                                  background:
                                    selectedNrmWork === item
                                      ? P.light
                                      : P.lighter,
                                  border: `1px solid ${selectedNrmWork === item ? P.base : P.border}`,
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <img
                                    src={getIcon(item)}
                                    alt=""
                                    className="w-5 h-5 flex-shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p
                                      className="text-sm font-semibold truncate"
                                      style={{ color: P.text }}
                                    >
                                      {getTitle(item)}
                                    </p>
                                    <p
                                      className="text-xs truncate"
                                      style={{ color: P.muted }}
                                    >
                                      {getSubtitle(item)}
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className="text-xs flex-shrink-0"
                                  style={{ color: P.muted }}
                                >
                                  {selectedNrmWork === item ? "▲" : "▼"}
                                </span>
                              </button>
                            ))}
                          </div>
                          {selectedNrmWork && (
                            <NrmDetailCard
                              n={selectedNrmWork}
                              onClose={() => setSelectedNrmWork(null)}
                            />
                          )}
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LIVELIHOOD DEMANDS TAB */}
        {activeTab === "livelihood" && (
          <div
            className="bg-white rounded-2xl shadow-sm p-6"
            style={{ border: `1px solid ${P.border}` }}
          >
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-[50%]">
                <MapSection
                  title="Livelihood Demands"
                  loadLayer={loadLivelihood}
                  loadBoundary={loadNothing}
                  districtNameSafe={districtNameSafe}
                  blockNameSafe={blockNameSafe}
                  plan={plan}
                />
              </div>
              <div className="w-full lg:w-[50%] flex flex-col gap-4">
                <div className="overflow-y-auto max-h-[350px] flex flex-col gap-2 pr-1">
                  {livelihoodLoading ? (
                    <TabSkeleton />
                  ) : livelihood.length === 0 ? (
                    <div
                      className="flex items-center justify-center h-40 rounded-2xl"
                      style={{ border: `1px solid ${P.border}` }}
                    >
                      <p className="text-sm" style={{ color: P.muted }}>
                        No livelihood data available
                      </p>
                    </div>
                  ) : (
                    <>
                      <p
                        className="text-xs font-semibold uppercase tracking-widest flex-shrink-0"
                        style={{ color: P.muted }}
                      >
                        Livelihood Demands ({livelihood.length})
                      </p>
                      {livelihood.map((l, i) => (
                        <button
                          key={l.id ?? i}
                          onClick={() =>
                            setSelectedLivelihood(
                              selectedLivelihood === l ? null : l,
                            )
                          }
                          className="w-full text-left px-4 py-3 rounded-xl flex items-center justify-between gap-3 transition-all duration-200"
                          style={{
                            background:
                              selectedLivelihood === l ? P.light : P.lighter,
                            border: `1px solid ${selectedLivelihood === l ? P.base : P.border}`,
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={LivelihoodIcon}
                              alt=""
                              className="w-5 h-5 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p
                                className="text-sm font-semibold truncate"
                                style={{ color: P.text }}
                              >
                                {l.beneficiary_name || "--"}
                              </p>
                              <p
                                className="text-xs truncate"
                                style={{ color: P.muted }}
                              >
                                {l.beneficiary_settlement} · {l.livelihood_work}
                              </p>
                            </div>
                          </div>
                          <span
                            className="text-xs flex-shrink-0"
                            style={{ color: P.muted }}
                          >
                            {selectedLivelihood === l ? "▲" : "▼"}
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
                {selectedLivelihood && (
                  <LivelihoodDetailCard
                    l={selectedLivelihood}
                    onClose={() => setSelectedLivelihood(null)}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanViewPage;
