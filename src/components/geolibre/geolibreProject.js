import {
  DEFAULT_GEOLIBRE_LULC_YEARS,
  GEOLIBRE_LAYER_BY_ID,
  GEOLIBRE_LAYER_GROUPS,
} from "../../config/geolibreLayers";

export const GEOLIBRE_PROJECT_VERSION = "0.2.0";
export const GEOLIBRE_VIEWER_URL =
  process.env.REACT_APP_GEOLIBRE_URL || "https://web.geolibre.app/";

const DEFAULT_GEOSERVER_URL =
  "https://geoserver.core-stack.org:8443/geoserver/";
const DEFAULT_BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

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

const normalizeBaseUrl = (url) => `${url.replace(/\/+$/, "")}/`;

export const formatGeoServerName = (value) =>
  String(value || "")
    .replace(/[()]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();

const appendQuery = (endpoint, entries) => {
  const separator = endpoint.includes("?") ? "&" : "?";
  const query = entries
    .map(([key, value]) => {
      const encodedValue =
        value === "{bbox-epsg-3857}" ? value : encodeURIComponent(value);
      return `${encodeURIComponent(key)}=${encodedValue}`;
    })
    .join("&");
  return `${endpoint}${separator}${query}`;
};

const buildWfsUrl = (baseUrl, workspace, layerName) =>
  appendQuery(`${baseUrl}${workspace}/ows`, [
    ["service", "WFS"],
    ["version", "1.0.0"],
    ["request", "GetFeature"],
    ["typeName", `${workspace}:${layerName}`],
    ["outputFormat", "application/json"],
    ["srsName", "EPSG:4326"],
  ]);

const buildWmsSource = (baseUrl, workspace, layerName, style) => {
  const endpoint = `${baseUrl}${workspace}/wms`;
  const qualifiedName = `${workspace}:${layerName}`;
  const tileUrl = appendQuery(endpoint, [
    ["SERVICE", "WMS"],
    ["REQUEST", "GetMap"],
    ["VERSION", "1.1.1"],
    ["LAYERS", qualifiedName],
    ["STYLES", style || ""],
    ["FORMAT", "image/png"],
    ["TRANSPARENT", "TRUE"],
    ["SRS", "EPSG:3857"],
    ["BBOX", "{bbox-epsg-3857}"],
    ["WIDTH", "256"],
    ["HEIGHT", "256"],
  ]);

  return {
    type: "raster",
    tiles: [tileUrl],
    tileSize: 256,
    url: endpoint,
    layers: qualifiedName,
    styles: style || "",
    format: "image/png",
    transparent: true,
    version: "1.1.1",
  };
};

const buildWcsUrl = (baseUrl, workspace, layerName) =>
  appendQuery(`${baseUrl}${workspace}/wcs`, [
    ["service", "WCS"],
    ["version", "2.0.1"],
    ["request", "GetCoverage"],
    ["CoverageId", `${workspace}:${layerName}`],
    ["format", "geotiff"],
    ["compression", "LZW"],
  ]);

const styleExpression = (style) => {
  if (style.vectorStyleMode === "expression") {
    try {
      return JSON.parse(style.vectorStyleExpression);
    } catch (_error) {
      return null;
    }
  }

  if (
    style.vectorStyleMode === "categorized" &&
    style.vectorStyleProperty &&
    style.vectorStyleStops.length
  ) {
    return [
      "match",
      ["to-string", ["get", style.vectorStyleProperty]],
      ...style.vectorStyleStops.flatMap((stop) => [
        String(stop.value),
        stop.color,
      ]),
      style.fillColor,
    ];
  }

  return null;
};

const vectorRestoreStyle = (style, geometryType) => {
  const restoreStyle = {
    fillColor: style.fillColor,
    fillOpacity: style.fillOpacity,
    lineColor: style.strokeColor,
    lineWidth: style.strokeWidth,
    circleColor: style.fillColor,
    circleRadius: style.circleRadius,
    circleOpacity: style.fillOpacity,
  };
  const expression = styleExpression(style);

  if (expression && geometryType === "line") {
    restoreStyle.lineColorExpression = expression;
  } else if (expression) {
    restoreStyle.fillColorExpression = expression;
    restoreStyle.circleColorExpression = expression;
  }

  return restoreStyle;
};

const layerStyle = (layer) => ({
  ...(layer.sourceType === "wms"
    ? RASTER_STYLE
    : STYLE_PROFILES[layer.styleProfile] || BASE_STYLE),
});

const customLayerType = (geometryType) =>
  ({ point: "circle", line: "line", polygon: "fill" })[geometryType] ||
  "custom";

const buildLayerMetadata = ({ id, layer, layerName, style, sourceUrl }) => ({
  ...(layer.sourceType === "wfs"
    ? {
        sourceKind: "maplibre-gl-vector",
        customLayerType: customLayerType(layer.geometryType),
        externalNativeLayer: true,
        controlOwnsPaint: true,
        identifiable: false,
        nativeLayerIds: [],
        sourceIds: [`${id}-source`],
        vectorSource: "url",
        geometryType: layer.geometryType,
        refresh: { enabled: true, intervalMs: 300000 },
        vectorState: {
          format: "geojson",
          ingestMode: "table",
          picker: true,
          renderMode: "geojson",
          style: vectorRestoreStyle(style, layer.geometryType),
        },
      }
    : { service: "wms" }),
  corestack: {
    domain: layer.groupLabel,
    geoserverWorkspace: layer.workspace,
    geoserverLayer: layerName,
    sourceType: layer.sourceType,
    liveSource: sourceUrl,
    qmlStyleUrl: layer.qmlStyleUrl,
    styleContract:
      layer.sourceType === "wms"
        ? "GeoServer WMS style published from the Core Stack QGIS style catalog"
        : "QGIS QML symbology translated into GeoLibre project styling",
  },
});

const normalizedMapView = (mapView) => {
  const center = Array.isArray(mapView?.center) ? mapView.center : [78.9, 23.6];
  return {
    center: [Number(center[0]) || 78.9, Number(center[1]) || 23.6],
    zoom: Number.isFinite(mapView?.zoom) ? mapView.zoom : 5,
    bearing: Number.isFinite(mapView?.bearing) ? mapView.bearing : 0,
    pitch: Number.isFinite(mapView?.pitch) ? mapView.pitch : 0,
  };
};

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

export const selectedGeoLibreLayerIds = ({ toggledLayers, years }) => {
  const selected = Object.entries(toggledLayers || {})
    .filter(([, enabled]) => enabled)
    .map(([id]) => id)
    .filter((id) => GEOLIBRE_LAYER_BY_ID[id]);

  for (const [id, year] of Object.entries(years || {})) {
    if (year && GEOLIBRE_LAYER_BY_ID[id]) selected.push(id);
  }

  return [...new Set(selected)];
};

export const buildGeoLibreProject = ({
  state,
  district,
  tehsil,
  selectedLayerIds,
  years = DEFAULT_GEOLIBRE_LULC_YEARS,
  mapView,
  geoserverUrl = process.env.REACT_APP_GEOSERVER_URL || DEFAULT_GEOSERVER_URL,
}) => {
  if (!state || !district || !tehsil) {
    throw new Error("Select a state, district, and tehsil first.");
  }

  const selectedIds = new Set(selectedLayerIds || []);
  if (!selectedIds.size) {
    throw new Error("Select at least one layer for GeoLibre.");
  }

  const baseUrl = normalizeBaseUrl(geoserverUrl);
  const scope = {
    district: formatGeoServerName(district),
    tehsil: formatGeoServerName(tehsil),
  };
  const layers = [];

  for (const group of GEOLIBRE_LAYER_GROUPS) {
    for (const catalogLayer of group.layers) {
      if (!selectedIds.has(catalogLayer.id)) continue;
      const year = catalogLayer.yearKey ? years[catalogLayer.yearKey] : undefined;
      if (catalogLayer.yearKey && !year) continue;

      const layer = {
        ...catalogLayer,
        groupId: group.id,
        groupLabel: group.label,
      };
      const layerName = layer.layerName({ ...scope, year });
      const id = `corestack-${layer.id}`;
      const style = layerStyle(layer);

      if (layer.sourceType === "wfs") {
        const sourceUrl = buildWfsUrl(baseUrl, layer.workspace, layerName);
        layers.push({
          id,
          name: layer.label,
          type: "geojson",
          source: { type: "geojson", url: sourceUrl },
          visible: true,
          opacity: 1,
          style,
          metadata: buildLayerMetadata({
            id,
            layer,
            layerName,
            style,
            sourceUrl,
          }),
          sourcePath: sourceUrl,
          groupId: group.id,
        });
      } else {
        const source = buildWmsSource(
          baseUrl,
          layer.workspace,
          layerName,
          layer.wmsStyle
        );
        const wcsDownloadUrl = buildWcsUrl(baseUrl, layer.workspace, layerName);
        const metadata = buildLayerMetadata({
          id,
          layer,
          layerName,
          style,
          sourceUrl: source.url,
        });
        layers.push({
          id,
          name: layer.label,
          type: "wms",
          source,
          visible: true,
          opacity: 1,
          style,
          metadata: {
            ...metadata,
            corestack: {
              ...metadata.corestack,
              wcsDownloadUrl,
            },
          },
          sourcePath: source.url,
          groupId: group.id,
        });
      }
    }
  }

  if (!layers.length) {
    throw new Error("The selected layers need a valid year or source.");
  }

  const activeGroups = GEOLIBRE_LAYER_GROUPS.filter((group) =>
    layers.some((layer) => layer.groupId === group.id)
  ).map((group) => ({
    id: group.id,
    name: group.label,
    collapsed: false,
    visible: true,
    opacity: 1,
  }));
  const styles = Object.fromEntries(
    layers.map((layer) => [layer.id, layer.style])
  );

  return {
    version: GEOLIBRE_PROJECT_VERSION,
    name: `${tehsil}, ${district}: CoRE Stack layers`,
    mapView: normalizedMapView(mapView),
    basemapStyleUrl: DEFAULT_BASEMAP_STYLE,
    basemapVisible: true,
    basemapOpacity: 1,
    layers,
    layerGroups: activeGroups,
    styles,
    preferences: projectPreferences,
    legend: {
      title: `${tehsil} layers`,
      groupByLayer: true,
      order: layers.map((layer) => layer.id),
      overrides: {},
    },
    metadata: {
      generatedAtUtc: new Date().toISOString(),
      generatedBy: "Know Your Landscape",
      scope: { level: "tehsil", state, district, tehsil },
      dataContract:
        "Live CoRE Stack GeoServer references; no feature data is embedded",
      geolibre: {
        viewerUrl: GEOLIBRE_VIEWER_URL,
        projectVersion: GEOLIBRE_PROJECT_VERSION,
      },
      qmlStyleContract:
        "Vector QML symbology is represented in GeoLibre styles; raster QML is served through named GeoServer WMS styles. Original QML URLs remain attached to every layer.",
    },
  };
};

const fileSlug = (value) =>
  formatGeoServerName(value).replace(/[^a-z0-9_-]/g, "") || "tehsil";

export const downloadGeoLibreProject = (project) => {
  const contents = `${JSON.stringify(project, null, 2)}\n`;
  const blob = new Blob([contents], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${fileSlug(project?.metadata?.scope?.tehsil)}.geolibre.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
