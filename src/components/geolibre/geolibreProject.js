import { interpolateRampColors } from "@geolibre/core";
import { applyMissingDataStyle, boundaryColorForLayer, finiteMeasurement, hasLayerData, MISSING_DATA_COLOR, fixedPaletteExpression, naturalBreaksStyle, paletteCategories } from "./geolibreStyleUtils";
import {
  GEOLIBRE_CONFIG,
  GEOLIBRE_PROJECT_FORMAT_VERSION,
  resolveGeoLibreViewer,
} from "../../config/geolibre.config";
import {
  GEOLIBRE_LAYERS,
  GEOLIBRE_NREGA_CATEGORIES,
  GEOLIBRE_VECTOR_LAYERS,
} from "../../config/geolibreLayers";

const DEFAULT_GEOSERVER_URL =
  "https://geoserver.core-stack.org:8443/geoserver/";
const GOOGLE_SATELLITE_HYBRID_STYLE = {
  version: 8,
  name: "Google Satellite Hybrid",
  sources: {
    "google-satellite-hybrid": {
      type: "raster",
      tiles: ["https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"],
      tileSize: 256,
      attribution: "© Google",
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: "google-satellite-hybrid",
      type: "raster",
      source: "google-satellite-hybrid",
    },
  ],
};
export const DEFAULT_GEOLIBRE_BASEMAP_STYLE =
  process.env.REACT_APP_GEOLIBRE_BASEMAP_STYLE_URL ||
  `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(GOOGLE_SATELLITE_HYBRID_STYLE)
  )}`;
const EMPTY_FEATURE_COLLECTION = Object.freeze({
  type: "FeatureCollection",
  features: [],
});

const ANNUAL_WATER_BALANCE_YEAR_KEY = /^\d{4}_\d{4}$/;

// Average the DeltaG carried in each year-keyed JSON record so the layer can
// be colored on the full multi-year trend instead of one precomputed net
// field. A feature with no readable year record keeps a null average rather
// than a misleading zero.
export const withAverageDeltaG = (data) => ({
  ...data,
  features: (data?.features || []).map((feature) => {
    const properties = feature.properties || {};
    const deltaGValues = Object.entries(properties)
      .filter(([key]) => ANNUAL_WATER_BALANCE_YEAR_KEY.test(key))
      .map(([, value]) => {
        if (typeof value !== "string") return null;
        try {
          return finiteMeasurement(JSON.parse(value)?.DeltaG);
        } catch {
          return null;
        }
      })
      .filter((value) => value !== null);
    const avg_delta_g = deltaGValues.length
      ? deltaGValues.reduce((sum, value) => sum + value, 0) / deltaGValues.length
      : null;
    return { ...feature, properties: { ...properties, avg_delta_g } };
  }),
});

// Earlier- and later-generated Terrain Clusters layers publish the same
// cluster id under two field names: "terrainClu" or "terrainClusters".
// Normalize every feature onto "terrainClu", the field the categorized style
// keys on, so both schemas classify and color identically.
export const withNormalizedTerrainCluster = (data) => ({
  ...data,
  features: (data?.features || []).map((feature) => {
    const properties = feature.properties || {};
    if (Object.prototype.hasOwnProperty.call(properties, "terrainClu")) return feature;
    if (!Object.prototype.hasOwnProperty.call(properties, "terrainClusters")) return feature;
    return { ...feature, properties: { ...properties, terrainClu: properties.terrainClusters } };
  }),
});

// 13 published subsoil texture classes bin into 4 CoRE Stack soil-texture
// groups. Bin here into one derived field instead of listing all 13 raw
// values as separate categorized stops, so GeoLibre's native legend shows
// each of the 4 group labels once instead of repeating it per raw value.
export const SOIL_TEXTURE_BINS = [
  { label: "Coarse / Sandy", color: "#f5deb3", values: ["sand", "Loamy sand", "sandy loam"] },
  { label: "Medium / Loamy", color: "#d2b48c", values: ["Loam", "Silt loam", "Silt"] },
  { label: "Moderately Fine / Clay Loam", color: "#b5651d", values: ["Sandy clay loam", "Clay loam", "Silty clay loam"] },
  { label: "Fine / Clayey", color: "#8b4513", values: ["Sandy clay", "Silty clay", "Clay", "Clay (heavy)"] },
];
const SOIL_TEXTURE_CLASS_BY_VALUE = new Map(
  SOIL_TEXTURE_BINS.flatMap((bin) => bin.values.map((value) => [value, bin.label]))
);

export const withSoilTextureClass = (data) => ({
  ...data,
  features: (data?.features || []).map((feature) => {
    const properties = feature.properties || {};
    const soil_texture_class = SOIL_TEXTURE_CLASS_BY_VALUE.get(properties.subsoil_texture) ?? null;
    return { ...feature, properties: { ...properties, soil_texture_class } };
  }),
});

const FORTNIGHT_DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

// Decode date-keyed JSON records for inspection, then average their DeltaG so
// the layer can be colored on the full fortnightly trend. Keep malformed or
// missing values unchanged/excluded so missing data is never turned into zero.
export const parseFortnightRecords = data => ({
  ...data,
  features: (data?.features || []).map(feature => {
    const properties = Object.fromEntries(Object.entries(feature.properties || {}).map(([key, value]) => {
      if (FORTNIGHT_DATE_KEY.test(key) && typeof value === "string") {
        try { return [key, JSON.parse(value)]; } catch { /* Retain the source value. */ }
      }
      return [key, value];
    }));
    const deltaGValues = Object.entries(properties)
      .filter(([key]) => FORTNIGHT_DATE_KEY.test(key))
      .map(([, value]) => finiteMeasurement(value?.DeltaG))
      .filter(value => value !== null);
    const avg_delta_g = deltaGValues.length
      ? deltaGValues.reduce((sum, value) => sum + value, 0) / deltaGValues.length
      : null;
    return { ...feature, properties: { ...properties, avg_delta_g } };
  }),
});

const BASE_STYLE = {
  minZoom: 0,
  maxZoom: 24,
  fillColor: MISSING_DATA_COLOR,
  strokeColor: "#4c1d95",
  strokeWidth: 1.5,
  strokeWidthUnit: "pixels",
  fillOpacity: 0.48,
  circleRadius: 6,
  vectorStyleMode: "single",
  vectorStyleProperty: "",
  vectorStyleClassCount: 1,
  vectorStyleColorRamp: "viridis",
  vectorStyleClassificationScheme: "unique-values",
  vectorStyleStops: [],
  vectorStyleExpression: "",
  vectorRules: [],
};

const RASTER_STYLE = {
  ...BASE_STYLE,
  fillOpacity: 1,
  rasterBrightnessMin: 0,
  rasterBrightnessMax: 1,
  rasterSaturation: 0,
  rasterContrast: 0,
  rasterHueRotate: 0,
};

const categoryStyle = (property, stops, overrides = {}) => ({
  ...BASE_STYLE,
  ...overrides,
  fillColor: MISSING_DATA_COLOR,
  vectorStyleMode: "categorized",
  vectorStyleClassificationScheme: "first-values",
  vectorStyleProperty: property,
  vectorStyleClassCount: stops.length,
  vectorStyleStops: stops.map(([value, color, label]) => ({
    value,
    color,
    label,
  })),
});

const numericProperty = (field) => ["to-number", ["get", field], 0];
const cropFields = Array.from({ length: 8 }, (_, i) => `cropping_intensity_${2017 + i}`);
// Published drought data runs 2017-2022 only; there is no w_mod_2023 or later.
const DROUGHT_YEAR_COUNT = 6;
const droughtFields = Array.from({ length: DROUGHT_YEAR_COUNT }, (_, i) => [`w_mod_${2017 + i}`, `w_sev_${2017 + i}`]).flat();
const thematicStyle = { ...BASE_STYLE, strokeColor: "#232323", strokeWidth: 0.5 };

const STYLE_PROFILES = {
  boundary: {
    ...BASE_STYLE,
    fillColor: "#ffffff",
    fillOpacity: 0,
    strokeColor: "#111827",
    strokeWidth: 1.5,
  },
  demographics: fixedPaletteExpression({
    ...thematicStyle, fields: ["P_LIT", "TOT_P"],
    value: ["*", ["/", numericProperty("P_LIT"), ["max", numericProperty("TOT_P"), 1]], 100],
    guard: ["all", [">", numericProperty("TOT_P"), 0], [">=", numericProperty("P_LIT"), 0]],
    thresholds: [50, 60, 70, 80, 90], palette: "rdbu", fillOpacity: 0.8,
  }),
  facilities: naturalBreaksStyle("l2_essential_education_distance_km", "coolwarm", null, { ...thematicStyle, fillOpacity: 0.8 }),
  antyodaya: paletteCategories("maternal_child_health_cat_cluster", ["LOW", "MEDIUM", "HIGH"], "rdbu", { ...thematicStyle, fillOpacity: 0.8 }),
  livestock: naturalBreaksStyle("large_animals_total", "rdbu", null, { ...thematicStyle, fillOpacity: 0.8 }),
  terrain_vector: categoryStyle(
    "terrainClu",
    [
      ["0", "#324a1c", "Broad Sloppy and Hilly"],
      ["1", "#97c76b", "Mostly Plains"],
      ["2", "#673a13", "Mostly Hills and Valleys"],
      ["3", "#e5e059", "Broad Plains and Slopes"],
    ],
    { fillColor: "#e5e059", strokeColor: "#232323", fillOpacity: 0.75 }
  ),
  soil_type: categoryStyle(
    "soil_texture_class",
    SOIL_TEXTURE_BINS.map((bin) => [bin.label, bin.color, bin.label]),
    { fillColor: "#d2b48c", strokeColor: "#3a2412", fillOpacity: 0.8 }
  ),
  mws: fixedPaletteExpression({
    ...thematicStyle, fields: ["avg_delta_g"], value: numericProperty("avg_delta_g"),
    thresholds: [-50, -15, 0, 15, 50], palette: "rdbu", fillOpacity: 0.65,
  }),
  mws_fortnight: fixedPaletteExpression({
    ...thematicStyle, fields: ["avg_delta_g"], value: numericProperty("avg_delta_g"),
    thresholds: [-15, -5, 0, 5, 15], palette: "rdbu", fillOpacity: 0.65,
  }),
  drainage: categoryStyle(
    "ORDER",
    [
      ["1", "#03045e", "Stream order 1"],
      ["2", "#023e8a", "Stream order 2"],
      ["3", "#0077b6", "Stream order 3"],
      ["4", "#0096c7", "Stream order 4"],
      ["5", "#00b4d8", "Stream order 5"],
      ["6", "#48cae4", "Stream order 6"],
      ["7", "#90e0ef", "Stream order 7"],
      ["8", "#ade8f4", "Stream order 8"],
    ],
    { fillColor: "#03045e", strokeColor: "#03045e", strokeWidth: 2 }
  ),
  river: { ...BASE_STYLE, fillColor: "#1d4ed8", strokeColor: "#1d4ed8", strokeWidth: 1.5, fillOpacity: 0.8 },
  canal: { ...BASE_STYLE, fillColor: "#0891b2", strokeColor: "#0891b2", strokeWidth: 1.5, fillOpacity: 0.8 },
  waterbodies: fixedPaletteExpression({
    ...thematicStyle, fields: ["area_ored"], value: numericProperty("area_ored"),
    thresholds: [0.05, 0.1, 0.5, 1, 5], palette: "blues", fillOpacity: 0.75, strokeWidth: 0.25,
  }),
  soge: categoryStyle(
    "class",
    [
      ["Safe", "#b6c4e8", "Safe"],
      ["Semi-Critical", "#e6c2b5", "Semi-Critical"],
      ["Critical", "#e77c6a", "Critical"],
      ["Over Exploited", "#b40426", "Over Exploited"],
    ],
    { fillColor: "#3b3b3b", strokeColor: "#232323", fillOpacity: 0.72 }
  ),
  aquifer: categoryStyle(
    "Principal_",
    [
      ["Alluvium", "#fffdb5", "Alluvium"],
      ["Laterite", "#f3a425", "Laterite"],
      ["Basalt", "#99ecf1", "Basalt"],
      ["Sandstone", "#a5f8c5", "Sandstone"],
      ["Shale", "#f57c99", "Shale"],
      ["Limestone", "#e8d52e", "Limestone"],
      ["Granite", "#3c92f2", "Granite"],
      ["Schist", "#d5db21", "Schist"],
      ["Quartzite", "#cf7ff4", "Quartzite"],
      ["Charnockite", "#f4dbff", "Charnockite"],
      ["Khondalite", "#50c02b", "Khondalite"],
      ["Banded Gneissic Complex", "#ffe1b5", "Banded Gneissic Complex"],
      ["Gneiss", "#e4cff1", "Gneiss"],
      ["Intrusive", "#57d2ff", "Intrusive"],
    ],
    { fillColor: "#57d2ff", strokeColor: "#232323", fillOpacity: 0.72 }
  ),
  cropping_intensity: fixedPaletteExpression({
    ...thematicStyle, fields: cropFields, value: ["/", ["+", ...cropFields.map(numericProperty)], 8],
    thresholds: [1, 2], palette: "rdylgn", colors: interpolateRampColors("rdylgn", 6).slice(2, 5), fillOpacity: 0.7,
  }),
  drought: fixedPaletteExpression({
    ...thematicStyle, fields: droughtFields,
    value: ["+", ...Array.from({ length: DROUGHT_YEAR_COUNT }, (_, i) => ["case", [">", ["+", numericProperty(`w_mod_${2017 + i}`), numericProperty(`w_sev_${2017 + i}`)], 5], 1, 0])],
    thresholds: [1, 2], colors: ["#f4d03f", "#eb984e", "#e74c3c"], fillOpacity: 0.5,
  }),
  green_credit: {
    ...BASE_STYLE,
    fillColor: "#14d11d",
    strokeColor: "#14d11d",
    fillOpacity: 0.6,
  },
  industry_point: {
    ...BASE_STYLE,
    fillColor: "#ff0000",
    strokeColor: "#ffffff",
    strokeWidth: 1,
    fillOpacity: 1,
    circleRadius: 10,
  },
};

const LEGEND_PROFILES = {
  terrain: [
    ["V-shaped river valleys and deep narrow canyons", "#313695"],
    ["Lateral midslope drainage and local valleys", "#4575b4"],
    ["Upland drainage and stream headwaters", "#a50026"],
    ["U-shaped valleys", "#e0f3f8"],
    ["Broad flat areas", "#fffc00"],
    ["Broad open slopes", "#feb24c"],
    ["Mesa tops", "#f46d43"],
    ["Upper slopes", "#d73027"],
    ["Local ridges or hilltops", "#91bfdb"],
    ["Midslope divides or local ridges", "#800000"],
    ["Mountain tops or high ridges", "#4d0000"],
  ],
  dem: [
    ["0 m", "#0d0030"],
    ["50 m", "#1a0f6e"],
    ["100 m", "#1746a0"],
    ["150 m", "#1a72c0"],
    ["200 m", "#2191c0"],
    ["250 m", "#1aab9e"],
    ["300 m", "#16a085"],
    ["340 m", "#1cb870"],
    ["380 m", "#27ae60"],
    ["410 m", "#5ab836"],
    ["440 m", "#95c623"],
    ["470 m", "#d4d400"],
    ["500 m", "#f1c40f"],
    ["530 m", "#e09a30"],
    ["560 m", "#d4845a"],
    ["590 m", "#b0623a"],
    ["620 m", "#8b5e3c"],
    ["660 m", "#c4a882"],
    ["700 m or above", "#f5f0e8"],
  ],
  soil_health_raster_n: [
    ["High (>560 kg/ha)", "#73BB53"],
    ["Medium (280-560 kg/ha)", "#EEE05D"],
    ["Low (<280 kg/ha)", "#FF0000"],
  ],
  soil_health_raster_P: [
    ["Low (<10)", "#D73027"],
    ["Medium (10-25)", "#FEE08B"],
    ["High (>25)", "#1A9850"],
  ],
  soil_health_raster_K: [
    ["Low (<120 kg/ha)", "#FF0000"],
    ["Medium (120-280 kg/ha)", "#EEE05D"],
    ["High (>280 kg/ha)", "#73BB53"],
  ],
  soil_health_raster_OC: [
    ["Low (0-120 kg/ha)", "#C8E6C9"],
    ["Medium (120-280 kg/ha)", "#66BB6A"],
    ["High (>280 kg/ha)", "#2E7D32"],
  ],
  soil_health_raster_OC_OLM: [
    ["<=1% (Scrubs / Degraded land)", "#EF5350"],
    ["1-2% (Open Forests)", "#FFCA28"],
    ["2-3% (Moderately Dense Forest)", "#81C784"],
    [">3% (Very Dense Forest)", "#66BB6A"],
  ],
  clart: [
    ["Good recharge", "#4ee323"],
    ["Moderate recharge", "#f3ff33"],
    ["Surface-water harvesting", "#f21223"],
    ["Regeneration", "#b40f7d"],
    ["High-runoff zone", "#1774de"],
  ],
  afforestation: [
    ["Trees to trees", "#73bb53"],
    ["Built-up to trees", "#ff0000"],
    ["Crops to trees", "#eee05d"],
    ["Barren to trees", "#a9a9a9"],
    ["Shrubs and scrubs to trees", "#eaa4f0"],
  ],
  deforestation: [
    ["Trees to trees", "#73bb53"],
    ["Trees to built-up", "#ff0000"],
    ["Trees to crops", "#eee05d"],
    ["Trees to barren", "#a9a9a9"],
    ["Trees to shrubs and scrubs", "#eaa4f0"],
  ],
  degradation: [
    ["Crops to crops", "#eee05d"],
    ["Crops to built-up", "#ff0000"],
    ["Crops to barren", "#a9a9a9"],
    ["Crops to shrubs and scrubs", "#eaa4f0"],
  ],
  urbanization: [
    ["Built-up to built-up", "#ff0000"],
    ["Water to built-up", "#1ca3ec"],
    ["Trees or crops to built-up", "#73bb53"],
    ["Barren or shrubs and scrubs to built-up", "#a9a9a9"],
  ],
  cropintensity: [
    ["Double-Single", "#f7fcf5"],
    ["Tripple_or_annual_or_perennial-Single", "#ff4500"],
    ["Tripple_or_annual_or_perennial-Double", "#ff0000"],
    ["Single-Double", "#00ff00"],
    ["Single-Tripple_or_annual_or_perennial", "#32cd32"],
    ["Double-Tripple_or_annual_or_perennial", "#228b22"],
    ["Single-Single", "#4227f5"],
    ["Double-Double", "#712103"],
    ["Tripple_or_annual_or_perennial-Tripple_or_annual_or_perennial", "#ad27f5"],
  ],
  restoration: [
    ["Mosaic restoration", "#d79b0f"],
    ["Wide-scale restoration", "#0f077c"],
    ["Protection", "#4fbc14"],
  ],
  lulc_level_1: [
    ["Built-up", "#ff0000"],
    ["Water", "#1ca3ec"],
    ["Greenery", "#73bb53"],
    ["Barren lands", "#a9a9a9"],
    ["Shrubs and scrubs", "#eaa4f0"],
  ],
  lulc_level_2: [
    ["Trees and forests", "#73bb53"],
    ["Crops", "#fad36f"],
  ],
  lulc_level_3: [
    ["Background", "#000000"],
    ["Built Up", "#c94c4c"],
    ["Kharif Water", "#74ccf4"],
    ["Kharif and Rabi Water", "#1ca3ec"],
    ["Kharif, Rabi and Zaid Water", "#0f5e9c"],
    ["Trees / Forests", "#1b5e20"],
    ["Barren Lands", "#a9a9a9"],
    ["Single Kharif", "#f0f4a3"],
    ["Single Non-Kharif", "#d6e96b"],
    ["Double Cropping", "#b7d43a"],
    ["Triple Cropping", "#7faf2e"],
    ["Shrubs and Scrubs", "#8c7a4f"],
  ],
};

const legendShape = (catalogLayer) =>
  catalogLayer.geometryType === "line"
    ? "line"
    : catalogLayer.geometryType === "point"
      ? "circle"
      : "square";

const layerLegend = (catalogLayer, style) => {
  if (catalogLayer.sourceType !== "wms") return undefined;
  const profile =
    LEGEND_PROFILES[catalogLayer.id] ||
    LEGEND_PROFILES[catalogLayer.baseId] ||
    LEGEND_PROFILES[catalogLayer.styleProfile];
  const shape = legendShape(catalogLayer);
  const entries =
    profile ||
    (style.vectorStyleStops || []).map((stop) => [
      stop.label || String(stop.value),
      stop.color,
    ]);
  const items = entries.map(([label, color, itemShape]) => ({
    label,
    color,
    shape: itemShape || shape,
  }));
  const baseTitle =
    catalogLayer.legendTitle ||
    (catalogLayer.baseId
      ? catalogLayer.label.split(" · ")[0]
      : catalogLayer.label);
  return {
    key: catalogLayer.baseId || catalogLayer.id,
    title: `${baseTitle} legend`,
    items,
    legendPosition: "bottom-right",
  };
};

const GROUPS_TOP_FIRST = [
  { id: "demographic", name: "Demographic", collapsed: false },
  { id: "village-data", name: "Village Data", collapsed: true },
  { id: "hydrology", name: "Hydrology", collapsed: true },
  { id: "lulc", name: "LULC by year", collapsed: true },
  { id: "land", name: "Land", collapsed: true },
  { id: "agriculture", name: "Agriculture", collapsed: true },
  { id: "restoration", name: "Restoration", collapsed: true },
  { id: "industry", name: "Industry", collapsed: true },
  { id: "nrega", name: "NREGA", collapsed: true },
];

const projectPreferences = {
  map: {
    restrictBounds: false,
    bounds: [-180, -85, 180, 85],
    minZoom: 0,
    maxZoom: 24,
    maxPitch: 85,
    renderWorldCopies: true,
    projection: "globe",
    ellipsoidId: "earth",
    scaleUnit: "metric",
  },
  environmentVariables: [],
  geocoding: { providerId: "nominatim", apiKeys: {} },
};

const normalizeBaseUrl = (url) => `${url.replace(/\/+$/, "")}/`;

export const formatGeoServerName = (value) =>
  String(value || "")
    .replace(/[()]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();

const appendQuery = (endpoint, entries) => {
  const separator = endpoint.includes("?")
    ? endpoint.endsWith("?") || endpoint.endsWith("&")
      ? ""
      : "&"
    : "?";
  const query = entries
    .map(([key, value]) => {
      const encodedValue =
        value === "{bbox-epsg-3857}" ? value : encodeURIComponent(value);
      return `${encodeURIComponent(key)}=${encodedValue}`;
    })
    .join("&");
  return `${endpoint}${separator}${query}`;
};

const buildWfsRequest = (baseUrl, layer, layerName) => {
  const endpoint = `${baseUrl}${layer.workspace}/ows`;
  const typeName = `${layer.workspace}:${layerName}`;
  return {
    endpoint,
    typeName,
    version: "1.0.0",
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    url: appendQuery(endpoint, [
      ["service", "WFS"],
      ["version", "1.0.0"],
      ["request", "GetFeature"],
      ["typeName", typeName],
      ["outputFormat", "application/json"],
      ["srsName", "EPSG:4326"],
    ]),
  };
};

const wmsEndpointFor = (baseUrl, layer) =>
  layer.useGlobalWms
    ? `${baseUrl}wms`
    : `${baseUrl}${layer.workspace}/wms`;

const buildGeoServerStyleSource = (baseUrl, layer, layerName) => {
  const endpoint = wmsEndpointFor(baseUrl, layer);
  const qualifiedName = `${layer.workspace}:${layerName}`;
  const namedStyle = layer.rasterStyle || "";
  const getStylesEntry = namedStyle ? [["STYLES", namedStyle]] : [];
  const legendStyleEntry = namedStyle ? [["STYLE", namedStyle]] : [];
  const common = [
    ["SERVICE", "WMS"],
    ["VERSION", "1.1.1"],
  ];

  return {
    provider: "GeoServer",
    name: namedStyle || null,
    assignment: namedStyle ? "named-style" : "layer-default",
    renderingMode:
      layer.sourceType === "wms"
        ? "server-rendered-wms"
        : "geolibre-parity-profile",
    sldUrl: appendQuery(endpoint, [
      ...common,
      ["REQUEST", "GetStyles"],
      ["LAYERS", qualifiedName],
      ...getStylesEntry,
    ]),
    legendJsonUrl: appendQuery(endpoint, [
      ...common,
      ["REQUEST", "GetLegendGraphic"],
      ["FORMAT", "application/json"],
      ["LAYER", qualifiedName],
      ...legendStyleEntry,
    ]),
    legendImageUrl: appendQuery(endpoint, [
      ...common,
      ["REQUEST", "GetLegendGraphic"],
      ["FORMAT", "image/png"],
      ["LAYER", qualifiedName],
      ...legendStyleEntry,
    ]),
  };
};

const buildWmsSource = (baseUrl, layer, layerName, bounds) => {
  // Some named LULC styles are available through GeoServer's global WMS,
  // while other catalog layers retain their workspace-scoped endpoints.
  const endpoint = wmsEndpointFor(baseUrl, layer);
  const qualifiedName = `${layer.workspace}:${layerName}`;
  const source = {
    type: "raster",
    tiles: [
      appendQuery(endpoint, [
        ["SERVICE", "WMS"],
        ["REQUEST", "GetMap"],
        ["VERSION", "1.1.1"],
        ["LAYERS", qualifiedName],
        ["STYLES", layer.rasterStyle || ""],
        ["FORMAT", "image/png"],
        ["TRANSPARENT", "TRUE"],
        ["SRS", "EPSG:3857"],
        ["BBOX", "{bbox-epsg-3857}"],
        ["WIDTH", "256"],
        ["HEIGHT", "256"],
      ]),
    ],
    tileSize: 256,
    url: endpoint,
    layers: qualifiedName,
    styles: layer.rasterStyle || "",
    format: "image/png",
    transparent: true,
    version: "1.1.1",
  };
  if (bounds) source.bounds = bounds;
  return source;
};

const buildWcsUrl = (baseUrl, layer, layerName) =>
  appendQuery(`${baseUrl}${layer.workspace}/wcs`, [
    ["service", "WCS"],
    ["version", "2.0.1"],
    ["request", "GetCoverage"],
    ["CoverageId", `${layer.workspace}:${layerName}`],
    ["format", "geotiff"],
    ["compression", "LZW"],
    ...(layer.baseId?.startsWith("lulc_") ? [["tiling", "false"]] : []),
  ]);

const validBounds = (bounds) =>
  Array.isArray(bounds) &&
  bounds.length === 4 &&
  bounds.every(Number.isFinite) &&
  bounds[0] < bounds[2] &&
  bounds[1] < bounds[3];

export const geoJsonBounds = (featureCollection) => {
  if (validBounds(featureCollection?.bbox)) {
    return featureCollection.bbox.map(Number);
  }

  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const visitCoordinates = (coordinates) => {
    if (!Array.isArray(coordinates)) return;
    if (
      coordinates.length >= 2 &&
      Number.isFinite(Number(coordinates[0])) &&
      Number.isFinite(Number(coordinates[1]))
    ) {
      const longitude = Number(coordinates[0]);
      const latitude = Number(coordinates[1]);
      bounds[0] = Math.min(bounds[0], longitude);
      bounds[1] = Math.min(bounds[1], latitude);
      bounds[2] = Math.max(bounds[2], longitude);
      bounds[3] = Math.max(bounds[3], latitude);
      return;
    }
    coordinates.forEach(visitCoordinates);
  };

  for (const feature of featureCollection?.features || []) {
    const geometry = feature?.geometry;
    if (geometry?.type === "GeometryCollection") {
      geometry.geometries?.forEach((item) => visitCoordinates(item.coordinates));
    } else {
      visitCoordinates(geometry?.coordinates);
    }
  }

  return validBounds(bounds) ? bounds : null;
};

const mercatorY = (latitude) => {
  const clamped = Math.max(-85.051129, Math.min(85.051129, latitude));
  const radians = (clamped * Math.PI) / 180;
  return (
    (1 -
      Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) /
    2
  );
};

export const mapViewFromBounds = (
  bounds,
  { width = 1100, height = 720, padding = 72 } = {}
) => {
  if (!validBounds(bounds)) {
    throw new Error("A valid [west, south, east, north] extent is required.");
  }
  const [west, south, east, north] = bounds.map(Number);
  const longitudeFraction = Math.max((east - west) / 360, 1e-9);
  const latitudeFraction = Math.max(
    Math.abs(mercatorY(north) - mercatorY(south)),
    1e-9
  );
  const usableWidth = Math.max(width - padding * 2, 256);
  const usableHeight = Math.max(height - padding * 2, 256);
  const zoom = Math.min(
    Math.log2(usableWidth / 256 / longitudeFraction),
    Math.log2(usableHeight / 256 / latitudeFraction)
  );

  return {
    center: [(west + east) / 2, (south + north) / 2],
    zoom: Math.max(3, Math.min(16, Math.floor((zoom - 0.2) * 10) / 10)),
    bearing: 0,
    pitch: 0,
    bbox: [west, south, east, north],
  };
};

const isFeatureCollection = (value) =>
  value?.type === "FeatureCollection" && Array.isArray(value.features);

export const fetchWfsFeatureCollection = async (request, { signal } = {}) => {
  const response = await fetch(request.url, {
    signal,
    headers: { Accept: "application/geo+json, application/json" },
  });
  if (!response.ok) {
    throw new Error(`WFS request failed with HTTP ${response.status}.`);
  }

  let data;
  try {
    data = await response.json();
  } catch (_error) {
    throw new Error("WFS returned a response that was not JSON.");
  }
  if (!isFeatureCollection(data)) {
    throw new Error("WFS response is not a GeoJSON FeatureCollection.");
  }
  return data;
};

const nregaLayerStyle = (categoryId) => {
  const category = GEOLIBRE_NREGA_CATEGORIES.find(
    (item) => item.id === categoryId
  );
  return {
    ...BASE_STYLE,
    fillColor: category?.color || MISSING_DATA_COLOR,
    strokeColor: "#ffffff",
    strokeWidth: 1,
    fillOpacity: 0.9,
    circleRadius: 5,
    simpleStyleEnabled: true,
    vectorStyleProperty: "WorkCatego",
  };
};

const layerStyle = (layer, data) =>
  layer.sourceType === "wms"
    ? { ...RASTER_STYLE }
    : layer.nregaCategoryId
      ? nregaLayerStyle(layer.nregaCategoryId)
      : ["facilities", "livestock"].includes(layer.styleProfile)
        ? naturalBreaksStyle(
            STYLE_PROFILES[layer.styleProfile].vectorStyleProperty,
            STYLE_PROFILES[layer.styleProfile].vectorStyleColorRamp,
            { features: (data?.features || []).filter(feature => hasLayerData(layer.id, feature.properties)) },
            STYLE_PROFILES[layer.styleProfile]
          )
        : { ...(STYLE_PROFILES[layer.styleProfile] || BASE_STYLE) };

const coreStackMetadata = (layer, layerName, sourceUrl, style, baseUrl) => ({
  domain: layer.domain,
  geoserverWorkspace: layer.workspace,
  geoserverLayer: layerName,
  sourceType: layer.sourceType,
  liveSource: sourceUrl,
  geoserverStyle: buildGeoServerStyleSource(baseUrl, layer, layerName),
  year: layer.year || null,
  ...(layer.sourceType !== "wms" ? {
    missingDataColor: MISSING_DATA_COLOR,
    paletteId: ["demographics", "facilities", "antyodaya", "livestock", "mws", "mws_fortnight", "waterbodies", "cropping_intensity"].includes(layer.styleProfile) ? style.vectorStyleColorRamp : null,
  } : {}),
  ...(layer.sourceType === "wms" ? { legend: layerLegend(layer, style) } : {}),
  styleContract:
    layer.sourceType === "wms"
      ? "GeoServer renders the published named style through WMS."
      : "GeoLibre retains the finalized vector profile while the live GeoServer SLD and legend endpoints provide the server style contract.",
});

const buildVectorLayer = ({
  catalogLayer,
  layerName,
  request,
  data = EMPTY_FEATURE_COLLECTION,
  failure,
  loaded = false,
  baseUrl,
}) => {
  const outline = boundaryColorForLayer(catalogLayer.id);
  const style = { ...layerStyle(catalogLayer, data), ...(outline ? { strokeColor: outline, simpleStyleEnabled: true } : {}) };
  const isDefaultDisplay = catalogLayer.defaultVisible === true;
  const loadState = failure ? "error" : loaded ? "loaded" : "unloaded";
  return applyMissingDataStyle({
    id: `corestack-${catalogLayer.id}`,
    name: catalogLayer.label,
    type: "geojson",
    source: {
      type: "geojson",
      url: request.url,
      service: "wfs",
      typeName: request.typeName,
      version: request.version,
      outputFormat: request.outputFormat,
      srsName: request.srsName,
    },
    visible: isDefaultDisplay,
    opacity: 1,
    style,
    metadata: {
      featureCount: data.features.length,
      service: "wfs",
      sourceKind: "wfs-getfeature",
      typeName: request.typeName,
      loadState,
      ...(failure ? { initialLoadError: failure.message } : {}),
      corestack: {
        ...coreStackMetadata(
          catalogLayer,
          layerName,
          request.url,
          style,
          baseUrl
        ),
        ...(catalogLayer.nregaCategoryId
          ? { nregaCategoryId: catalogLayer.nregaCategoryId }
          : {}),
        loadState,
      },
    },
    geojson: data,
    sourcePath: request.url,
    groupId: catalogLayer.loadGroup,
  });
};

const buildRasterLayer = ({ catalogLayer, layerName, baseUrl, bounds }) => {
  const wmsSource = buildWmsSource(baseUrl, catalogLayer, layerName, bounds);
  const wcsDownloadUrl = buildWcsUrl(baseUrl, catalogLayer, layerName);
  const source = {
    ...wmsSource,
    // GeoLibre exposes its byte-preserving "GeoTIFF (COG)" export for a
    // raster layer when source.url points to a complete downloadable file.
    // Rendering still uses the styled WMS tile template above.
    url: wcsDownloadUrl,
    wmsUrl: wmsSource.url,
  };
  const style = layerStyle(catalogLayer);
  return {
    id: `corestack-${catalogLayer.id}`,
    name: catalogLayer.label,
    type: "raster",
    source,
    visible: catalogLayer.defaultVisible === true && !catalogLayer.startupDelayMs,
    opacity: 1,
    style,
    metadata: {
      service: "wms",
      ...(catalogLayer.defaultVisible && catalogLayer.startupDelayMs ? { startupDelayMs: catalogLayer.startupDelayMs } : {}),
      corestack: {
        ...coreStackMetadata(
          catalogLayer,
          layerName,
          wmsSource.url,
          style,
          baseUrl
        ),
        wcsDownloadUrl,
      },
    },
    sourcePath: wcsDownloadUrl,
    groupId: catalogLayer.loadGroup,
  };
};

const displayOrderForGroup = (groupId, layers) => {
  const matching = layers.filter((layer) => layer.groupId === groupId);
  return groupId === "lulc" ? [...matching].reverse() : matching;
};

export const orderGeoLibreLayers = (layers) => {
  const topFirst = GROUPS_TOP_FIRST.flatMap((group) =>
    displayOrderForGroup(group.id, layers)
  );
  return topFirst.reverse();
};

const mapLegendEntries = (orderedLayers) => {
  const seen = new Set();
  const entries = [...orderedLayers]
    .reverse()
    .map((layer) => layer.metadata?.corestack?.legend)
    .filter((entry) => {
      if (!entry?.items?.length || seen.has(entry.key)) return false;
      seen.add(entry.key);
      return true;
    });
  const selected = entries.find((entry) => entry.key === "demographics");
  return selected
    ? [selected, ...entries.filter((entry) => entry !== selected)]
    : entries;
};

export const activeGeoLibreLegends = (project) =>
  project?.layers
    ? mapLegendEntries(project.layers.filter((layer) => layer.visible && layer.type === "raster"))
    : [];

const DISABLED_PROJECT_PLUGIN_IDS = new Set([
  // Discard the retired custom-viewer plugin from older project snapshots.
  "corestack-embed",
  // GeoLibre's Components plugin enables every component control by default,
  // including its own Swipe control. The native legend is a separate core panel;
  // KYL supplements it with raster legends only.
  "maplibre-gl-components",
  "maplibre-gl-swipe",
]);

const withoutDisabledProjectPlugins = (entries) =>
  Object.fromEntries(
    Object.entries(entries || {}).filter(
      ([pluginId]) => !DISABLED_PROJECT_PLUGIN_IDS.has(pluginId)
    )
  );

const coreStackPluginState = (currentPlugins) => ({
  manifestUrls: currentPlugins?.manifestUrls || [],
  activePluginIds: Array.from(
    new Set(
      currentPlugins?.activePluginIds || [
        "maplibre-layer-control",
        "maplibre-atmosphere-effects",
        "maplibre-deckgl-viz",
      ]
    )
  ).filter((pluginId) => !DISABLED_PROJECT_PLUGIN_IDS.has(pluginId)),
  mapControlPositions: withoutDisabledProjectPlugins(
    currentPlugins?.mapControlPositions
  ),
  settings: withoutDisabledProjectPlugins(currentPlugins?.settings),
});

export const sanitizeGeoLibreProjectPlugins = (project) => {
  if (!project?.layers) return project;
  const plugins = coreStackPluginState(project.plugins);
  if (JSON.stringify(project.plugins) === JSON.stringify(plugins)) {
    return project;
  }
  return { ...project, plugins };
};

const readableError = (error) =>
  error instanceof Error ? error.message : String(error);

const replaceProjectLayer = (project, layerId, replacement) => ({
  ...project,
  layers: project.layers.map((layer) =>
    layer.id === layerId ? replacement : layer
  ),
});

const nregaCategoryForLayer = (layer) =>
  GEOLIBRE_NREGA_CATEGORIES.find(
    (category) =>
      category.id === layer.metadata?.corestack?.nregaCategoryId
  );

// Earlier-generated NREGA layers publish the clipped GeoServer field name
// "WorkCatego"; newer layers publish the full "WorkCategory". Both carry the
// same values, so read whichever is present instead of assuming one schema.
const workCategoryOf = (properties) =>
  properties?.WorkCatego ?? properties?.WorkCategory ?? "";

// Normalize every feature onto the "WorkCatego" key GeoLibre's style and
// missing-data guard already key on, so downstream code never needs to know
// which schema a given tehsil's dataset was generated with.
const withNormalizedWorkCategory = (data) => ({
  ...data,
  features: (data?.features || []).map((feature) => {
    const properties = feature.properties || {};
    return Object.prototype.hasOwnProperty.call(properties, "WorkCatego")
      ? feature
      : { ...feature, properties: { ...properties, WorkCatego: workCategoryOf(properties) } };
  }),
});

const nregaFeaturesForCategory = (features, category) => {
  const knownValues = new Set(
    GEOLIBRE_NREGA_CATEGORIES.filter((item) => !item.fallback).flatMap(
      (item) => item.values
    )
  );
  return features.filter((feature) => {
    const value = workCategoryOf(feature?.properties);
    return category.fallback
      ? !knownValues.has(value)
      : category.values.includes(value);
  });
};

const hydrateLayerWithData = (layer, data) => {
  const { initialLoadError: _initialLoadError, ...metadata } =
    layer.metadata || {};
  const catalogLayer = GEOLIBRE_LAYERS.find(item => `corestack-${item.id}` === layer.id);
  if (catalogLayer?.id === "mws_layers_fortnight") data = parseFortnightRecords(data);
  if (catalogLayer?.id === "mws_layers") data = withAverageDeltaG(data);
  if (catalogLayer?.id === "terrain_vector") data = withNormalizedTerrainCluster(data);
  if (catalogLayer?.id === "soil_type") data = withSoilTextureClass(data);
  const outline = catalogLayer && boundaryColorForLayer(catalogLayer.id);
  const initialStyle = catalogLayer && { ...layerStyle(catalogLayer), ...(outline ? { strokeColor: outline, simpleStyleEnabled: true } : {}) };
  const style = initialStyle && Object.entries(initialStyle).every(([key, value]) => JSON.stringify(layer.style?.[key]) === JSON.stringify(value))
    ? layerStyle(catalogLayer, data) : layer.style;
  return applyMissingDataStyle({
    ...layer,
    geojson: data,
    style,
    metadata: {
      ...metadata,
      featureCount: data.features.length,
      loadState: "loaded",
      corestack: {
        ...metadata.corestack,
        loadState: "loaded",
      },
    },
  });
};

const withLazyLoadFailure = (project, layerId, failure) => {
  const layerLoading = project.metadata?.layerLoading || {};
  const remainingFailures = (layerLoading.lazyLoadFailures || []).filter(
    (item) => item.layerId !== layerId
  );
  return {
    ...project,
    metadata: {
      ...project.metadata,
      layerLoading: {
        ...layerLoading,
        lazyLoadFailures: failure
          ? [...remainingFailures, failure]
          : remainingFailures,
      },
    },
  };
};

export const hydrateGeoLibreVectorLayer = async ({
  project,
  layerId,
  signal,
  fetchFeatureCollection = fetchWfsFeatureCollection,
}) => {
  const layer = project?.layers?.find((item) => item.id === layerId);
  if (!layer || layer.type !== "geojson") {
    throw new Error(`GeoLibre vector layer ${layerId} is not available.`);
  }
  if (layer.metadata?.loadState === "loaded") return project;

  const request = {
    url: layer.source?.url,
    typeName: layer.source?.typeName,
    version: layer.source?.version,
    outputFormat: layer.source?.outputFormat,
    srsName: layer.source?.srsName,
  };
  if (!request.url) {
    throw new Error(`GeoLibre vector layer ${layer.name} has no WFS URL.`);
  }

  try {
    const rawData = await fetchFeatureCollection(request, { signal });
    const category = nregaCategoryForLayer(layer);
    const data = category ? withNormalizedWorkCategory(rawData) : rawData;
    const hydratedProject = category
      ? {
          ...project,
          layers: project.layers.map((item) => {
            const itemCategory = nregaCategoryForLayer(item);
            if (!itemCategory) return item;
            return hydrateLayerWithData(item, {
              ...data,
              features: nregaFeaturesForCategory(
                data.features,
                itemCategory
              ),
            });
          }),
        }
      : replaceProjectLayer(
          project,
          layerId,
          hydrateLayerWithData(layer, data)
        );
    hydratedProject.styles = Object.fromEntries(hydratedProject.layers.map(item => [item.id, item.style]));
    return withLazyLoadFailure(
      hydratedProject,
      layerId,
      null
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    const failure = {
      layerId,
      layerName: layer.name,
      sourceUrl: request.url,
      message: readableError(error),
    };
    const failedLayer = {
      ...layer,
      metadata: {
        ...layer.metadata,
        loadState: "error",
        initialLoadError: failure.message,
        corestack: {
          ...layer.metadata?.corestack,
          loadState: "error",
        },
      },
    };
    return withLazyLoadFailure(
      replaceProjectLayer(project, layerId, failedLayer),
      layerId,
      failure
    );
  }
};

export const buildGeoLibreProject = async ({
  state,
  district,
  tehsil,
  viewport,
  geoserverUrl = process.env.REACT_APP_GEOSERVER_URL || DEFAULT_GEOSERVER_URL,
  signal,
  onProgress = () => {},
  fetchFeatureCollection = fetchWfsFeatureCollection,
}) => {
  if (!state || !district || !tehsil) {
    throw new Error("Select a state, district, and tehsil first.");
  }

  const baseUrl = normalizeBaseUrl(geoserverUrl);
  const scope = {
    district: formatGeoServerName(district),
    tehsil: formatGeoServerName(tehsil),
  };
  const requestCache = new Map();
  const vectorResults = new Map();
  const failures = [];

  const requestFor = (catalogLayer) => {
    const layerName = catalogLayer.layerName(scope);
    return {
      layerName,
      request: buildWfsRequest(baseUrl, catalogLayer, layerName),
    };
  };

  const loadVector = async (
    catalogLayer,
    required = false,
    reportProgress = true
  ) => {
    const { layerName, request } = requestFor(catalogLayer);
    if (reportProgress) {
      onProgress({
        phase: catalogLayer.id,
        message: `Loading ${catalogLayer.label}…`,
      });
    }

    if (!requestCache.has(request.url)) {
      requestCache.set(
        request.url,
        fetchFeatureCollection(request, { signal })
      );
    }

    try {
      const data = await requestCache.get(request.url);
      vectorResults.set(catalogLayer.id, {
        data,
        layerName,
        request,
        loaded: true,
      });
      return data;
    } catch (error) {
      if (signal?.aborted) throw error;
      const failure = {
        layerId: catalogLayer.id,
        layerName: catalogLayer.label,
        sourceUrl: request.url,
        message: readableError(error),
      };
      if (required) {
        throw new Error(
          `Could not load the administrative boundary needed to locate ${tehsil}: ${failure.message}`
        );
      }
      failures.push(failure);
      vectorResults.set(catalogLayer.id, {
        data: EMPTY_FEATURE_COLLECTION,
        layerName,
        request,
        failure,
        loaded: false,
      });
      return EMPTY_FEATURE_COLLECTION;
    }
  };

  const socioeconomic = GEOLIBRE_VECTOR_LAYERS.find(
    (layer) => layer.id === "demographics"
  );
  const administrative = GEOLIBRE_VECTOR_LAYERS.find(
    (layer) => layer.id === "administrative_boundaries"
  );
  const administrativeData = await loadVector(administrative, true);
  // Reuse the extent request for the separately styled, initially hidden layer.
  await loadVector(socioeconomic, true, false);
  const bounds = geoJsonBounds(administrativeData);
  if (!bounds) {
    throw new Error(
      `The administrative boundary for ${tehsil} has no usable geographic extent.`
    );
  }

  const createProject = () => {
    const layers = GEOLIBRE_LAYERS.map((catalogLayer) => {
      const layerName = catalogLayer.layerName(scope);
      if (catalogLayer.sourceType === "wfs") {
        const result = vectorResults.get(catalogLayer.id);
        return buildVectorLayer({
          catalogLayer,
          layerName,
          baseUrl,
          ...(result || {
            data: EMPTY_FEATURE_COLLECTION,
            request: buildWfsRequest(baseUrl, catalogLayer, layerName),
            loaded: false,
          }),
        });
      }
      return buildRasterLayer({ catalogLayer, layerName, baseUrl, bounds });
    });
    const orderedLayers = orderGeoLibreLayers(layers);
    const styles = Object.fromEntries(
      orderedLayers.map((layer) => [layer.id, layer.style])
    );
    const viewer = resolveGeoLibreViewer();

    return {
      version: GEOLIBRE_PROJECT_FORMAT_VERSION,
      name: `${tehsil}, ${district}: CoRE Stack landscape`,
      mapView: mapViewFromBounds(bounds, viewport),
      basemapStyleUrl: DEFAULT_GEOLIBRE_BASEMAP_STYLE,
      basemapVisible: true,
      basemapOpacity: 1,
      layers: orderedLayers,
      layerGroups: GROUPS_TOP_FIRST.map((group) => ({
        ...group,
        visible: true,
        opacity: 1,
      })),
      styles,
      preferences: projectPreferences,
      plugins: coreStackPluginState(),
      legend: {
        panelVisible: true,
        collapsed: false,
        title: `${tehsil} CoRE Stack layers`,
        groupByLayer: true,
        order: [...orderedLayers].reverse().map((layer) => layer.id),
        overrides: {},
      },
      metadata: {
        generatedAtUtc: new Date().toISOString(),
        generatedBy: "Know Your Landscape",
        license: {
          name: "CC BY 4.0",
          url: "https://creativecommons.org/licenses/by/4.0/",
          notice: "CoRE Stack datasets are available under CC BY 4.0",
        },
        scope: { level: "tehsil", state, district, tehsil, bounds },
        geolibre: {
          applicationVersion: GEOLIBRE_CONFIG.version,
          projectFormatVersion: GEOLIBRE_PROJECT_FORMAT_VERSION,
          viewerUrl: viewer.url,
        },
        layerLoading: {
          stage: "base-map",
          order: [
            "Administrative extent (hidden)",
            "Terrain raster",
            "All other vector layers on first visibility toggle",
            "Raster tiles on visibility toggle",
          ],
          initialLoadFailures: [...failures],
          lazyLoadFailures: [],
        },
        geoserverStyleContract:
          "Raster symbology is rendered by each catalog rasterStyle through GeoServer WMS. An empty rasterStyle uses the GeoServer layer default. Vector layers retain the verified GeoLibre parity profiles and expose live GeoServer GetStyles and GetLegendGraphic endpoints without depending on GitHub-hosted QML files.",
      },
    };
  };

  onProgress({ phase: "project", message: "Opening this tehsil in GeoLibre…" });
  return createProject();
};
