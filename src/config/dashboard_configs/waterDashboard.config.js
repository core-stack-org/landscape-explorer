export const WATER_DASHBOARD_CONFIG = {
  project: {
    interventionYear: "2022-23",

    topSectionText: (data) =>
      `Under the project ${data.projectName || "—"}, a total of ${
        data.totalRows?.toLocaleString?.("en-IN") || 0
      } waterbodies have been de-silted, spanning around ${
        data.totalSiltRemoved?.toLocaleString?.("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) || "0.00"
      } Cu.m. After desilting, during the intervention year ${
        data.interventionYear || "—"
      }, the impacted area in the Rabi season is ${
        data.rabiImpact?.toFixed?.(2) || "0.00"
      } hectares and the impacted area in the Zaid season is ${
        data.zaidImpact?.toFixed?.(2) || "0.00"
      } hectares.`,

    tableHeaders: [
      {
        key: "state",
        label: "State",
        info: "State where the waterbody is located.",
        filter: true,
      },
      {
        key: "district",
        label: "District",
        info: "District in which the waterbody falls.",
        filter: true,
      },
      {
        key: "block",
        label: "Taluka",
        info: "Taluka (administrative block).",
        filter: true,
      },
      {
        key: "village",
        label: "GP/Village",
        info: "Gram Panchayat or Village.",
        filter: true,
      },

      {
        key: "waterbody",
        label: "Waterbody",
        info: "Name of waterbody.",
        search: true,
      },

      {
        key: "siltRemoved",
        label: "Silt Removed (Cu.m.)",
        info: "Total amount of silt removed.",
        sortable: true,
      },
      {
        key: "interventionYear",
        label: "Intervention Year",
        info: "Year of intervention.",
      },
      {
        key: "areaOred",
        label: "Size (ha)",
        info: "Area of waterbody in hectares.",
      },

      {
        key: "avgWaterAvailabilityRabi",
        label: "Mean Water Availability Rabi (%)",
        info: "Average water presence during Rabi.",
        sortable: true,
      },
      {
        key: "avgWaterAvailabilityZaid",
        label: "Mean Water Availability Zaid (%)",
        info: "Average water presence during Zaid.",
        sortable: true,
      },
    ],
  },

  tehsil: {
    topSectionText: (data) =>
      `In Tehsil ${data.tehsilName || "—"}, ${
        data.totalRows || 0
      } waterbodies were studied with a combined silt removal of ${
        data.totalSiltRemoved || 0
      } Cu.m. Seasonal water spread changes reflect cropping pattern variability.`,

    tableHeaders: [
      {
        key: "district",
        label: "District",
        info: "District name.",
        filter: true,
      },
      { key: "tehsil", label: "Tehsil", info: "Tehsil name.", filter: true },
      { key: "village", label: "Village", info: "Village name.", filter: true },

      {
        key: "waterbody",
        label: "Waterbody",
        info: "Name of waterbody.",
        search: true,
      },

      { key: "areaOred", label: "Area (ha)", info: "Area in hectares." },

      {
        key: "avgWaterAvailabilityRabi",
        label: "Rabi Water (%)",
        info: "Seasonal water availability in Rabi.",
        sortable: true,
      },
      {
        key: "avgWaterAvailabilityZaid",
        label: "Zaid Water (%)",
        info: "Seasonal water availability in Zaid.",
        sortable: true,
      },
    ],
  },

  sections: {
    section1: {
      title: "Section 1: Water presence and land-use change in the waterbody",
      paragraphs: [
        "This section shows the selected waterbody, silt removal details, and seasonal water availability before and after the intervention, along with yearly trends of cropping patterns within the waterbody boundary.",
        "The boundary shown for the waterbody is the maximal coverage ever gained by the waterbody over the last several years. Depending on rainfall, water use, and other factors like changes in the inlet and outlet channels of the waterbody, not all of the waterbody area will see water in a given year and some of the area may also get utilized for agriculture. This land use in each year can be observed from the map and graphs.",
        "Similarly, the duration of water presence can be seen in terms of how much of the waterbody saw water throughout the year, or during the monsoon and post-monsoon months, or only during the monsoon months.",
      ],
    },

    section2: {
      title:
        "Section 2: Cropping patterns in the Zone of Influence of the waterbody",
      paragraphs: [
        "This section shows the waterbody’s zone of influence (ZoI) and cropping intensities within this zone, along with the NDVI values in the area.",
        "The ZoI of the waterbody is the area impacted by the waterbody through improved soil moisture or use of water for irrigation. Changes before and after the intervention in cropping intensities and NDVI (Normalized Difference Vegetation Index, a common remotely sensed indicator of greenness) in the ZoI can be seen through maps and graphs.",
      ],
    },

    section3: {
      title:
        "Section 3: Micro-watershed context of the waterbody and Catchment area and stream position",
      paragraphs: [
        "This section gives the catchment area from which runoff may drain into the waterbody. A larger catchment area would imply a higher rainfall runoff draining into the waterbody, in turn leading to more storage.This can however get impacted by blocked inlet channels and other changes.",
        "This section also specifies whether the waterbody lies on a drainage line or off a drainage line. Waterbodies on a drainage line, like those behind checkdams, are likely to get silted more quickly. The stream order of the drainage line is also specified in this case. Higher stream orders imply larger drainage lines, and therefore likely more silting in which the waterbody lies.",
        "An additional indicator for the watershed position of the waterbody is also provided. Waterbodies at the head of a watershed up-land areas have a position of 1, and this increases for mid-land and low-land areas. Waterbodies present in lower positions would typically see sub-surface flows from upstream areas in the watershed.",
        "This adjacent map displays the micro-watershed boundary along with its drainage network (blue lines), showing how water flows and is distributed within the micro-watershed. The map also shows the terrain in the micro-watershed.",
      ],
    },
  },

  legends: {
    waterbody: [
      { color: "#74CCF4", label: "Kharif Water" },
      { color: "#1ca3ec", label: "Kharif and Rabi Water" },
      { color: "#0f5e9c", label: "Kharif, Rabi and Zaid Water" },
    ],

    zoi: [
      { color: "#b3561d", label: "Triple Crop" },
      { color: "#FF9371", label: "Double Crop" },
      { color: "#f59d22", label: "Single Non-Kharif" },
      { color: "#BAD93E", label: "Single Kharif" },
    ],

    terrain: [
      { color: "#313695", label: "V-shape river valleys" },
      { color: "#4575b4", label: "Midslope incised drainages" },
      { color: "#91bfdb", label: "Local ridge/hilltops" },
      { color: "#e0f3f8", label: "U-shape valleys" },
      { color: "#fffc00", label: "Broad Flat Areas" },
      { color: "#feb24c", label: "Broad open slopes" },
      { color: "#f46d43", label: "Mesa tops" },
      { color: "#d73027", label: "Upper Slopes" },
      { color: "#a50026", label: "Upland incised drainages" },
      { color: "#800000", label: "Drainage divides" },
      { color: "#4d0000", label: "Mountain tops" },
    ],

    drainage: [
      { color: "#03045E", label: "1" },
      { color: "#023E8A", label: "2" },
      { color: "#0077B6", label: "3" },
      { color: "#0096C7", label: "4" },
      { color: "#00B4D8", label: "5" },
      { color: "#48CAE4", label: "6" },
      { color: "#90E0EF", label: "7" },
      { color: "#ADE8F4", label: "8" },
      { color: "#CAF0F8", label: "9" },
    ],
  },

  ndviYears: ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"],

  sliderLayers: {
    map1: "lulcWaterrej",
    map2: "lulcWaterrej",
  },

  labels: {
    clickToView:
      "To view the detailed dashboard of a waterbody, click on its icon",
  },
};
