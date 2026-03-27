import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import getStates from "../actions/getStates";
import LandingNavbar from "../components/landing_navbar";
import {
  buildVillageComparison,
  formatValue,
  getVillageName,
} from "../components/utils/compareMetrics";
import {
  askGeminiRegionalAssistant,
  getSpeechLocale,
} from "../services/geminiService";

const SCENARIO_DEFAULT = {
  rainfallPct: 0,
  cropsPct: 0,
  waterPct: 0,
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

const buildVillageUrls = (stateLabel, districtLabel, blockLabel) => {
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
    `${base}/download_kyl_village_data?${transformedParams.toString()}`,
    `${base}/download_kyl_village_data/?${transformedParams.toString()}`,
    `${base}/download_kyl_village_data?${rawParams.toString()}`,
    `${base}/download_kyl_village_data/?${rawParams.toString()}`,
  ];
};

const parseVillagePayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return null;
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

const parseVillageIds = (value) => {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  return [];
};

const toNumeric = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const deriveVillageRecordsFromMws = (mwsRecords) => {
  if (!Array.isArray(mwsRecords) || !mwsRecords.length) return [];

  const metricKeys = [
    "avg_precipitation",
    "avg_double_cropped",
    "avg_ndvi",
    "avg_rabi_surface_water_mws",
    "avg_zaid_surface_water_mws",
    "stage_of_groundwater_extraction",
    "delta_g",
    "deltaG",
    "groundwater_level",
    "water_level",
  ];

  const villageMap = new Map();

  mwsRecords.forEach((mws) => {
    const villageIds = parseVillageIds(mws?.mws_intersect_villages);
    if (!villageIds.length) return;

    villageIds.forEach((villageId) => {
      const normalizedId = String(villageId);
      if (!villageMap.has(normalizedId)) {
        villageMap.set(normalizedId, {
          village_id: normalizedId,
          village_name: `Village ${normalizedId}`,
          __count: 0,
        });
      }

      const record = villageMap.get(normalizedId);
      record.__count += 1;

      metricKeys.forEach((key) => {
        const value = toNumeric(mws?.[key]);
        if (value === null) return;

        const sumKey = `__sum_${key}`;
        const countKey = `__cnt_${key}`;
        record[sumKey] = (record[sumKey] || 0) + value;
        record[countKey] = (record[countKey] || 0) + 1;
      });
    });
  });

  return Array.from(villageMap.values())
    .map((record) => {
      const output = {
        village_id: record.village_id,
        village_name: record.village_name,
      };

      metricKeys.forEach((key) => {
        const sum = record[`__sum_${key}`];
        const count = record[`__cnt_${key}`];
        if (!count) return;
        output[key] = sum / count;
      });

      return output;
    })
    .filter((item) => Object.keys(item).length > 2);
};

const hasComparisonSignals = (records) => {
  if (!Array.isArray(records) || !records.length) return false;

  const keys = new Set();
  records.forEach((row) => {
    if (!row || typeof row !== "object") return;
    Object.keys(row).forEach((k) => keys.add(k.toLowerCase()));
  });

  const signalGroups = {
    rainfall: ["avg_precipitation", "rain", "precip"],
    crops: ["avg_ndvi", "ndvi", "crop", "vegetation", "double_cropped"],
    water: [
      "water_level",
      "groundwater",
      "delta_g",
      "avg_rabi_surface_water_mws",
      "avg_zaid_surface_water_mws",
      "extraction",
      "aquifer",
      "well",
    ],
  };

  const hasSignal = (tokens) =>
    Array.from(keys).some((key) => tokens.some((token) => key.includes(token)));

  return (
    hasSignal(signalGroups.rainfall) &&
    hasSignal(signalGroups.crops) &&
    hasSignal(signalGroups.water)
  );
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const average = (values) => {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const applyScenarioAdjustments = (
  villages,
  villageAId,
  villageBId,
  keyMap,
  scenarioA,
  scenarioB
) => {
  const list = Array.isArray(villages) ? villages : [];
  if (!list.length) return list;

  const applyMetricChange = (baseValue, percent) => {
    const value = toNumber(baseValue);
    if (value === null || !percent) return baseValue;
    return value * (1 + percent / 100);
  };

  return list.map((village) => {
    const villageId = String(village?.village_id);
    if (villageId !== String(villageAId) && villageId !== String(villageBId)) {
      return village;
    }

    const scenario =
      villageId === String(villageAId) ? scenarioA || SCENARIO_DEFAULT : scenarioB || SCENARIO_DEFAULT;

    const nextVillage = { ...village };
    if (keyMap.rainfall) {
      nextVillage[keyMap.rainfall] = applyMetricChange(
        village[keyMap.rainfall],
        scenario.rainfallPct
      );
    }
    if (keyMap.crops) {
      nextVillage[keyMap.crops] = applyMetricChange(
        village[keyMap.crops],
        scenario.cropsPct
      );
    }
    if (keyMap.water) {
      nextVillage[keyMap.water] = applyMetricChange(
        village[keyMap.water],
        scenario.waterPct
      );
    }

    return nextVillage;
  });
};

const buildRankMap = (villages, comparison) => {
  if (!comparison?.ready || !Array.isArray(villages) || !villages.length) return {};

  const validMetrics = comparison.metrics.filter(
    (metric) => metric.key && metric.higherIsBetter !== undefined
  );
  if (!validMetrics.length) return {};

  const perMetricStats = validMetrics.map((metric) => {
    const values = villages
      .map((village) => toNumber(village?.[metric.key]))
      .filter((value) => value !== null);
    if (!values.length) return null;
    return {
      type: metric.type,
      key: metric.key,
      higherIsBetter: metric.higherIsBetter,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }).filter(Boolean);

  if (!perMetricStats.length) return {};

  const scoredVillages = villages.map((village) => {
    const scores = perMetricStats
      .map((metric) => {
        const rawValue = toNumber(village?.[metric.key]);
        if (rawValue === null) return null;
        if (metric.max === metric.min) return 50;
        const ratio = (rawValue - metric.min) / (metric.max - metric.min);
        return metric.higherIsBetter ? ratio * 100 : (1 - ratio) * 100;
      })
      .filter((value) => value !== null);

    return {
      id: String(village?.village_id),
      score: average(scores),
    };
  });

  const ranked = scoredVillages
    .filter((row) => row.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return ranked.reduce((acc, row) => {
    acc[row.id] = row.rank;
    return acc;
  }, {});
};

const SelectField = ({ label, value, options, onChange, disabled, placeholder }) => (
  <label className="flex flex-col gap-2">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    <select
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">{placeholder || label}</option>
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  </label>
);

const RegionComparison = () => {
  const { t, i18n } = useTranslation();
  const [statesData, setStatesData] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [selectedVillageAId, setSelectedVillageAId] = useState("");
  const [selectedVillageBId, setSelectedVillageBId] = useState("");

  const [villages, setVillages] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [fetchNotice, setFetchNotice] = useState("");
  const [dataSourceMode, setDataSourceMode] = useState("unknown");
  const [scenarioA, setScenarioA] = useState(SCENARIO_DEFAULT);
  const [scenarioB, setScenarioB] = useState(SCENARIO_DEFAULT);
  const [assistantQuery, setAssistantQuery] = useState("");
  const [assistantResponse, setAssistantResponse] = useState("");
  const [typedAssistantResponse, setTypedAssistantResponse] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const [isListening, setIsListening] = useState(false);

  const translateLocationLabel = (namespace, label) => {
    const resources = i18n.getResourceBundle(i18n.language, "translation");
    if (resources?.[namespace]?.[label]) return resources[namespace][label];
    const enResources = i18n.getResourceBundle("en", "translation");
    return enResources?.[namespace]?.[label] || label;
  };

  const getWinnerText = (winnerCode, villageAName, villageBName) => {
    if (winnerCode === "a_better") {
      return `${villageAName} ${t("regionComparison.winner.better")}`;
    }
    if (winnerCode === "b_better") {
      return `${villageBName} ${t("regionComparison.winner.better")}`;
    }
    if (winnerCode === "tie") return t("regionComparison.winner.tie");
    return t("regionComparison.winner.insufficient");
  };

  useEffect(() => {
    const fetchStateHierarchy = async () => {
      setLoadingStates(true);
      const data = await getStates();
      setStatesData(Array.isArray(data) ? data : []);
      setLoadingStates(false);
    };

    fetchStateHierarchy();
  }, []);

  const selectedState = useMemo(
    () => statesData.find((item) => String(item.state_id) === selectedStateId),
    [statesData, selectedStateId]
  );

  const selectedDistrict = useMemo(
    () =>
      selectedState?.district?.find(
        (item) => String(item.district_id) === selectedDistrictId
      ) || null,
    [selectedState, selectedDistrictId]
  );

  const selectedBlock = useMemo(
    () =>
      selectedDistrict?.blocks?.find(
        (item) => String(item.block_id) === selectedBlockId
      ) || null,
    [selectedDistrict, selectedBlockId]
  );

  useEffect(() => {
    if (!selectedState || !selectedDistrict || !selectedBlock) {
      setVillages([]);
      return;
    }

    const fetchVillageData = async () => {
      setLoadingVillages(true);
      setFetchError("");
      setFetchNotice("");
      setDataSourceMode("unknown");

      try {
        const candidateUrls = buildVillageUrls(
          selectedState.label,
          selectedDistrict.label,
          selectedBlock.label
        );

        let resolvedVillages = null;

        for (const url of candidateUrls) {
          const response = await fetch(url);
          if (!response.ok) continue;

          const payload = await response.json();
          const parsed = parseVillagePayload(payload);

          if (parsed && parsed.length > 0) {
            resolvedVillages = parsed;
            break;
          }
        }

        const villageHasMetrics = hasComparisonSignals(resolvedVillages);

        const mwsUrls = buildMwsUrls(
          selectedState.label,
          selectedDistrict.label,
          selectedBlock.label
        );

        let derivedVillages = null;

        for (const url of mwsUrls) {
          const response = await fetch(url);
          if (!response.ok) continue;

          const payload = await response.json();
          const parsed = parseVillagePayload(payload);
          if (!parsed || !parsed.length) continue;

          const transformed = deriveVillageRecordsFromMws(parsed);
          if (transformed.length) {
            derivedVillages = transformed;
            break;
          }
        }

        if (resolvedVillages && villageHasMetrics) {
          setVillages(resolvedVillages);
          setDataSourceMode("village");
          return;
        }

        if (!derivedVillages && resolvedVillages) {
          setVillages(resolvedVillages);
          setDataSourceMode("limited");
          setFetchNotice(
            t("regionComparison.messages.limitedVillageMetrics")
          );
          return;
        }

        if (!derivedVillages) {
          throw new Error("No village records returned by API or MWS fallback");
        }

        setVillages(derivedVillages);
        setDataSourceMode("mws");
        setFetchNotice(
          resolvedVillages && !villageHasMetrics
            ? t("regionComparison.messages.fallbackToMwsMissingMetrics")
            : t("regionComparison.messages.fallbackToMwsUnavailableVillage")
        );
      } catch (error) {
        setVillages([]);
        setDataSourceMode("unavailable");
        setFetchError(t("regionComparison.messages.fetchError"));
      } finally {
        setLoadingVillages(false);
      }
    };

    fetchVillageData();
  }, [selectedState, selectedDistrict, selectedBlock, t]);

  const stateOptions = useMemo(
    () =>
      statesData.map((item) => ({
        value: String(item.state_id),
        label: translateLocationLabel("states", item.label),
      })),
    [statesData, i18n.language]
  );

  const districtOptions = useMemo(
    () =>
      (selectedState?.district || []).map((item) => ({
        value: String(item.district_id),
        label: translateLocationLabel("districts", item.label),
      })),
    [selectedState, i18n.language]
  );

  const blockOptions = useMemo(
    () =>
      (selectedDistrict?.blocks || []).map((item) => ({
        value: String(item.block_id),
        label: translateLocationLabel("blocks", item.label),
      })),
    [selectedDistrict, i18n.language]
  );

  const villageOptions = useMemo(
    () =>
      villages
        .map((item) => ({
          value: String(item.village_id),
          label: getVillageName(item, `Village ${item.village_id}`),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [villages]
  );

  const villageAOptions = useMemo(
    () =>
      villageOptions.filter((item) =>
        selectedVillageBId ? item.value !== selectedVillageBId : true
      ),
    [villageOptions, selectedVillageBId]
  );

  const villageBOptions = useMemo(
    () =>
      villageOptions.filter((item) =>
        selectedVillageAId ? item.value !== selectedVillageAId : true
      ),
    [villageOptions, selectedVillageAId]
  );

  const beforeComparison = useMemo(
    () =>
      buildVillageComparison({
        villages,
        villageAId: selectedVillageAId,
        villageBId: selectedVillageBId,
      }),
    [villages, selectedVillageAId, selectedVillageBId]
  );

  const metricKeyMap = useMemo(
    () => ({
      rainfall:
        beforeComparison.metrics?.find((metric) => metric.type === "rainfall")?.key ||
        null,
      crops:
        beforeComparison.metrics?.find((metric) => metric.type === "crops")?.key ||
        null,
      water:
        beforeComparison.metrics?.find((metric) => metric.type === "water")?.key ||
        null,
    }),
    [beforeComparison]
  );

  const scenarioVillages = useMemo(
    () =>
      applyScenarioAdjustments(
        villages,
        selectedVillageAId,
        selectedVillageBId,
        metricKeyMap,
        scenarioA,
        scenarioB
      ),
    [villages, selectedVillageAId, selectedVillageBId, metricKeyMap, scenarioA, scenarioB]
  );

  const afterComparison = useMemo(
    () =>
      buildVillageComparison({
        villages: scenarioVillages,
        villageAId: selectedVillageAId,
        villageBId: selectedVillageBId,
      }),
    [scenarioVillages, selectedVillageAId, selectedVillageBId]
  );

  const beforeRanks = useMemo(
    () => buildRankMap(villages, beforeComparison),
    [villages, beforeComparison]
  );

  const afterRanks = useMemo(
    () => buildRankMap(scenarioVillages, afterComparison),
    [scenarioVillages, afterComparison]
  );

  const rankShift = useMemo(() => {
    const aId = String(selectedVillageAId || "");
    const bId = String(selectedVillageBId || "");
    if (!aId || !bId) return null;

    const rankA1 = beforeRanks[aId];
    const rankB1 = beforeRanks[bId];
    const rankA2 = afterRanks[aId];
    const rankB2 = afterRanks[bId];
    if (!rankA1 || !rankB1 || !rankA2 || !rankB2) return null;

    const movedA = rankA1 - rankA2;
    const movedB = rankB1 - rankB2;
    return {
      rankA1,
      rankA2,
      rankB1,
      rankB2,
      movedA,
      movedB,
    };
  }, [selectedVillageAId, selectedVillageBId, beforeRanks, afterRanks]);

  const confidenceLevel = useMemo(() => {
    if (!afterComparison.ready) return t("regionComparison.confidence.low");
    const missingCount = afterComparison.metrics.filter((m) => !m.key).length;
    if (dataSourceMode === "village" && missingCount === 0) {
      return t("regionComparison.confidence.high");
    }
    if (dataSourceMode === "mws" || dataSourceMode === "limited" || missingCount > 0) {
      return t("regionComparison.confidence.medium");
    }
    return t("regionComparison.confidence.low");
  }, [afterComparison, dataSourceMode, t]);

  const handleStateChange = (value) => {
    setSelectedStateId(value);
    setSelectedDistrictId("");
    setSelectedBlockId("");
    setSelectedVillageAId("");
    setSelectedVillageBId("");
    setVillages([]);
    setScenarioA(SCENARIO_DEFAULT);
    setScenarioB(SCENARIO_DEFAULT);
  };

  const handleDistrictChange = (value) => {
    setSelectedDistrictId(value);
    setSelectedBlockId("");
    setSelectedVillageAId("");
    setSelectedVillageBId("");
    setVillages([]);
    setScenarioA(SCENARIO_DEFAULT);
    setScenarioB(SCENARIO_DEFAULT);
  };

  const handleBlockChange = (value) => {
    setSelectedBlockId(value);
    setSelectedVillageAId("");
    setSelectedVillageBId("");
    setScenarioA(SCENARIO_DEFAULT);
    setScenarioB(SCENARIO_DEFAULT);
  };

  const updateScenario = (target, field, value) => {
    const parsed = Number(value);
    const safeValue = Number.isFinite(parsed) ? parsed : 0;

    if (target === "A") {
      setScenarioA((prev) => ({ ...prev, [field]: safeValue }));
      return;
    }
    setScenarioB((prev) => ({ ...prev, [field]: safeValue }));
  };

  const resetScenario = () => {
    setScenarioA(SCENARIO_DEFAULT);
    setScenarioB(SCENARIO_DEFAULT);
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setAssistantError(t("regionComparison.ai.voiceUnsupported"));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = getSpeechLocale(i18n.language);
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setAssistantError("");
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        setAssistantQuery((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };

    recognition.onerror = () => {
      setAssistantError(t("regionComparison.ai.voiceError"));
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const askAssistant = async () => {
    if (!assistantQuery.trim()) {
      setAssistantError(t("regionComparison.ai.enterQuestion"));
      return;
    }

    setAssistantLoading(true);
    setAssistantError("");
    setAssistantResponse("");
    setTypedAssistantResponse("");

    const context = {
      location: {
        state: selectedState?.label || null,
        district: selectedDistrict?.label || null,
        block: selectedBlock?.label || null,
      },
      selectedVillages: {
        villageA: afterComparison.villageAName || null,
        villageB: afterComparison.villageBName || null,
      },
      dataSourceMode,
      scenario: {
        villageA: scenarioA,
        villageB: scenarioB,
      },
      metrics: afterComparison.metrics?.map((metric) => ({
        type: metric.type,
        sourceColumn: metric.key || null,
        villageAValue: metric.valueA,
        villageBValue: metric.valueB,
        villageAScore: metric.scoreA,
        villageBScore: metric.scoreB,
        winnerCode: metric.winnerCode,
      })),
      summary: afterComparison.summary || null,
    };

    try {
      const answer = await askGeminiRegionalAssistant({
        question: assistantQuery.trim(),
        languageCode: i18n.language,
        context,
      });
      setAssistantResponse(answer);
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("MISSING_GEMINI_KEY")) {
        setAssistantError(t("regionComparison.ai.missingApiKey"));
      } else {
        setAssistantError(t("regionComparison.ai.requestFailed"));
      }
    } finally {
      setAssistantLoading(false);
    }
  };

  useEffect(() => {
    if (!assistantResponse) {
      setTypedAssistantResponse("");
      return;
    }

    const tokens = assistantResponse.match(/\S+|\s+/g) || [];
    if (!tokens.length) {
      setTypedAssistantResponse(assistantResponse);
      return;
    }

    let index = 0;
    setTypedAssistantResponse("");

    const timer = setInterval(() => {
      index += 1;
      setTypedAssistantResponse(tokens.slice(0, index).join(""));
      if (index >= tokens.length) {
        clearInterval(timer);
      }
    }, 45);

    return () => clearInterval(timer);
  }, [assistantResponse]);

  return (
    <div className="min-h-screen bg-slate-50">
      <LandingNavbar />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t("regionComparison.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {t("regionComparison.subtitle")}
            </p>
          </div>
          <Link
            to="/"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            {t("regionComparison.backToHome")}
          </Link>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label={t("regionComparison.state")}
              value={selectedStateId}
              options={stateOptions}
              onChange={handleStateChange}
              disabled={loadingStates}
              placeholder={t("regionComparison.selectState")}
            />

            <SelectField
              label={t("regionComparison.district")}
              value={selectedDistrictId}
              options={districtOptions}
              onChange={handleDistrictChange}
              disabled={!selectedState}
              placeholder={t("regionComparison.selectDistrict")}
            />

            <SelectField
              label={t("regionComparison.block")}
              value={selectedBlockId}
              options={blockOptions}
              onChange={handleBlockChange}
              disabled={!selectedDistrict}
              placeholder={t("regionComparison.selectBlock")}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SelectField
              label={t("regionComparison.villageA")}
              value={selectedVillageAId}
              options={villageAOptions}
              onChange={setSelectedVillageAId}
              disabled={!selectedBlock || loadingVillages}
              placeholder={t("regionComparison.selectVillageA")}
            />
            <SelectField
              label={t("regionComparison.villageB")}
              value={selectedVillageBId}
              options={villageBOptions}
              onChange={setSelectedVillageBId}
              disabled={!selectedBlock || loadingVillages}
              placeholder={t("regionComparison.selectVillageB")}
            />
          </div>

          {selectedVillageAId &&
            selectedVillageBId &&
            selectedVillageAId === selectedVillageBId && (
              <p className="mt-4 text-sm text-amber-700">
                {t("regionComparison.messages.selectDifferentVillages")}
              </p>
            )}

          {loadingVillages && (
            <p className="mt-4 text-sm text-blue-700">{t("regionComparison.messages.loadingVillageData")}</p>
          )}
          {fetchNotice && <p className="mt-4 text-sm text-amber-700">{fetchNotice}</p>}
          {fetchError && <p className="mt-4 text-sm text-red-700">{fetchError}</p>}
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {t("regionComparison.simulator.title")}
            </h2>
            <button
              type="button"
              onClick={resetScenario}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {t("regionComparison.simulator.reset")}
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {t("regionComparison.simulator.subtitle")}
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">
                {t("regionComparison.villageA")}
              </p>
              <div className="mt-3 space-y-3">
                <label className="block text-sm text-slate-700">
                  {t("regionComparison.metrics.rainfall")} (%)
                  <input
                    type="range"
                    min="-30"
                    max="50"
                    value={scenarioA.rainfallPct}
                    onChange={(e) => updateScenario("A", "rainfallPct", e.target.value)}
                    className="mt-1 w-full"
                  />
                  <span className="text-xs text-slate-500">
                    {scenarioA.rainfallPct > 0 ? "+" : ""}
                    {scenarioA.rainfallPct}%
                  </span>
                </label>

                <label className="block text-sm text-slate-700">
                  {t("regionComparison.metrics.crops")} (%)
                  <input
                    type="range"
                    min="-30"
                    max="50"
                    value={scenarioA.cropsPct}
                    onChange={(e) => updateScenario("A", "cropsPct", e.target.value)}
                    className="mt-1 w-full"
                  />
                  <span className="text-xs text-slate-500">
                    {scenarioA.cropsPct > 0 ? "+" : ""}
                    {scenarioA.cropsPct}%
                  </span>
                </label>

                <label className="block text-sm text-slate-700">
                  {t("regionComparison.metrics.water")} (%)
                  <input
                    type="range"
                    min="-30"
                    max="50"
                    value={scenarioA.waterPct}
                    onChange={(e) => updateScenario("A", "waterPct", e.target.value)}
                    className="mt-1 w-full"
                  />
                  <span className="text-xs text-slate-500">
                    {scenarioA.waterPct > 0 ? "+" : ""}
                    {scenarioA.waterPct}%
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">
                {t("regionComparison.villageB")}
              </p>
              <div className="mt-3 space-y-3">
                <label className="block text-sm text-slate-700">
                  {t("regionComparison.metrics.rainfall")} (%)
                  <input
                    type="range"
                    min="-30"
                    max="50"
                    value={scenarioB.rainfallPct}
                    onChange={(e) => updateScenario("B", "rainfallPct", e.target.value)}
                    className="mt-1 w-full"
                  />
                  <span className="text-xs text-slate-500">
                    {scenarioB.rainfallPct > 0 ? "+" : ""}
                    {scenarioB.rainfallPct}%
                  </span>
                </label>

                <label className="block text-sm text-slate-700">
                  {t("regionComparison.metrics.crops")} (%)
                  <input
                    type="range"
                    min="-30"
                    max="50"
                    value={scenarioB.cropsPct}
                    onChange={(e) => updateScenario("B", "cropsPct", e.target.value)}
                    className="mt-1 w-full"
                  />
                  <span className="text-xs text-slate-500">
                    {scenarioB.cropsPct > 0 ? "+" : ""}
                    {scenarioB.cropsPct}%
                  </span>
                </label>

                <label className="block text-sm text-slate-700">
                  {t("regionComparison.metrics.water")} (%)
                  <input
                    type="range"
                    min="-30"
                    max="50"
                    value={scenarioB.waterPct}
                    onChange={(e) => updateScenario("B", "waterPct", e.target.value)}
                    className="mt-1 w-full"
                  />
                  <span className="text-xs text-slate-500">
                    {scenarioB.waterPct > 0 ? "+" : ""}
                    {scenarioB.waterPct}%
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("regionComparison.ai.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("regionComparison.ai.subtitle")}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAssistantQuery(t("regionComparison.ai.prompts.crop"))}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              {t("regionComparison.ai.promptCropLabel")}
            </button>
            <button
              type="button"
              onClick={() => setAssistantQuery(t("regionComparison.ai.prompts.water"))}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              {t("regionComparison.ai.promptWaterLabel")}
            </button>
            <button
              type="button"
              onClick={() => setAssistantQuery(t("regionComparison.ai.prompts.plan"))}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              {t("regionComparison.ai.promptPlanLabel")}
            </button>
          </div>

          <div className="mt-4">
            <textarea
              value={assistantQuery}
              onChange={(e) => setAssistantQuery(e.target.value)}
              rows={3}
              placeholder={t("regionComparison.ai.placeholder")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={askAssistant}
                disabled={assistantLoading}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {assistantLoading
                  ? t("regionComparison.ai.asking")
                  : t("regionComparison.ai.ask")}
              </button>
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={isListening}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {isListening
                  ? t("regionComparison.ai.listening")
                  : t("regionComparison.ai.voice")}
              </button>
            </div>
          </div>

          {assistantError && (
            <p className="mt-3 text-sm text-red-700">{assistantError}</p>
          )}
          {assistantResponse && (
            <div className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
              {typedAssistantResponse}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">{t("regionComparison.comparisonOutput")}</h2>

          {!afterComparison.ready ? (
            <p className="mt-3 text-sm text-slate-600">
              {t(afterComparison.reasonKey || "regionComparison.messages.selectValidVillages")}
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {t("regionComparison.simulator.confidence")}: {confidenceLevel}
                </span>
                {rankShift && (
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {t("regionComparison.simulator.rankShift")}: A {rankShift.rankA1}→{rankShift.rankA2}, B {rankShift.rankB1}→{rankShift.rankB2}
                  </span>
                )}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="px-2 py-2 font-semibold">{t("regionComparison.metric")}</th>
                      <th className="px-2 py-2 font-semibold">{t("regionComparison.villageA")}</th>
                      <th className="px-2 py-2 font-semibold">{t("regionComparison.villageB")}</th>
                      <th className="px-2 py-2 font-semibold">{t("regionComparison.winner.title")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {afterComparison.metrics.map((metric) => {
                      const beforeMetric = beforeComparison.metrics?.find(
                        (row) => row.type === metric.type
                      );

                      return (
                      <tr key={metric.type} className="border-b border-slate-100">
                        <td className="px-2 py-3">
                          <div className="font-medium text-slate-900">
                            {t(`regionComparison.metrics.${metric.type}`)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {t("regionComparison.sourceColumn")}: {metric.keyLabel || t("regionComparison.notAvailable")}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-slate-700">
                          <div>
                            {t("regionComparison.value")}: {formatValue(metric.valueA)} {metric.unit !== "index" ? metric.unit : ""}
                          </div>
                          <div className="text-xs text-slate-500">
                            {t("regionComparison.before")}: {formatValue(beforeMetric?.valueA ?? null)} {metric.unit !== "index" ? metric.unit : ""}
                          </div>
                          <div className="text-xs text-slate-500">
                            {t("regionComparison.score")}: {metric.scoreA === null ? t("regionComparison.notAvailableShort") : metric.scoreA.toFixed(1)}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-slate-700">
                          <div>
                            {t("regionComparison.value")}: {formatValue(metric.valueB)} {metric.unit !== "index" ? metric.unit : ""}
                          </div>
                          <div className="text-xs text-slate-500">
                            {t("regionComparison.before")}: {formatValue(beforeMetric?.valueB ?? null)} {metric.unit !== "index" ? metric.unit : ""}
                          </div>
                          <div className="text-xs text-slate-500">
                            {t("regionComparison.score")}: {metric.scoreB === null ? t("regionComparison.notAvailableShort") : metric.scoreB.toFixed(1)}
                          </div>
                        </td>
                        <td className="px-2 py-3 font-semibold text-emerald-700">
                          {getWinnerText(
                            metric.winnerCode,
                            afterComparison.villageAName,
                            afterComparison.villageBName
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 rounded-lg bg-slate-900 p-4 text-sm text-white">
                <p className="text-base font-semibold">
                  {afterComparison.villageAName} vs {afterComparison.villageBName}
                </p>
                <ul className="mt-2 space-y-1 text-slate-100">
                  <li>
                    {t("regionComparison.metrics.water")}:{" "}
                    {getWinnerText(
                      afterComparison.summary.water,
                      afterComparison.villageAName,
                      afterComparison.villageBName
                    )}
                  </li>
                  <li>
                    {t("regionComparison.metrics.crops")}:{" "}
                    {getWinnerText(
                      afterComparison.summary.crops,
                      afterComparison.villageAName,
                      afterComparison.villageBName
                    )}
                  </li>
                  <li>
                    {t("regionComparison.metrics.rainfall")}:{" "}
                    {getWinnerText(
                      afterComparison.summary.rainfall,
                      afterComparison.villageAName,
                      afterComparison.villageBName
                    )}
                  </li>
                </ul>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default RegionComparison;
