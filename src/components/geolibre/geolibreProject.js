import {
  GEOLIBRE_CONFIG,
  GEOLIBRE_PROJECT_FORMAT_VERSION,
  resolveGeoLibreViewer,
} from "../../config/geolibre.config";
import {
  GEOLIBRE_LAYERS,
  GEOLIBRE_VECTOR_LAYERS,
} from "../../config/geolibreLayers";

const DEFAULT_GEOSERVER_URL =
  "https://geoserver.core-stack.org:8443/geoserver/";
const DEFAULT_BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const EMPTY_FEATURE_COLLECTION = Object.freeze({
  type: "FeatureCollection",
  features: [],
});

const BASE_STYLE = {
  minZoom: 0,
  maxZoom: 24,
  fillColor: "#8b5cf6",
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
  vectorStyleMode: "categorized",
  vectorStyleProperty: property,
  vectorStyleClassCount: stops.length,
  vectorStyleStops: stops.map(([value, color, label]) => ({
    value,
    color,
    label,
  })),
});

const expressionStyle = (expression, overrides = {}) => ({
  ...BASE_STYLE,
  ...overrides,
  vectorStyleMode: "expression",
  vectorStyleExpression: JSON.stringify(expression),
});

const numericProperty = (property, fallback = 0) => [
  "to-number",
  ["get", property],
  fallback,
];

const croppingIntensityAverage = [
  "/",
  [
    "+",
    ...Array.from({ length: 8 }, (_, index) =>
      numericProperty(`cropping_intensity_${2017 + index}`)
    ),
  ],
  8,
];

const droughtOccurrences = (year, category) => [
  "-",
  [
    "length",
    ["split", ["to-string", ["get", `drlb_${year}`]], String(category)],
  ],
  1,
];

const droughtYearFlag = (year) => [
  "case",
  [
    ">=",
    ["+", droughtOccurrences(year, 2), droughtOccurrences(year, 3)],
    5,
  ],
  1,
  0,
];

const droughtYearCount = [
  "+",
  ...Array.from({ length: 8 }, (_, index) => droughtYearFlag(2017 + index)),
];

const STYLE_PROFILES = {
  boundary: {
    ...BASE_STYLE,
    fillColor: "#ffffff",
    fillOpacity: 0,
    strokeColor: "#111827",
    strokeWidth: 1.5,
  },
  demographics: expressionStyle(
    [
      "step",
      [
        "*",
        [
          "/",
          numericProperty("P_LIT"),
          ["max", numericProperty("TOT_P", 1), 1],
        ],
        100,
      ],
      "#98fb98",
      46,
      "#32cd32",
      59,
      "#228b22",
      70,
      "#006400",
    ],
    { fillColor: "#98fb98", strokeColor: "#111827", fillOpacity: 0.65 }
  ),
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
  mws: expressionStyle(
    [
      "step",
      numericProperty("Net2018_23"),
      "#ff0000",
      -5,
      "#ffff00",
      -1,
      "#25b63c",
      1,
      "#1017f8",
    ],
    { fillColor: "#25b63c", strokeColor: "#232323", fillOpacity: 0.55 }
  ),
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
  waterbodies: {
    ...BASE_STYLE,
    fillColor: "#6495ed",
    fillOpacity: 0.5,
    strokeColor: "#2563eb",
    strokeWidth: 2,
  },
  soge: categoryStyle(
    "class",
    [
      ["Safe", "#ffffff", "Safe"],
      ["Semi-critical", "#e0f3f8", "Semi-critical"],
      ["Critical", "#4575b4", "Critical"],
      ["Over Exploited", "#313695", "Over Exploited"],
    ],
    { fillColor: "#9ca3af", strokeColor: "#232323", fillOpacity: 0.72 }
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
  cropping_intensity: expressionStyle(
    [
      "step",
      croppingIntensityAverage,
      "#ff9371",
      1,
      "#ffa500",
      2,
      "#bad93e",
    ],
    { fillColor: "#ffa500", strokeColor: "#232323", fillOpacity: 0.7 }
  ),
  drought: expressionStyle(
    [
      "step",
      droughtYearCount,
      "#f4d03f",
      1,
      "#eb984e",
      2,
      "#e74c3c",
    ],
    { fillColor: "#eb984e", strokeColor: "#232323", fillOpacity: 0.5 }
  ),
  nrega: categoryStyle(
    "WorkCatego",
    [
      ["Agri Impact - HH,  Community", "#ffa500", "Land restoration"],
      ["Household Livelihood", "#c2678d", "Off-farm livelihood assets"],
      ["Irrigation - Site level impact", "#1a759f", "Irrigation on farms"],
      ["Others - HH, Community", "#355070", "Community assets"],
      ["Plantation", "#52b69a", "Plantations"],
      [
        "SWC - Landscape level impact",
        "#6495ed",
        "Soil and Water conservation",
      ],
      ["Un Identified", "#6d597a", "Unidentified"],
    ],
    {
      fillColor: "#6d597a",
      strokeColor: "#ffffff",
      fillOpacity: 0.9,
      circleRadius: 6,
    }
  ),
};

const GROUPS_TOP_FIRST = [
  { id: "overview", name: "Overview", collapsed: false },
  { id: "watersheds", name: "Watersheds", collapsed: false },
  { id: "vectors", name: "Other vector layers", collapsed: true },
  { id: "lulc-3", name: "LULC Level 3 by year", collapsed: true },
  { id: "lulc-2", name: "LULC Level 2 by year", collapsed: true },
  { id: "lulc-1", name: "LULC Level 1 by year", collapsed: true },
  { id: "rasters", name: "Other raster layers", collapsed: true },
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

const buildWmsSource = (baseUrl, layer, layerName, bounds) => {
  const endpoint = `${baseUrl}${layer.workspace}/wms`;
  const qualifiedName = `${layer.workspace}:${layerName}`;
  const source = {
    type: "raster",
    tiles: [
      appendQuery(endpoint, [
        ["SERVICE", "WMS"],
        ["REQUEST", "GetMap"],
        ["VERSION", "1.1.1"],
        ["LAYERS", qualifiedName],
        ["STYLES", layer.wmsStyle || ""],
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
    styles: layer.wmsStyle || "",
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

const layerStyle = (layer) =>
  layer.sourceType === "wms"
    ? { ...RASTER_STYLE }
    : { ...(STYLE_PROFILES[layer.styleProfile] || BASE_STYLE) };

const coreStackMetadata = (layer, layerName, sourceUrl) => ({
  domain: layer.domain,
  geoserverWorkspace: layer.workspace,
  geoserverLayer: layerName,
  sourceType: layer.sourceType,
  liveSource: sourceUrl,
  qmlStyleUrl: layer.qmlStyleUrl,
  year: layer.year || null,
  styleContract:
    layer.sourceType === "wms"
      ? "GeoServer renders the named style published from the CoRE Stack QGIS style catalog."
      : "The QGIS QML symbology is represented as a GeoLibre vector style.",
});

const buildVectorLayer = ({
  catalogLayer,
  layerName,
  request,
  data,
  failure,
}) => {
  const style = layerStyle(catalogLayer);
  return {
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
    visible: catalogLayer.id === "demographics",
    opacity: 1,
    style,
    metadata: {
      featureCount: data.features.length,
      service: "wfs",
      sourceKind: "wfs-getfeature",
      typeName: request.typeName,
      ...(failure ? { initialLoadError: failure.message } : {}),
      corestack: coreStackMetadata(catalogLayer, layerName, request.url),
    },
    geojson: data,
    sourcePath: request.url,
    groupId: catalogLayer.loadGroup,
  };
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
    visible: false,
    opacity: 1,
    style,
    metadata: {
      service: "wms",
      corestack: {
        ...coreStackMetadata(catalogLayer, layerName, wmsSource.url),
        wcsDownloadUrl,
        rasterDownload: {
          kind: "full-coverage-geotiff",
          url: wcsDownloadUrl,
          bytePreservingInGeoLibre: true,
        },
      },
    },
    sourcePath: wcsDownloadUrl,
    groupId: catalogLayer.loadGroup,
  };
};

const displayOrderForGroup = (groupId, layers) => {
  const matching = layers.filter((layer) => layer.groupId === groupId);
  return groupId.startsWith("lulc-") ? [...matching].reverse() : matching;
};

export const orderGeoLibreLayers = (layers) => {
  const topFirst = GROUPS_TOP_FIRST.flatMap((group) =>
    displayOrderForGroup(group.id, layers)
  );
  return topFirst.reverse();
};

const readableError = (error) =>
  error instanceof Error ? error.message : String(error);

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
      vectorResults.set(catalogLayer.id, { data, layerName, request });
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
          `Could not load the Socio-Economic Profile needed to locate ${tehsil}: ${failure.message}`
        );
      }
      failures.push(failure);
      vectorResults.set(catalogLayer.id, {
        data: EMPTY_FEATURE_COLLECTION,
        layerName,
        request,
        failure,
      });
      return EMPTY_FEATURE_COLLECTION;
    }
  };

  const socioeconomic = GEOLIBRE_VECTOR_LAYERS.find(
    (layer) => layer.id === "demographics"
  );
  const mws = GEOLIBRE_VECTOR_LAYERS.find((layer) => layer.id === "mws_layers");

  const socioeconomicData = await loadVector(socioeconomic, true);
  const bounds = geoJsonBounds(socioeconomicData);
  if (!bounds) {
    throw new Error(
      `The Socio-Economic Profile for ${tehsil} has no usable geographic extent.`
    );
  }

  await loadVector(mws);
  const remainingVectors = GEOLIBRE_VECTOR_LAYERS.filter(
    (layer) => layer.id !== socioeconomic.id && layer.id !== mws.id
  );
  onProgress({
    phase: "vectors",
    message: `Loading ${remainingVectors.length} supporting vector layers…`,
  });
  await Promise.all(
    remainingVectors.map((layer) => loadVector(layer, false, false))
  );

  onProgress({ phase: "project", message: "Preparing the GeoLibre project…" });
  const layers = GEOLIBRE_LAYERS.map((catalogLayer) => {
    const layerName = catalogLayer.layerName(scope);
    if (catalogLayer.sourceType === "wfs") {
      return buildVectorLayer({
        catalogLayer,
        layerName,
        ...vectorResults.get(catalogLayer.id),
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
    basemapStyleUrl: DEFAULT_BASEMAP_STYLE,
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
    legend: {
      title: `${tehsil} landscape layers`,
      groupByLayer: true,
      order: [...orderedLayers].reverse().map((layer) => layer.id),
      overrides: {},
    },
    metadata: {
      generatedAtUtc: new Date().toISOString(),
      generatedBy: "Know Your Landscape",
      scope: { level: "tehsil", state, district, tehsil, bounds },
      geolibre: {
        applicationVersion: GEOLIBRE_CONFIG.version,
        projectFormatVersion: GEOLIBRE_PROJECT_FORMAT_VERSION,
        viewerUrl: viewer.url,
      },
      layerLoading: {
        order: [
          "Socio-Economic Profile",
          "Micro-watersheds",
          "Other vector layers",
          "Latest LULC layers",
          "Historical LULC layers",
          "Other raster layers on visibility toggle",
        ],
        initialLoadFailures: failures,
      },
      qmlStyleContract:
        "Vector QML symbology is represented in GeoLibre styles. Raster QML symbology is rendered by named GeoServer WMS styles. Original QML URLs are retained per layer.",
    },
  };
};
