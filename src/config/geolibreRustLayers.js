const DEFAULT_GEOSERVER_URL =
  "https://geoserver.core-stack.org:8443/geoserver";

const QML_RAW_BASE =
  "https://raw.githubusercontent.com/core-stack-org/QGIS-Styles/main";

const qmlStyle = (path) => `${QML_RAW_BASE}/${path}`;

export const GEOLIBRE_RUST_LULC_YEARS = [
  { label: "2017-2018", value: "17_18" },
  { label: "2018-2019", value: "18_19" },
  { label: "2019-2020", value: "19_20" },
  { label: "2020-2021", value: "20_21" },
  { label: "2021-2022", value: "21_22" },
  { label: "2022-2023", value: "22_23" },
  { label: "2023-2024", value: "23_24" },
  { label: "2024-2025", value: "24_25" },
];

const VECTOR_LAYERS = [
  {
    id: "administrative_boundaries",
    label: "Administrative Boundaries",
    domain: "Demographic",
    workspace: "panchayat_boundaries",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
    qmlStyleUrl: qmlStyle("Demographic/Administrative-Boundary-Style.qml"),
  },
  {
    id: "demographics",
    label: "Socio-Economic Profile",
    domain: "Demographic",
    workspace: "panchayat_boundaries",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
    qmlStyleUrl: qmlStyle("Demographic/literary_rate_style.qml"),
  },
  {
    id: "mws_layers",
    label: "Micro-watersheds and Hydrological Variables",
    domain: "Hydrology",
    workspace: "mws_layers",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) =>
      `deltaG_well_depth_${district}_${tehsil}`,
    qmlStyleUrl: qmlStyle("Climate/MWS-Well-Depth-18_23.qml"),
  },
  {
    id: "hydrological_boundaries",
    label: "Hydrological Boundaries",
    domain: "Hydrology",
    workspace: "mws_layers",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) =>
      `deltaG_well_depth_${district}_${tehsil}`,
    qmlStyleUrl: qmlStyle("Climate/MWS-Well-Depth-18_23.qml"),
  },
  {
    id: "mws_layers_fortnight",
    label: "Fortnightly Hydrological Variables",
    domain: "Hydrology",
    workspace: "mws_layers",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) =>
      `deltaG_fortnight_${district}_${tehsil}`,
    qmlStyleUrl: qmlStyle("Hydrology/water_balance_fortnightly.qml"),
  },
  {
    id: "terrain_vector",
    label: "Terrain Vector",
    domain: "Land",
    workspace: "terrain",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_cluster`,
    qmlStyleUrl: qmlStyle("Land/Terrain-Vector-Layer-Style.qml"),
  },
  {
    id: "drainage",
    label: "Drainage",
    domain: "Hydrology",
    workspace: "drainage",
    geometryType: "line",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
    qmlStyleUrl: qmlStyle("Hydrology/Drainage-Layer-Style.qml"),
  },
  {
    id: "remote_sensed_waterbodies",
    label: "Remote-Sensed Waterbodies",
    domain: "Hydrology",
    workspace: "swb",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) =>
      `surface_waterbodies_${district}_${tehsil}`,
    qmlStyleUrl: qmlStyle("Hydrology/Surface-Waterbody-style.qml"),
  },
  {
    id: "soge",
    label: "Stage of Groundwater Extraction",
    domain: "Hydrology",
    workspace: "soge",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) => `soge_vector_${district}_${tehsil}`,
    qmlStyleUrl: qmlStyle("Hydrology/SOGE_style.qml"),
  },
  {
    id: "aquifer",
    label: "Aquifer",
    domain: "Hydrology",
    workspace: "aquifer",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) =>
      `aquifer_vector_${district}_${tehsil}`,
    qmlStyleUrl: qmlStyle("Hydrology/Aquifer_style.qml"),
  },
  {
    id: "cropping_intensity",
    label: "Cropping Intensity",
    domain: "Agriculture",
    workspace: "crop_intensity",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_intensity`,
    qmlStyleUrl: qmlStyle("Agriculture/Cropping_intensity.qml"),
  },
  {
    id: "drought",
    label: "Drought",
    domain: "Agriculture",
    workspace: "drought",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_drought`,
    qmlStyleUrl: qmlStyle("Agriculture/Drought_style.qml"),
  },
  {
    id: "nrega",
    label: "NREGA Assets",
    domain: "NREGA",
    workspace: "nrega_assets",
    geometryType: "point",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
  },
].map((layer) => ({ ...layer, sourceType: "vector" }));

const RASTER_LAYERS = [
  {
    id: "terrain",
    label: "Terrain",
    domain: "Land",
    workspace: "terrain",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_terrain_raster`,
    wmsStyle: "terrain:terrain_raster",
    qmlStyleUrl: qmlStyle("Land/terrain_1-12class.qml"),
    continuous: true,
  },
  {
    id: "clart",
    label: "CLART",
    domain: "Hydrology",
    workspace: "clart",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_clart`,
    wmsStyle: "clart:testClart",
    qmlStyleUrl: qmlStyle("Hydrology/CLART-Layer-Style.qml"),
  },
  {
    id: "afforestation",
    label: "Change Detection: Afforestation",
    domain: "Restoration",
    workspace: "change_detection",
    layerName: ({ district, tehsil }) =>
      `change_${district}_${tehsil}_Afforestation`,
    wmsStyle: "change_detection:afforestation",
    qmlStyleUrl: qmlStyle("Land/change_tree_cover_gain.qml"),
  },
  {
    id: "deforestation",
    label: "Change Detection: Deforestation",
    domain: "Restoration",
    workspace: "change_detection",
    layerName: ({ district, tehsil }) =>
      `change_${district}_${tehsil}_Deforestation`,
    wmsStyle: "change_detection:deforestation",
    qmlStyleUrl: qmlStyle("Land/change_tree_cover_loss.qml"),
  },
  {
    id: "degradation",
    label: "Change Detection: Degradation",
    domain: "Restoration",
    workspace: "change_detection",
    layerName: ({ district, tehsil }) =>
      `change_${district}_${tehsil}_Degradation`,
    wmsStyle: "change_detection:degradation",
    qmlStyleUrl: qmlStyle("Land/change_cropping_reduction.qml"),
  },
  {
    id: "urbanization",
    label: "Change Detection: Urbanization",
    domain: "Restoration",
    workspace: "change_detection",
    layerName: ({ district, tehsil }) =>
      `change_${district}_${tehsil}_Urbanization`,
    wmsStyle: "change_detection:urbanization",
    qmlStyleUrl: qmlStyle("Land/change_urbanization.qml"),
  },
  {
    id: "cropintensity",
    label: "Change Detection: Crop Intensity",
    domain: "Restoration",
    workspace: "change_detection",
    layerName: ({ district, tehsil }) =>
      `change_${district}_${tehsil}_CropIntensity`,
    wmsStyle: "change_detection:cropintensity",
    qmlStyleUrl: qmlStyle("Land/change_cropping_intensity.qml"),
  },
  {
    id: "restoration",
    label: "Restoration Opportunities",
    domain: "Restoration",
    workspace: "restoration",
    layerName: ({ district, tehsil }) =>
      `restoration_${district}_${tehsil}_raster`,
    wmsStyle: "restoration:restoration_style",
    qmlStyleUrl: qmlStyle("Restoration/Restoration_style.qml"),
  },
].map((layer) => ({ ...layer, sourceType: "raster" }));

const LULC_LEVELS = [
  {
    id: "lulc_level_1",
    label: "LULC Level 1",
    domain: "Land",
    workspace: "LULC_level_1",
    wmsStyle: "LULC_level_1:lulc_level_1_style",
    qmlStyleUrl: qmlStyle("Land/level-1-op.qml"),
  },
  {
    id: "lulc_level_2",
    label: "LULC Level 2",
    domain: "Land",
    workspace: "LULC_level_2",
    wmsStyle: "LULC_level_2:lulc_level_2_style",
    qmlStyleUrl: qmlStyle("Land/level-2.qml"),
  },
  {
    id: "lulc_level_3",
    label: "LULC Level 3",
    domain: "Agriculture",
    workspace: "LULC_level_3",
    wmsStyle: "LULC_level_3:lulc_level_3_style",
    qmlStyleUrl: qmlStyle("Agriculture/level-3.qml"),
  },
];

const LULC_LAYERS = LULC_LEVELS.flatMap((level, index) =>
  GEOLIBRE_RUST_LULC_YEARS.map((year) => ({
    ...level,
    id: `${level.id}_${year.value}`,
    baseId: level.id,
    label: `${level.label} · ${year.label}`,
    sourceType: "raster",
    year: year.value,
    layerName: ({ district, tehsil }) =>
      `LULC_${year.value}_${district}_${tehsil}_level_${index + 1}`,
  }))
);

export const GEOLIBRE_RUST_LAYERS = Object.freeze([
  ...VECTOR_LAYERS,
  ...RASTER_LAYERS,
  ...LULC_LAYERS,
]);

export const GEOLIBRE_RUST_DOMAINS = Object.freeze([
  "Land",
  "Hydrology",
  "Agriculture",
  "Restoration",
  "NREGA",
  "Demographic",
]);

export function formatGeoServerName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function buildGeoLibreRustSource(
  layer,
  location,
  geoserverUrl = process.env.REACT_APP_GEOSERVER_URL ||
    DEFAULT_GEOSERVER_URL
) {
  if (!layer || !location?.district || !location?.tehsil) {
    return null;
  }

  const names = {
    district: formatGeoServerName(location.district),
    tehsil: formatGeoServerName(location.tehsil),
  };
  const { layerName: buildLayerName, ...layerMetadata } = layer;
  const nativeName = buildLayerName(names);
  const qualifiedName = `${layer.workspace}:${nativeName}`;
  const root = geoserverUrl.replace(/\/+$/, "");
  const safeFileName = `${layer.id}_${names.district}_${names.tehsil}`;

  if (layer.sourceType === "vector") {
    const query = new URLSearchParams({
      service: "WFS",
      version: "1.0.0",
      request: "GetFeature",
      typeName: qualifiedName,
      outputFormat: "application/json",
      srsName: "EPSG:4326",
    });

    return {
      ...layerMetadata,
      nativeName,
      qualifiedName,
      fileName: safeFileName,
      endpoint: `${root}/${layer.workspace}/ows`,
      sourceUrl: `${root}/${layer.workspace}/ows?${query.toString()}`,
    };
  }

  return {
    ...layerMetadata,
    nativeName,
    qualifiedName,
    fileName: safeFileName,
    endpoint: `${root}/${layer.workspace}/wms`,
    sourceUrl: `${root}/${layer.workspace}/wms`,
  };
}

export function addBboxToWfsUrl(sourceUrl, bbox) {
  if (!sourceUrl || !Array.isArray(bbox) || bbox.length !== 4) {
    return sourceUrl;
  }

  const url = new URL(sourceUrl);
  url.searchParams.set("bbox", `${bbox.join(",")},EPSG:4326`);
  return url.toString();
}
