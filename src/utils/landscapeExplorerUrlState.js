/**
 * Serialize / deserialize Landscape Explorer map state for shareable URLs.
 * Query params: state, district, block, layers, lulc1–3, lng, lat, zoom
 */

export const LULC_YEAR_OPTIONS = [
  { label: "None", value: null },
  { label: "2017-2018", value: "17_18" },
  { label: "2018-2019", value: "18_19" },
  { label: "2019-2020", value: "19_20" },
  { label: "2020-2021", value: "20_21" },
  { label: "2021-2022", value: "21_22" },
  { label: "2022-2023", value: "22_23" },
];

export function lulcYearFromParam(value) {
  if (value == null || value === "" || value === "null") return null;
  const found = LULC_YEAR_OPTIONS.find((o) => o.value === value);
  return found ?? null;
}

/** Base toggled layer flags (matches resetAllStates in LandscapeExplorer). */
export function getDefaultToggledLayers() {
  return {
    demographics: true,
    drainage: false,
    remote_sensed_waterbodies: false,
    hydrological_boundaries: false,
    clart: false,
    mws_layers: false,
    nrega: false,
    drought: false,
    terrain: false,
    administrative_boundaries: false,
    cropping_intensity: false,
    terrain_vector: false,
    terrain_lulc_slope: false,
    terrain_lulc_plain: false,
    settlement: false,
    water_structure: false,
    well_structure: false,
    agri_structure: false,
    livelihood_structure: false,
    recharge_structure: false,
    afforestation: false,
    deforestation: false,
    degradation: false,
    urbanization: false,
    cropintensity: false,
    cropIntensity: false,
    soge: false,
    aquifer: false,
  };
}

function normalizeLayerKey(key) {
  if (key === "cropIntensity") return "cropintensity";
  return key;
}

/**
 * @param {string | null} layersParam — comma-separated layer ids
 * @returns {Record<string, boolean> | null} null if no param
 */
export function toggledLayersFromLayersParam(layersParam) {
  if (layersParam == null || String(layersParam).trim() === "") return null;
  const keys = String(layersParam)
    .split(",")
    .map((k) => normalizeLayerKey(k.trim()))
    .filter(Boolean);
  const next = { ...getDefaultToggledLayers() };
  Object.keys(next).forEach((k) => {
    next[k] = false;
  });
  keys.forEach((k) => {
    next[k] = true;
    if (k === "cropintensity") next.cropIntensity = true;
  });
  if (!keys.length) {
    next.demographics = true;
  }
  return next;
}

export function findLocationInStatesData(statesData, stateLabel, districtLabel, blockLabel) {
  if (!statesData || !stateLabel) return null;
  const st = statesData.find((s) => s.label === stateLabel);
  if (!st) return null;
  const dist =
    districtLabel && st.district
      ? st.district.find((d) => d.label === districtLabel)
      : null;
  const blk =
    dist && blockLabel && dist.blocks
      ? dist.blocks.find((b) => b.label === blockLabel)
      : null;
  return { state: st, district: dist, block: blk };
}

export function parseViewParams(searchParams) {
  const lng = parseFloat(searchParams.get("lng"));
  const lat = parseFloat(searchParams.get("lat"));
  const zoom = parseFloat(searchParams.get("zoom"));
  if (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    Number.isFinite(zoom) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90 &&
    zoom >= 0 &&
    zoom <= 30
  ) {
    return { center: [lng, lat], zoom };
  }
  return null;
}

export function buildSearchParams({
  state,
  district,
  block,
  toggledLayers,
  lulcYear1,
  lulcYear2,
  lulcYear3,
  mapView,
}) {
  const p = new URLSearchParams();
  if (state?.label) p.set("state", state.label);
  if (district?.label) p.set("district", district.label);
  if (block?.label) p.set("block", block.label);

  const active = Object.entries(toggledLayers || {})
    .filter(([, v]) => v)
    .map(([k]) => (k === "cropIntensity" ? "cropintensity" : k));
  const unique = [...new Set(active)];
  if (unique.length) p.set("layers", unique.join(","));

  if (lulcYear1?.value) p.set("lulc1", lulcYear1.value);
  if (lulcYear2?.value) p.set("lulc2", lulcYear2.value);
  if (lulcYear3?.value) p.set("lulc3", lulcYear3.value);

  if (
    mapView?.center &&
    Array.isArray(mapView.center) &&
    mapView.center.length >= 2 &&
    typeof mapView.zoom === "number"
  ) {
    p.set("lng", String(mapView.center[0]));
    p.set("lat", String(mapView.center[1]));
    p.set("zoom", String(mapView.zoom));
  }

  return p;
}

export function hasUrlMapParams(searchParams) {
  return (
    searchParams.get("state") ||
    searchParams.get("district") ||
    searchParams.get("block") ||
    searchParams.get("layers") ||
    searchParams.get("lng")
  );
}
