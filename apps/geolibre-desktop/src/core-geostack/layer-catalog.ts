export type CoreGeoStackDomain =
  | "Demographic"
  | "Hydrology"
  | "Land"
  | "Agriculture"
  | "Restoration"
  | "NREGA";

export type CoreGeoStackLayerSource = "wfs" | "wms";

export interface CoreGeoStackLocationKey {
  state?: string;
  district?: string;
  tehsil?: string;
}

export interface CoreGeoStackLayerDefinition {
  id: string;
  label: string;
  domain: CoreGeoStackDomain;
  loadGroup: string;
  sourceType: CoreGeoStackLayerSource;
  workspace: string;
  geometryType?: "polygon" | "line" | "point";
  defaultVisible?: boolean;
  styleProfile?: string;
  wmsStyle?: string;
  qmlStyleUrl?: string;
  year?: string;
  layerName: (location: Required<Pick<CoreGeoStackLocationKey, "district" | "tehsil">>) => string;
}

export const CORE_GEOSTACK_LULC_YEARS = Object.freeze([
  { label: "2017-2018", value: "17_18" },
  { label: "2018-2019", value: "18_19" },
  { label: "2019-2020", value: "19_20" },
  { label: "2020-2021", value: "20_21" },
  { label: "2021-2022", value: "21_22" },
  { label: "2022-2023", value: "22_23" },
  { label: "2023-2024", value: "23_24" },
  { label: "2024-2025", value: "24_25" },
]);

const QML_RAW_BASE = "https://raw.githubusercontent.com/core-stack-org/QGIS-Styles/main";
const qmlStyle = (path: string) => `${QML_RAW_BASE}/${path}`;

const baseLayers: CoreGeoStackLayerDefinition[] = [
  {
    id: "administrative_boundaries",
    label: "Administrative Boundaries",
    domain: "Demographic",
    loadGroup: "demographic",
    sourceType: "wfs",
    workspace: "panchayat_boundaries",
    geometryType: "polygon",
    defaultVisible: true,
    styleProfile: "boundary",
    qmlStyleUrl: qmlStyle("Demographic/Administrative-Boundary-Style.qml"),
    layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
  },
  {
    id: "demographics",
    label: "Socio-Economic Profile",
    domain: "Demographic",
    loadGroup: "demographic",
    sourceType: "wfs",
    workspace: "panchayat_boundaries",
    geometryType: "polygon",
    defaultVisible: true,
    styleProfile: "demographics",
    qmlStyleUrl: qmlStyle("Demographic/literary_rate_style.qml"),
    layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
  },
  {
    id: "mws_layers",
    label: "Micro-watersheds and Hydrological Variables",
    domain: "Hydrology",
    loadGroup: "hydrology",
    sourceType: "wfs",
    workspace: "mws_layers",
    geometryType: "polygon",
    styleProfile: "mws",
    qmlStyleUrl: qmlStyle("Climate/MWS-Well-Depth-18_23.qml"),
    layerName: ({ district, tehsil }) => `deltaG_well_depth_${district}_${tehsil}`,
  },
  {
    id: "hydrological_boundaries",
    label: "Hydrological Boundaries",
    domain: "Hydrology",
    loadGroup: "hydrology",
    sourceType: "wfs",
    workspace: "mws_layers",
    geometryType: "polygon",
    styleProfile: "boundary",
    qmlStyleUrl: qmlStyle("Climate/MWS-Well-Depth-18_23.qml"),
    layerName: ({ district, tehsil }) => `deltaG_well_depth_${district}_${tehsil}`,
  },
  {
    id: "mws_layers_fortnight",
    label: "Fortnightly Hydrological Variables",
    domain: "Hydrology",
    loadGroup: "hydrology",
    sourceType: "wfs",
    workspace: "mws_layers",
    geometryType: "polygon",
    styleProfile: "boundary",
    qmlStyleUrl: qmlStyle("Hydrology/water_balance_fortnightly.qml"),
    layerName: ({ district, tehsil }) => `deltaG_fortnight_${district}_${tehsil}`,
  },
  {
    id: "terrain_vector",
    label: "Terrain Vector",
    domain: "Land",
    loadGroup: "land",
    sourceType: "wfs",
    workspace: "terrain",
    geometryType: "polygon",
    styleProfile: "terrain_vector",
    qmlStyleUrl: qmlStyle("Land/Terrain-Vector-Layer-Style.qml"),
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_cluster`,
  },
  {
    id: "drainage",
    label: "Drainage",
    domain: "Hydrology",
    loadGroup: "hydrology",
    sourceType: "wfs",
    workspace: "drainage",
    geometryType: "line",
    styleProfile: "drainage",
    qmlStyleUrl: qmlStyle("Hydrology/Drainage-Layer-Style.qml"),
    layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
  },
  {
    id: "remote_sensed_waterbodies",
    label: "Remote-Sensed Waterbodies",
    domain: "Hydrology",
    loadGroup: "hydrology",
    sourceType: "wfs",
    workspace: "swb",
    geometryType: "polygon",
    styleProfile: "waterbodies",
    qmlStyleUrl: qmlStyle("Hydrology/Surface-Waterbody-style.qml"),
    layerName: ({ district, tehsil }) => `surface_waterbodies_${district}_${tehsil}`,
  },
  {
    id: "soge",
    label: "Stage of Groundwater Extraction",
    domain: "Hydrology",
    loadGroup: "hydrology",
    sourceType: "wfs",
    workspace: "soge",
    geometryType: "polygon",
    styleProfile: "soge",
    qmlStyleUrl: qmlStyle("Hydrology/SOGE_style.qml"),
    layerName: ({ district, tehsil }) => `soge_vector_${district}_${tehsil}`,
  },
  {
    id: "aquifer",
    label: "Aquifer",
    domain: "Hydrology",
    loadGroup: "hydrology",
    sourceType: "wfs",
    workspace: "aquifer",
    geometryType: "polygon",
    styleProfile: "aquifer",
    qmlStyleUrl: qmlStyle("Hydrology/Aquifer_style.qml"),
    layerName: ({ district, tehsil }) => `aquifer_vector_${district}_${tehsil}`,
  },
  {
    id: "cropping_intensity",
    label: "Cropping Intensity",
    domain: "Agriculture",
    loadGroup: "agriculture",
    sourceType: "wfs",
    workspace: "crop_intensity",
    geometryType: "polygon",
    styleProfile: "cropping_intensity",
    qmlStyleUrl: qmlStyle("Agriculture/Cropping_intensity.qml"),
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_intensity`,
  },
  {
    id: "drought",
    label: "Drought",
    domain: "Agriculture",
    loadGroup: "agriculture",
    sourceType: "wfs",
    workspace: "drought",
    geometryType: "polygon",
    styleProfile: "drought",
    qmlStyleUrl: qmlStyle("Agriculture/Drought_style.qml"),
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_drought`,
  },
  {
    id: "nrega",
    label: "NREGA Assets",
    domain: "NREGA",
    loadGroup: "nrega",
    sourceType: "wfs",
    workspace: "nrega_assets",
    geometryType: "point",
    styleProfile: "nrega",
    qmlStyleUrl: qmlStyle("NREGA/NREG-Assets-Classified-Style.qml"),
    layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
  },
  {
    id: "terrain",
    label: "Terrain",
    domain: "Land",
    loadGroup: "land",
    sourceType: "wms",
    workspace: "terrain",
    styleProfile: "terrain",
    wmsStyle: "terrain:terrain_raster",
    qmlStyleUrl: qmlStyle("Land/terrain_1-12class.qml"),
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_terrain_raster`,
  },
  {
    id: "clart",
    label: "CLART",
    domain: "Hydrology",
    loadGroup: "hydrology",
    sourceType: "wms",
    workspace: "clart",
    styleProfile: "clart",
    wmsStyle: "clart:testClart",
    qmlStyleUrl: qmlStyle("Hydrology/CLART-Layer-Style.qml"),
    layerName: ({ district, tehsil }) => `${district}_${tehsil}_clart`,
  },
  {
    id: "afforestation",
    label: "Change Detection: Afforestation",
    domain: "Restoration",
    loadGroup: "restoration",
    sourceType: "wms",
    workspace: "change_detection",
    styleProfile: "afforestation",
    wmsStyle: "change_detection:afforestation",
    qmlStyleUrl: qmlStyle("Land/change_tree_cover_gain.qml"),
    layerName: ({ district, tehsil }) =>
      `change_${district}_${tehsil}_Afforestation`,
  },
  {
    id: "deforestation",
    label: "Change Detection: Deforestation",
    domain: "Restoration",
    loadGroup: "restoration",
    sourceType: "wms",
    workspace: "change_detection",
    styleProfile: "deforestation",
    wmsStyle: "change_detection:deforestation",
    qmlStyleUrl: qmlStyle("Land/change_tree_cover_loss.qml"),
    layerName: ({ district, tehsil }) =>
      `change_${district}_${tehsil}_Deforestation`,
  },
  {
    id: "degradation",
    label: "Change Detection: Degradation",
    domain: "Restoration",
    loadGroup: "restoration",
    sourceType: "wms",
    workspace: "change_detection",
    styleProfile: "degradation",
    wmsStyle: "change_detection:degradation",
    qmlStyleUrl: qmlStyle("Land/change_cropping_reduction.qml"),
    layerName: ({ district, tehsil }) => `change_${district}_${tehsil}_Degradation`,
  },
  {
    id: "urbanization",
    label: "Change Detection: Urbanization",
    domain: "Restoration",
    loadGroup: "restoration",
    sourceType: "wms",
    workspace: "change_detection",
    styleProfile: "urbanization",
    wmsStyle: "change_detection:urbanization",
    qmlStyleUrl: qmlStyle("Land/change_urbanization.qml"),
    layerName: ({ district, tehsil }) => `change_${district}_${tehsil}_Urbanization`,
  },
  {
    id: "cropintensity",
    label: "Change Detection: Crop Intensity",
    domain: "Restoration",
    loadGroup: "restoration",
    sourceType: "wms",
    workspace: "change_detection",
    styleProfile: "cropintensity",
    wmsStyle: "change_detection:cropintensity",
    qmlStyleUrl: qmlStyle("Land/change_cropping_intensity.qml"),
    layerName: ({ district, tehsil }) =>
      `change_${district}_${tehsil}_CropIntensity`,
  },
  {
    id: "restoration",
    label: "Restoration Opportunities",
    domain: "Restoration",
    loadGroup: "restoration",
    sourceType: "wms",
    workspace: "restoration",
    styleProfile: "restoration",
    wmsStyle: "restoration:restoration_style",
    qmlStyleUrl: qmlStyle("Restoration/Restoration_style.qml"),
    layerName: ({ district, tehsil }) =>
      `restoration_${district}_${tehsil}_raster`,
  },
];

const lulcLevels = [
  {
    id: "lulc_level_1",
    label: "LULC Level 1",
    domain: "Land" as const,
    workspace: "LULC_level_1",
    wmsStyle: "LULC_level_1:lulc_level_1_style",
    qmlStyleUrl: qmlStyle("Land/level-1-op.qml"),
  },
  {
    id: "lulc_level_2",
    label: "LULC Level 2",
    domain: "Land" as const,
    workspace: "LULC_level_2",
    wmsStyle: "LULC_level_2:lulc_level_2_style",
    qmlStyleUrl: qmlStyle("Land/level-2.qml"),
  },
  {
    id: "lulc_level_3",
    label: "LULC Level 3",
    domain: "Agriculture" as const,
    workspace: "LULC_level_3",
    wmsStyle: "LULC_level_3:lulc_level_3_style",
    qmlStyleUrl: qmlStyle("Agriculture/level-3.qml"),
  },
];

const lulcLayers: CoreGeoStackLayerDefinition[] = lulcLevels.flatMap(
  (level, levelIndex) =>
    CORE_GEOSTACK_LULC_YEARS.map((year) => ({
      ...level,
      id: `${level.id}_${year.value}`,
      label: `${level.label} · ${year.label}`,
      loadGroup: `lulc-${levelIndex + 1}`,
      sourceType: "wms" as const,
      year: year.value,
      layerName: ({ district, tehsil }) =>
        `LULC_${year.value}_${district}_${tehsil}_level_${levelIndex + 1}`,
    })),
);

export const CORE_GEOSTACK_LAYERS: readonly CoreGeoStackLayerDefinition[] =
  Object.freeze([...baseLayers, ...lulcLayers]);

export const CORE_GEOSTACK_VECTOR_LAYERS = CORE_GEOSTACK_LAYERS.filter(
  (layer) => layer.sourceType === "wfs",
);

export const CORE_GEOSTACK_RASTER_LAYERS = CORE_GEOSTACK_LAYERS.filter(
  (layer) => layer.sourceType === "wms",
);

export function coreGeoStackLayer(id: string): CoreGeoStackLayerDefinition | null {
  return CORE_GEOSTACK_LAYERS.find((layer) => layer.id === id) ?? null;
}

export function slugLocationPart(value: string): string {
  return value
    .replace(/[()]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}
