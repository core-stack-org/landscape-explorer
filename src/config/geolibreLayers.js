const QML_RAW_BASE =
  "https://raw.githubusercontent.com/core-stack-org/QGIS-Styles/main";

const qmlStyle = (path) => `${QML_RAW_BASE}/${path}`;

export const GEOLIBRE_LULC_YEARS = [
  { label: "None", value: null },
  { label: "2017-2018", value: "17_18" },
  { label: "2018-2019", value: "18_19" },
  { label: "2019-2020", value: "19_20" },
  { label: "2020-2021", value: "20_21" },
  { label: "2021-2022", value: "21_22" },
  { label: "2022-2023", value: "22_23" },
  { label: "2023-2024", value: "23_24" },
  { label: "2024-2025", value: "24_25" },
];

export const DEFAULT_GEOLIBRE_LULC_YEARS = {
  lulc_level_1: "24_25",
  lulc_level_2: "24_25",
  lulc_level_3: "24_25",
};

export const GEOLIBRE_LAYER_GROUPS = [
  {
    id: "land",
    label: "Land",
    layers: [
      {
        id: "terrain",
        name: "terrain",
        label: "Terrain",
        sourceType: "wms",
        workspace: "terrain",
        layerName: ({ district, tehsil }) =>
          `${district}_${tehsil}_terrain_raster`,
        wmsStyle: "terrain:terrain_raster",
        qmlStyleUrl: qmlStyle("Land/terrain_1-12class.qml"),
      },
      {
        id: "terrain_vector",
        name: "terrain_vector",
        label: "Terrain Vector",
        sourceType: "wfs",
        workspace: "terrain",
        geometryType: "polygon",
        layerName: ({ district, tehsil }) => `${district}_${tehsil}_cluster`,
        styleProfile: "terrain_vector",
        qmlStyleUrl: qmlStyle("Land/Terrain-Vector-Layer-Style.qml"),
      },
      {
        id: "lulc_level_1",
        name: "lulc_level_1",
        label: "LULC Layer Level 1",
        sourceType: "wms",
        workspace: "LULC_level_1",
        yearKey: "lulc_level_1",
        layerName: ({ district, tehsil, year }) =>
          `LULC_${year}_${district}_${tehsil}_level_1`,
        wmsStyle: "LULC_level_1:lulc_level_1_style",
        qmlStyleUrl: qmlStyle("Land/level-1-op.qml"),
      },
      {
        id: "lulc_level_2",
        name: "lulc_level_2",
        label: "LULC Layer Level 2",
        sourceType: "wms",
        workspace: "LULC_level_2",
        yearKey: "lulc_level_2",
        layerName: ({ district, tehsil, year }) =>
          `LULC_${year}_${district}_${tehsil}_level_2`,
        wmsStyle: "LULC_level_2:lulc_level_2_style",
        qmlStyleUrl: qmlStyle("Land/level-2.qml"),
      },
    ],
  },
  {
    id: "climate",
    label: "Climate",
    layers: [
      {
        id: "mws_layers",
        name: "mws_layers",
        label: "Hydrological Variables (Precipitation, ET, Groundwater, etc.)",
        sourceType: "wfs",
        workspace: "mws_layers",
        geometryType: "polygon",
        layerName: ({ district, tehsil }) =>
          `deltaG_well_depth_${district}_${tehsil}`,
        styleProfile: "mws",
        qmlStyleUrl: qmlStyle("Climate/MWS-Well-Depth-18_23.qml"),
      },
      {
        id: "mws_layers_fortnight",
        name: "mws_layers_fortnight",
        label:
          "Fortnightly Hydrological Variables (Precipitation, ET, Groundwater, etc.)",
        sourceType: "wfs",
        workspace: "mws_layers",
        geometryType: "polygon",
        layerName: ({ district, tehsil }) =>
          `deltaG_fortnight_${district}_${tehsil}`,
        styleProfile: "boundary",
        qmlStyleUrl: qmlStyle("Hydrology/water_balance_fortnightly.qml"),
      },
      {
        id: "hydrological_boundaries",
        name: "hydrological_boundaries",
        label: "Hydrological Boundaries",
        sourceType: "wfs",
        workspace: "mws_layers",
        geometryType: "polygon",
        layerName: ({ district, tehsil }) =>
          `deltaG_well_depth_${district}_${tehsil}`,
        styleProfile: "boundary",
        qmlStyleUrl: qmlStyle("Climate/MWS-Well-Depth-18_23.qml"),
      },
    ],
  },
  {
    id: "hydrology",
    label: "Hydrology",
    layers: [
      {
        id: "drainage",
        name: "drainage",
        label: "Drainage",
        sourceType: "wfs",
        workspace: "drainage",
        geometryType: "line",
        layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
        styleProfile: "drainage",
        qmlStyleUrl: qmlStyle("Hydrology/Drainage-Layer-Style.qml"),
      },
      {
        id: "remote_sensed_waterbodies",
        name: "remote_sensed_waterbodies",
        label: "Remote-Sensed Waterbodies",
        sourceType: "wfs",
        workspace: "swb",
        geometryType: "polygon",
        layerName: ({ district, tehsil }) =>
          `surface_waterbodies_${district}_${tehsil}`,
        styleProfile: "waterbodies",
        qmlStyleUrl: qmlStyle("Hydrology/Surface-Waterbody-style.qml"),
      },
      {
        id: "clart",
        name: "clart",
        label: "CLART",
        sourceType: "wms",
        workspace: "clart",
        layerName: ({ district, tehsil }) => `${district}_${tehsil}_clart`,
        wmsStyle: "clart:testClart",
        qmlStyleUrl: qmlStyle("Hydrology/CLART-Layer-Style.qml"),
      },
      {
        id: "soge",
        name: "soge",
        label: "SOGE",
        sourceType: "wfs",
        workspace: "soge",
        geometryType: "polygon",
        layerName: ({ district, tehsil }) =>
          `soge_vector_${district}_${tehsil}`,
        styleProfile: "soge",
        qmlStyleUrl: qmlStyle("Hydrology/SOGE_style.qml"),
      },
      {
        id: "aquifer",
        name: "aquifer",
        label: "Aquifer",
        sourceType: "wfs",
        workspace: "aquifer",
        geometryType: "polygon",
        layerName: ({ district, tehsil }) =>
          `aquifer_vector_${district}_${tehsil}`,
        styleProfile: "aquifer",
        qmlStyleUrl: qmlStyle("Hydrology/Aquifer_style.qml"),
      },
    ],
  },
  {
    id: "agriculture",
    label: "Agriculture",
    layers: [
      {
        id: "lulc_level_3",
        name: "lulc_level_3",
        label: "LULC Layer Level 3",
        sourceType: "wms",
        workspace: "LULC_level_3",
        yearKey: "lulc_level_3",
        layerName: ({ district, tehsil, year }) =>
          `LULC_${year}_${district}_${tehsil}_level_3`,
        wmsStyle: "LULC_level_3:lulc_level_3_style",
        qmlStyleUrl: qmlStyle("Agriculture/level-3.qml"),
      },
      {
        id: "cropping_intensity",
        name: "cropping_intensity",
        label: "Cropping Intensity",
        sourceType: "wfs",
        workspace: "crop_intensity",
        geometryType: "polygon",
        layerName: ({ district, tehsil }) =>
          `${district}_${tehsil}_intensity`,
        styleProfile: "cropping_intensity",
        qmlStyleUrl: qmlStyle("Agriculture/Cropping_intensity.qml"),
      },
      {
        id: "drought",
        name: "drought",
        label: "Drought",
        sourceType: "wfs",
        workspace: "drought",
        geometryType: "polygon",
        layerName: ({ district, tehsil }) => `${district}_${tehsil}_drought`,
        styleProfile: "drought",
        qmlStyleUrl: qmlStyle("Agriculture/Drought_style.qml"),
      },
    ],
  },
  {
    id: "restoration",
    label: "Restoration",
    layers: [
      {
        id: "afforestation",
        name: "afforestation",
        label: "Change Detection Afforestation",
        sourceType: "wms",
        workspace: "change_detection",
        layerName: ({ district, tehsil }) =>
          `change_${district}_${tehsil}_Afforestation`,
        wmsStyle: "change_detection:afforestation",
        qmlStyleUrl: qmlStyle("Land/change_tree_cover_gain.qml"),
      },
      {
        id: "deforestation",
        name: "deforestation",
        label: "Change Detection Deforestation",
        sourceType: "wms",
        workspace: "change_detection",
        layerName: ({ district, tehsil }) =>
          `change_${district}_${tehsil}_Deforestation`,
        wmsStyle: "change_detection:deforestation",
        qmlStyleUrl: qmlStyle("Land/change_tree_cover_loss.qml"),
      },
      {
        id: "degradation",
        name: "degradation",
        label: "Change Detection Degradation",
        sourceType: "wms",
        workspace: "change_detection",
        layerName: ({ district, tehsil }) =>
          `change_${district}_${tehsil}_Degradation`,
        wmsStyle: "change_detection:degradation",
        qmlStyleUrl: qmlStyle("Land/change_cropping_reduction.qml"),
      },
      {
        id: "urbanization",
        name: "urbanization",
        label: "Change Detection Urbanization",
        sourceType: "wms",
        workspace: "change_detection",
        layerName: ({ district, tehsil }) =>
          `change_${district}_${tehsil}_Urbanization`,
        wmsStyle: "change_detection:urbanization",
        qmlStyleUrl: qmlStyle("Land/change_urbanization.qml"),
      },
      {
        id: "cropintensity",
        name: "cropintensity",
        label: "Change Detection Crop-Intensity",
        sourceType: "wms",
        workspace: "change_detection",
        layerName: ({ district, tehsil }) =>
          `change_${district}_${tehsil}_CropIntensity`,
        wmsStyle: "change_detection:cropintensity",
        qmlStyleUrl: qmlStyle("Land/change_cropping_intensity.qml"),
      },
      {
        id: "restoration",
        name: "restoration",
        label: "Change Detection Restoration",
        sourceType: "wms",
        workspace: "restoration",
        layerName: ({ district, tehsil }) =>
          `restoration_${district}_${tehsil}_raster`,
        wmsStyle: "restoration:restoration_style",
        qmlStyleUrl: qmlStyle("Restoration/Restoration_style.qml"),
      },
    ],
  },
  {
    id: "nrega",
    label: "NREGA",
    layers: [
      {
        id: "nrega",
        name: "nrega",
        label: "NREGA",
        sourceType: "wfs",
        workspace: "nrega_assets",
        geometryType: "point",
        layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
        styleProfile: "nrega",
        qmlStyleUrl: qmlStyle("NREGA/NREG-Assets-Classified-Style.qml"),
      },
    ],
  },
  {
    id: "demographic",
    label: "Demographic",
    layers: [
      {
        id: "administrative_boundaries",
        name: "administrative_boundaries",
        label: "Administrative Boundaries",
        sourceType: "wfs",
        workspace: "panchayat_boundaries",
        geometryType: "polygon",
        layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
        styleProfile: "boundary",
        qmlStyleUrl: qmlStyle(
          "Demographic/Administrative-Boundary-Style.qml"
        ),
      },
      {
        id: "demographics",
        name: "demographics",
        label: "Socio-Economic",
        sourceType: "wfs",
        workspace: "panchayat_boundaries",
        geometryType: "polygon",
        layerName: ({ district, tehsil }) => `${district}_${tehsil}`,
        styleProfile: "demographics",
        qmlStyleUrl: qmlStyle("Demographic/literary_rate_style.qml"),
      },
    ],
  },
];

export const GEOLIBRE_LAYERS = GEOLIBRE_LAYER_GROUPS.flatMap((group) =>
  group.layers.map((layer) => ({ ...layer, groupId: group.id, groupLabel: group.label }))
);

export const GEOLIBRE_LAYER_BY_ID = Object.fromEntries(
  GEOLIBRE_LAYERS.map((layer) => [layer.id, layer])
);

export const getAllGeoLibreLayerIds = () =>
  GEOLIBRE_LAYERS.map((layer) => layer.id);
