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
          return;
        }

        if (!derivedVillages && resolvedVillages) {
          setVillages(resolvedVillages);
          setFetchNotice(
            t("regionComparison.messages.limitedVillageMetrics")
          );
          return;
        }

        if (!derivedVillages) {
          throw new Error("No village records returned by API or MWS fallback");
        }

        setVillages(derivedVillages);
        setFetchNotice(
          resolvedVillages && !villageHasMetrics
            ? t("regionComparison.messages.fallbackToMwsMissingMetrics")
            : t("regionComparison.messages.fallbackToMwsUnavailableVillage")
        );
      } catch (error) {
        setVillages([]);
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

  const comparison = useMemo(
    () =>
      buildVillageComparison({
        villages,
        villageAId: selectedVillageAId,
        villageBId: selectedVillageBId,
      }),
    [villages, selectedVillageAId, selectedVillageBId]
  );

  const handleStateChange = (value) => {
    setSelectedStateId(value);
    setSelectedDistrictId("");
    setSelectedBlockId("");
    setSelectedVillageAId("");
    setSelectedVillageBId("");
    setVillages([]);
  };

  const handleDistrictChange = (value) => {
    setSelectedDistrictId(value);
    setSelectedBlockId("");
    setSelectedVillageAId("");
    setSelectedVillageBId("");
    setVillages([]);
  };

  const handleBlockChange = (value) => {
    setSelectedBlockId(value);
    setSelectedVillageAId("");
    setSelectedVillageBId("");
  };

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
          <h2 className="text-lg font-semibold text-slate-900">{t("regionComparison.comparisonOutput")}</h2>

          {!comparison.ready ? (
            <p className="mt-3 text-sm text-slate-600">
              {t(comparison.reasonKey || "regionComparison.messages.selectValidVillages")}
            </p>
          ) : (
            <>
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
                    {comparison.metrics.map((metric) => (
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
                            {t("regionComparison.score")}: {metric.scoreA === null ? t("regionComparison.notAvailableShort") : metric.scoreA.toFixed(1)}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-slate-700">
                          <div>
                            {t("regionComparison.value")}: {formatValue(metric.valueB)} {metric.unit !== "index" ? metric.unit : ""}
                          </div>
                          <div className="text-xs text-slate-500">
                            {t("regionComparison.score")}: {metric.scoreB === null ? t("regionComparison.notAvailableShort") : metric.scoreB.toFixed(1)}
                          </div>
                        </td>
                        <td className="px-2 py-3 font-semibold text-emerald-700">
                          {getWinnerText(
                            metric.winnerCode,
                            comparison.villageAName,
                            comparison.villageBName
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 rounded-lg bg-slate-900 p-4 text-sm text-white">
                <p className="text-base font-semibold">
                  {comparison.villageAName} vs {comparison.villageBName}
                </p>
                <ul className="mt-2 space-y-1 text-slate-100">
                  <li>
                    {t("regionComparison.metrics.water")}:{" "}
                    {getWinnerText(
                      comparison.summary.water,
                      comparison.villageAName,
                      comparison.villageBName
                    )}
                  </li>
                  <li>
                    {t("regionComparison.metrics.crops")}:{" "}
                    {getWinnerText(
                      comparison.summary.crops,
                      comparison.villageAName,
                      comparison.villageBName
                    )}
                  </li>
                  <li>
                    {t("regionComparison.metrics.rainfall")}:{" "}
                    {getWinnerText(
                      comparison.summary.rainfall,
                      comparison.villageAName,
                      comparison.villageBName
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
