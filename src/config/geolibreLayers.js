const QML_RAW_BASE =
  "https://raw.githubusercontent.com/core-stack-org/QGIS-Styles/main";

const qmlStyle = (path) => `${QML_RAW_BASE}/${path}`;

export const GEOLIBRE_LULC_YEARS = [
  { label: "2017-2018", value: "17_18" },
  { label: "2018-2019", value: "18_19" },
  { label: "2019-2020", value: "19_20" },
  { label: "2020-2021", value: "20_21" },
  { label: "2021-2022", value: "21_22" },
  { label: "2022-2023", value: "22_23" },
  { label: "2023-2024", value: "23_24" },
  { label: "2024-2025", value: "24_25" },
];

export const LATEST_GEOLIBRE_LULC_YEAR =
  GEOLIBRE_LULC_YEARS[GEOLIBRE_LULC_YEARS.length - 1].value;

const LAYERS = [
  {
    id: "demographics",
    label: "Socio-Economic Profile",
    domain: "Demographic",
    loadGroup: "overview",
    sourceType: "wfs",
    workspace: "panchayat_boundaries",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
    styleProfile: "demographics",
    qmlStyleUrl: qmlStyle("Demographic/literary_rate_style.qml"),
  },
  {
    id: "administrative_boundaries",
    label: "Administrative Boundaries",
    domain: "Demographic",
    loadGroup: "overview",
    sourceType: "wfs",
    workspace: "panchayat_boundaries",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
    styleProfile: "boundary",
    qmlStyleUrl: qmlStyle("Demographic/Administrative-Boundary-Style.qml"),
  },
  {
    id: "mws_layers",
    label: "Micro-watersheds and Hydrological Variables",
    domain: "Climate",
    loadGroup: "watersheds",
    sourceType: "wfs",
    workspace: "mws_layers",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) =>
      `deltaG_well_depth_${district}_${tehsil}`,
    styleProfile: "mws",
    qmlStyleUrl: qmlStyle("Climate/MWS-Well-Depth-18_23.qml"),
  },
  {
    id: "hydrological_boundaries",
    label: "Hydrological Boundaries",
    domain: "Climate",
    loadGroup: "watersheds",
    sourceType: "wfs",
    workspace: "mws_layers",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) =>
      `deltaG_well_depth_${district}_${tehsil}`,
    styleProfile: "boundary",
    qmlStyleUrl: qmlStyle("Climate/MWS-Well-Depth-18_23.qml"),
  },
  {
    id: "mws_layers_fortnight",
    label: "Fortnightly Hydrological Variables",
    domain: "Climate",
    loadGroup: "watersheds",
    sourceType: "wfs",
    workspace: "mws_layers",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) =>
      `deltaG_fortnight_${district}_${tehsil}`,
    styleProfile: "boundary",
    qmlStyleUrl: qmlStyle("Hydrology/water_balance_fortnightly.qml"),
  },
  {
    id: "terrain_vector",
    label: "Terrain Vector",
    domain: "Land",
    loadGroup: "vectors",
    sourceType: "wfs",
    workspace: "terrain",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_cluster`,
    styleProfile: "terrain_vector",
    qmlStyleUrl: qmlStyle("Land/Terrain-Vector-Layer-Style.qml"),
  },
  {
    id: "drainage",
    label: "Drainage",
    domain: "Hydrology",
    loadGroup: "vectors",
    sourceType: "wfs",
    workspace: "drainage",
    geometryType: "line",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
    styleProfile: "drainage",
    qmlStyleUrl: qmlStyle("Hydrology/Drainage-Layer-Style.qml"),
  },
  {
    id: "remote_sensed_waterbodies",
    label: "Remote-Sensed Waterbodies",
    domain: "Hydrology",
    loadGroup: "vectors",
    sourceType: "wfs",
    workspace: "swb",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) =>
      `surface_waterbodies_${district}_${tehsil}`,
    styleProfile: "waterbodies",
    qmlStyleUrl: qmlStyle("Hydrology/Surface-Waterbody-style.qml"),
  },
  {
    id: "soge",
    label: "Stage of Groundwater Extraction",
    domain: "Hydrology",
    loadGroup: "vectors",
    sourceType: "wfs",
    workspace: "soge",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) => `soge_vector_${district}_${tehsil}`,
    styleProfile: "soge",
    qmlStyleUrl: qmlStyle("Hydrology/SOGE_style.qml"),
  },
  {
    id: "aquifer",
    label: "Aquifer",
    domain: "Hydrology",
    loadGroup: "vectors",
    sourceType: "wfs",
    workspace: "aquifer",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) =>
      `aquifer_vector_${district}_${tehsil}`,
    styleProfile: "aquifer",
    qmlStyleUrl: qmlStyle("Hydrology/Aquifer_style.qml"),
  },
  {
    id: "cropping_intensity",
    label: "Cropping Intensity",
    domain: "Agriculture",
    loadGroup: "vectors",
    sourceType: "wfs",
    workspace: "crop_intensity",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_intensity`,
    styleProfile: "cropping_intensity",
    qmlStyleUrl: qmlStyle("Agriculture/Cropping_intensity.qml"),
  },
  {
    id: "drought",
    label: "Drought",
    domain: "Agriculture",
    loadGroup: "vectors",
    sourceType: "wfs",
    workspace: "drought",
    geometryType: "polygon",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_drought`,
    styleProfile: "drought",
    qmlStyleUrl: qmlStyle("Agriculture/Drought_style.qml"),
  },
  {
    id: "nrega",
    label: "NREGA Assets",
    domain: "NREGA",
    loadGroup: "vectors",
    sourceType: "wfs",
    workspace: "nrega_assets",
    geometryType: "point",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
    styleProfile: "nrega",
    qmlStyleUrl: qmlStyle("NREGA/NREG-Assets-Classified-Style.qml"),
  },
  {
    id: "terrain",
    label: "Terrain",
    domain: "Land",
    loadGroup: "rasters",
    sourceType: "wms",
    workspace: "terrain",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_terrain_raster`,
    wmsStyle: "terrain:terrain_raster",
    qmlStyleUrl: qmlStyle("Land/terrain_1-12class.qml"),
  },
  {
    id: "clart",
    label: "CLART",
    domain: "Hydrology",
    loadGroup: "rasters",
    sourceType: "wms",
    workspace: "clart",
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_clart`,
    wmsStyle: "clart:testClart",
    qmlStyleUrl: qmlStyle("Hydrology/CLART-Layer-Style.qml"),
  },
  {
    id: "afforestation",
    label: "Change Detection: Afforestation",
    domain: "Restoration",
    loadGroup: "rasters",
    sourceType: "wms",
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
    loadGroup: "rasters",
    sourceType: "wms",
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
    loadGroup: "rasters",
    sourceType: "wms",
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
    loadGroup: "rasters",
    sourceType: "wms",
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
    loadGroup: "rasters",
    sourceType: "wms",
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
    loadGroup: "rasters",
    sourceType: "wms",
    workspace: "restoration",
    layerName: ({ district, tehsil }) =>
      `restoration_${district}_${tehsil}_raster`,
    wmsStyle: "restoration:restoration_style",
    qmlStyleUrl: qmlStyle("Restoration/Restoration_style.qml"),
  },
];

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

export const GEOLIBRE_LULC_LAYERS = LULC_LEVELS.flatMap((level, index) =>
  GEOLIBRE_LULC_YEARS.map((year) => ({
    ...level,
    id: `${level.id}_${year.value}`,
    baseId: level.id,
    label: `${level.label} · ${year.label}`,
    loadGroup: `lulc-${index + 1}`,
    sourceType: "wms",
    year: year.value,
    layerName: ({ district, tehsil }) =>
      `LULC_${year.value}_${district}_${tehsil}_level_${index + 1}`,
  }))
);

export const GEOLIBRE_LAYERS = Object.freeze([
  ...LAYERS,
  ...GEOLIBRE_LULC_LAYERS,
]);

export const GEOLIBRE_VECTOR_LAYERS = GEOLIBRE_LAYERS.filter(
  (layer) => layer.sourceType === "wfs"
);

export const GEOLIBRE_RASTER_LAYERS = GEOLIBRE_LAYERS.filter(
  (layer) => layer.sourceType === "wms"
);
