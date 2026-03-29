import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
import LandingNavbar from "../components/landing_navbar";
import Footer from "../components/footer";
import SelectButton from "../components/buttons/select_button";
import getStates from "../actions/getStates";
import {
  CROP_PROFILES,
  simulateFutureScenario,
} from "../components/utils/futurePredictorModel";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const RISK_CLASS_MAP = {
  "Very High": "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Moderate: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const transformName = (name) => {
  if (!name) return name;

  return name
    .replace(/[().]/g, "")
    .replace(/[-\s]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
};

const buildMwsUrls = (stateLabel, districtLabel, blockLabel) => {
  const transformedParams = new URLSearchParams({
    state: transformName(stateLabel),
    district: transformName(districtLabel),
    block: transformName(blockLabel),
    file_type: "json",
  });

  const rawParams = new URLSearchParams({
    state: stateLabel,
    district: districtLabel,
    block: blockLabel,
    file_type: "json",
  });

  const base = process.env.REACT_APP_API_URL;

  return [
    `${base}/download_kyl_data?${transformedParams.toString()}`,
    `${base}/download_kyl_data/?${transformedParams.toString()}`,
    `${base}/download_kyl_data?${rawParams.toString()}`,
    `${base}/download_kyl_data/?${rawParams.toString()}`,
  ];
};

const parseApiPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.features)) {
    return payload.features
      .map((feature) => feature?.properties || feature)
      .filter((item) => item && typeof item === "object");
  }
  return null;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const averageFromKeys = (records, keys) => {
  const values = [];
  records.forEach((record) => {
    keys.forEach((key) => {
      const value = toNumber(record?.[key]);
      if (value !== null) values.push(value);
    });
  });

  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const findYieldKey = (records) => {
  const keyStats = new Map();

  records.forEach((record) => {
    if (!record || typeof record !== "object") return;
    Object.keys(record).forEach((key) => {
      const lower = key.toLowerCase();
      if (!lower.includes("yield")) return;
      if (lower.includes("low_yield")) return;
      const value = toNumber(record[key]);
      if (value === null) return;

      if (!keyStats.has(key)) keyStats.set(key, { count: 0 });
      keyStats.get(key).count += 1;
    });
  });

  let best = null;
  let bestCount = 0;
  keyStats.forEach((stat, key) => {
    if (stat.count > bestCount) {
      best = key;
      bestCount = stat.count;
    }
  });

  return best;
};

const deriveBaselineMetrics = (records, cropKey) => {
  const cropProfile = CROP_PROFILES[cropKey] || CROP_PROFILES.rice;

  const rainfallMm =
    averageFromKeys(records, ["avg_precipitation", "avg_rainfall", "rainfall", "precipitation"]) ||
    1000;

  const ndvi = averageFromKeys(records, ["avg_ndvi", "ndvi", "crop_health"]);
  const doubleCropped = averageFromKeys(records, [
    "avg_double_cropped",
    "double_cropped",
    "cropping_intensity_avg",
  ]);

  const yieldKey = findYieldKey(records);
  const directYield = yieldKey ? averageFromKeys(records, [yieldKey]) : null;

  const ndviNorm = ndvi === null ? 0.55 : clamp(ndvi / 0.8, 0.2, 1.3);
  const doubleNorm =
    doubleCropped === null
      ? 0.45
      : clamp(doubleCropped > 1 ? doubleCropped / 100 : doubleCropped, 0.1, 1.2);

  const estimatedYield = cropProfile.baseYieldTph * clamp(0.65 + ndviNorm * 0.5 + doubleNorm * 0.2, 0.5, 1.4);
  const baseYieldTph = directYield !== null ? directYield : estimatedYield;

  const stageExtraction = averageFromKeys(records, ["stage_of_groundwater_extraction"]);
  const deltaG = averageFromKeys(records, ["delta_g", "deltaG"]);
  const groundwaterLevel = averageFromKeys(records, ["groundwater_level", "water_level", "avg_water_level"]);

  const extractionRisk =
    stageExtraction === null
      ? 15
      : stageExtraction <= 2
      ? stageExtraction * 20
      : stageExtraction;

  const deltaRisk = deltaG === null ? 0 : deltaG < 0 ? Math.min(Math.abs(deltaG) * 40, 30) : -Math.min(deltaG * 10, 10);

  const groundwaterRisk =
    groundwaterLevel === null ? 0 : groundwaterLevel > 20 ? 10 : groundwaterLevel > 10 ? 5 : 0;

  const waterScarcityScore = clamp(30 + extractionRisk * 0.45 + deltaRisk + groundwaterRisk, 10, 95);

  return {
    rainfallMm: Number(rainfallMm.toFixed(0)),
    baseYieldTph: Number(baseYieldTph.toFixed(2)),
    waterScarcityScore: Number(waterScarcityScore.toFixed(1)),
    diagnostics: {
      ndvi: ndvi !== null ? Number(ndvi.toFixed(3)) : null,
      doubleCropped: doubleCropped !== null ? Number(doubleCropped.toFixed(2)) : null,
      usedYieldKey: yieldKey,
    },
  };
};

const InputSlider = ({ label, value, min, max, step, suffix = "", onChange }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-sm text-gray-700">
      <label className="font-medium">{label}</label>
      <span className="font-semibold text-gray-900">
        {value}
        {suffix}
      </span>
    </div>
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full accent-purple-600"
    />
  </div>
);

const FuturePredictor = () => {
  const { t, i18n } = useTranslation();
  const [statesData, setStatesData] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);

  const [cropKey, setCropKey] = useState("rice");
  const [rainfallDropPct, setRainfallDropPct] = useState(20);
  const [tempIncreaseC, setTempIncreaseC] = useState(1.3);
  const [planningYears, setPlanningYears] = useState(5);
  const [adaptationLevel, setAdaptationLevel] = useState(40);
  const [waterStorageBoostPct, setWaterStorageBoostPct] = useState(20);

  const [mwsRecords, setMwsRecords] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    const fetchStateHierarchy = async () => {
      setLoadingStates(true);
      const data = await getStates();
      setStatesData(Array.isArray(data) ? data : []);
      setLoadingStates(false);
    };

    fetchStateHierarchy();
  }, []);

  const handleItemSelect = (setter, value) => {
    if (setter === setSelectedState) {
      setter(value);
      setSelectedDistrict(null);
      setSelectedBlock(null);
      setMwsRecords([]);
      setFetchError("");
      return;
    }

    if (setter === setSelectedDistrict) {
      setter(value);
      setSelectedBlock(null);
      setMwsRecords([]);
      setFetchError("");
      return;
    }

    setter(value);
    setMwsRecords([]);
    setFetchError("");
  };

  useEffect(() => {
    if (!selectedState || !selectedDistrict || !selectedBlock) return;

    const fetchMwsData = async () => {
      setLoadingMetrics(true);
      setFetchError("");

      try {
        const urls = buildMwsUrls(selectedState.label, selectedDistrict.label, selectedBlock.label);
        let resolved = null;

        for (const url of urls) {
          const response = await fetch(url);
          if (!response.ok) continue;

          const payload = await response.json();
          const parsed = parseApiPayload(payload);
          if (parsed && parsed.length) {
            resolved = parsed;
            break;
          }
        }

        if (!resolved || !resolved.length) {
          throw new Error("No MWS data returned for selected location");
        }

        setMwsRecords(resolved);
        setLastUpdated(new Date().toLocaleString(i18n.language));
      } catch (error) {
        setMwsRecords([]);
        setFetchError(t("futurePredictor.messages.fetchError"));
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchMwsData();
  }, [selectedState, selectedDistrict, selectedBlock, i18n.language, t]);

  const baseline = useMemo(() => {
    if (!mwsRecords.length) {
      return {
        rainfallMm: 1000,
        baseYieldTph: CROP_PROFILES[cropKey]?.baseYieldTph || 4,
        waterScarcityScore: 30,
        diagnostics: { ndvi: null, doubleCropped: null, usedYieldKey: null },
      };
    }

    return deriveBaselineMetrics(mwsRecords, cropKey);
  }, [mwsRecords, cropKey]);

  const simulation = useMemo(
    () =>
      simulateFutureScenario({
        cropKey,
        rainfallDropPct,
        tempIncreaseC,
        planningYears,
        adaptationLevel,
        waterStorageBoostPct,
        baseline,
      }),
    [
      cropKey,
      rainfallDropPct,
      tempIncreaseC,
      planningYears,
      adaptationLevel,
      waterStorageBoostPct,
      baseline,
    ]
  );

  const riskKeyMap = {
    "Very High": "veryHigh",
    High: "high",
    Moderate: "moderate",
    Low: "low",
  };
  const localizedRiskLabel = t(
    `futurePredictor.risk.${riskKeyMap[simulation.finalRiskLevel] || "moderate"}`
  );

  const trendLineData = {
    labels: simulation.yearly.map((item) => item.year),
    datasets: [
      {
        label: t("futurePredictor.charts.yieldLabel"),
        data: simulation.yearly.map((item) => item.yieldTph),
        borderColor: "#6b21a8",
        backgroundColor: "rgba(107, 33, 168, 0.15)",
        tension: 0.3,
        yAxisID: "yYield",
      },
      {
        label: t("futurePredictor.charts.rainfallLabel"),
        data: simulation.yearly.map((item) => item.rainfallMm),
        borderColor: "#0369a1",
        backgroundColor: "rgba(3, 105, 161, 0.15)",
        tension: 0.3,
        yAxisID: "yRain",
      },
    ],
  };

  const waterRiskBarData = {
    labels: simulation.yearly.map((item) => item.year),
    datasets: [
      {
        label: t("futurePredictor.charts.waterScarcityLabel"),
        data: simulation.yearly.map((item) => item.waterScarcityScore),
        backgroundColor: simulation.yearly.map((item) => {
          if (item.waterScarcityScore >= 75) return "#dc2626";
          if (item.waterScarcityScore >= 60) return "#ea580c";
          if (item.waterScarcityScore >= 40) return "#ca8a04";
          return "#16a34a";
        }),
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <LandingNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10 space-y-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="uppercase tracking-wide text-xs font-semibold text-gray-600">
            {t("futurePredictor.badge")}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mt-2 text-gray-900">
            {t("futurePredictor.title")}
          </h1>
          <p className="mt-2 text-sm md:text-base text-gray-700 max-w-3xl">
            {t("futurePredictor.subtitle")}
          </p>
          <Link to="/" className="inline-flex mt-3 text-sm font-medium underline text-gray-700">
            {t("futurePredictor.backToHome")}
          </Link>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <article className="xl:col-span-1 bg-white border border-slate-200 rounded-xl p-5 md:p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">{t("futurePredictor.inputs.heading")}</h2>

            <div className="space-y-3">
              <SelectButton
                currVal={selectedState}
                placeholder={loadingStates ? t("futurePredictor.messages.loadingStates") : t("futurePredictor.inputs.selectState")}
                stateData={statesData}
                translateNamespace="states"
                handleItemSelect={handleItemSelect}
                setState={setSelectedState}
              />

              <SelectButton
                currVal={selectedDistrict}
                placeholder={t("futurePredictor.inputs.selectDistrict")}
                stateData={selectedState?.district || null}
                translateNamespace="districts"
                handleItemSelect={handleItemSelect}
                setState={setSelectedDistrict}
              />

              <SelectButton
                currVal={selectedBlock}
                placeholder={t("futurePredictor.inputs.selectTehsil")}
                stateData={selectedDistrict?.blocks || null}
                translateNamespace="blocks"
                handleItemSelect={handleItemSelect}
                setState={setSelectedBlock}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="crop" className="text-sm font-medium text-gray-700">
                {t("futurePredictor.inputs.crop")}
              </label>
              <select
                id="crop"
                value={cropKey}
                onChange={(event) => setCropKey(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {Object.values(CROP_PROFILES).map((crop) => (
                  <option key={crop.key} value={crop.key}>
                    {t(`futurePredictor.cropLabels.${crop.key}`, { defaultValue: crop.label })}
                  </option>
                ))}
              </select>
            </div>

            <InputSlider
              label={t("futurePredictor.inputs.rainfallDrop")}
              value={rainfallDropPct}
              min={0}
              max={50}
              step={1}
              suffix="%"
              onChange={setRainfallDropPct}
            />

            <InputSlider
              label={t("futurePredictor.inputs.temperatureRise")}
              value={tempIncreaseC}
              min={0}
              max={3}
              step={0.1}
              suffix=" C"
              onChange={setTempIncreaseC}
            />

            <InputSlider
              label={t("futurePredictor.inputs.timeHorizon")}
              value={planningYears}
              min={1}
              max={5}
              step={1}
              suffix=" years"
              onChange={setPlanningYears}
            />

            <InputSlider
              label={t("futurePredictor.inputs.adaptationReadiness")}
              value={adaptationLevel}
              min={0}
              max={100}
              step={1}
              suffix="%"
              onChange={setAdaptationLevel}
            />

            <InputSlider
              label={t("futurePredictor.inputs.waterStorageImprovement")}
              value={waterStorageBoostPct}
              min={0}
              max={40}
              step={1}
              suffix="%"
              onChange={setWaterStorageBoostPct}
            />
          </article>

          <article className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-5 md:p-6 space-y-6">
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50 text-sm text-gray-700">
              {loadingMetrics ? t("futurePredictor.messages.fetchingBaseline") : null}
              {!loadingMetrics && fetchError ? fetchError : null}
              {!loadingMetrics && !fetchError && selectedBlock
                ? t("futurePredictor.messages.liveBaselineLoaded", {
                    count: mwsRecords.length,
                    lastUpdated,
                  })
                : null}
              {!selectedBlock ? t("futurePredictor.messages.selectLocationPrompt") : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-xs uppercase tracking-wide text-gray-500">{t("futurePredictor.cards.yieldChange")}</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    simulation.yieldChangePct < 0 ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {simulation.yieldChangePct}%
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-xs uppercase tracking-wide text-gray-500">{t("futurePredictor.cards.projectedYield")}</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">{simulation.finalYearYield} t/ha</p>
                <p className="text-xs mt-1 text-gray-600">
                  {t("futurePredictor.cards.baseline")}: {simulation.baseYieldTph} t/ha
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-xs uppercase tracking-wide text-gray-500">{t("futurePredictor.cards.waterScarcityRisk")}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                      RISK_CLASS_MAP[simulation.finalRiskLevel] || RISK_CLASS_MAP.Moderate
                    }`}
                  >
                    {localizedRiskLabel}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">{simulation.finalScarcityScore}/100</span>
                </div>
                <p className="text-xs mt-1 text-gray-600">
                  {t("futurePredictor.cards.baseline")}: {simulation.baselineWaterScarcityScore}/100
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">{t("futurePredictor.charts.rainfallYieldTrend")}</h3>
                <div className="h-[260px]">
                  <Line
                    data={trendLineData}
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      plugins: { legend: { position: "bottom" } },
                      scales: {
                        yYield: {
                          type: "linear",
                          position: "left",
                          title: { display: true, text: t("futurePredictor.charts.yAxisYield") },
                        },
                        yRain: {
                          type: "linear",
                          position: "right",
                          title: { display: true, text: t("futurePredictor.charts.yAxisRainfall") },
                          grid: { drawOnChartArea: false },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">{t("futurePredictor.charts.waterScarcityTrajectory")}</h3>
                <div className="h-[260px]">
                  <Bar
                    data={waterRiskBarData}
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      plugins: { legend: { position: "bottom" } },
                      scales: {
                        y: {
                          min: 0,
                          max: 100,
                          title: { display: true, text: t("futurePredictor.charts.yAxisScarcity") },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <h3 className="text-sm font-semibold text-gray-800">{t("futurePredictor.alternatives.title")}</h3>
              {simulation.alternatives.length ? (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {simulation.alternatives.map((candidate) => (
                    <div key={candidate.cropKey} className="bg-white border border-slate-200 rounded-lg p-3">
                      <p className="font-semibold text-gray-900">
                        {t(`futurePredictor.cropLabels.${candidate.cropKey}`, {
                          defaultValue: candidate.cropLabel,
                        })}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {t("futurePredictor.alternatives.yield")}: {candidate.projectedYield} t/ha
                      </p>
                      <p className="text-xs text-gray-600">
                        {t("futurePredictor.alternatives.waterRisk")}: {candidate.scarcityScore}/100
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-600">
                  {t("futurePredictor.alternatives.noBetter")}
                </p>
              )}

              <div className="mt-3 text-xs text-gray-600">
                <p>{t("futurePredictor.diagnostics.baselineRainfall")}: {simulation.baselineRainfallMm} mm</p>
                <p>
                  {t("futurePredictor.diagnostics.baselineDiagnostics")}: NDVI {baseline.diagnostics.ndvi ?? "NA"},{" "}
                  {t("futurePredictor.diagnostics.doubleCropped")} {baseline.diagnostics.doubleCropped ?? "NA"}
                </p>
                <p>
                  {t("futurePredictor.diagnostics.yieldSourceKey")}:{" "}
                  {baseline.diagnostics.usedYieldKey || t("futurePredictor.diagnostics.estimatedFromIndicators")}
                </p>
              </div>
            </div>
          </article>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FuturePredictor;
