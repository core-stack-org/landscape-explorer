// import React from "react";
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Tooltip,
//   Legend,
// } from "chart.js";
// import annotationPlugin from "chartjs-plugin-annotation";
// import { Bar } from "react-chartjs-2";

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Tooltip,
//   Legend,
//   annotationPlugin
// );

// const years = ["17-18", "18-19", "19-20", "20-21", "21-22", "22-23", "23-24"];

// const WaterAvailabilityChart = ({ waterbody, water_rej_data }) => {
//   // Prepare empty arrays that will hold season‑wise values for each year
//   const kharifData = new Array(years.length).fill(0);
//   const rabiData = new Array(years.length).fill(0);
//   const zaidData = new Array(years.length).fill(0);

//   // Populate the arrays from feature properties
//   water_rej_data.features.forEach((feature) => {
//     if (feature.properties.waterbody_name === waterbody.waterbody) {
//       const p = feature.properties;

//       years.forEach((year, i) => {
//         kharifData[i] += p[`k_${year}`] ?? 0; // Kharif
//         rabiData[i] += p[`kr_${year}`] ?? 0; // Rabi
//         zaidData[i] += p[`krz_${year}`] ?? 0; // Zaid
//       });
//     }
//   });

//   // Chart.js dataset structure
//   const data = {
//     labels: years,
//     datasets: [
//       {
//         label: "Kharif",
//         data: kharifData,
//         backgroundColor: "#74CCF4",
//       },
//       {
//         label: "Rabi",
//         data: rabiData,
//         backgroundColor: "#1ca3ec",
//       },
//       {
//         label: "Zaid",
//         data: zaidData,
//         backgroundColor: "#0f5e9c",
//       },
//     ],
//   };

//   // Options: turn *off* stacking so bars are grouped
//   const options = {
//     maintainAspectRatio: false,
//     responsive: true,
//     plugins: {
//       legend: { position: "top" },
//       title: {
//         display: true,
//         text: "Water Availability Over Time",
//       },
//       annotation: {
//         annotations: {
//           interventionLine: {
//             type: "line",
//             scaleID: "x",
//             value: "22-23", // Will appear *before* this label
//             borderColor: "black",
//             borderWidth: 2,
//             label: {
//               content: "Intervention Year",
//               enabled: true,
//               position: "start",
//               color: "black",
//               font: {
//                 weight: "bold",
//               },
//             },
//           },
//         },
//       },
//     },
//     scales: {
//       x: {
//         stacked: false,
//         title: { display: true, text: "Year" },
//       },
//       y: {
//         stacked: false,
//         title: { display: true, text: "Area (in Percent)" },
//         min: 0,
//         max: 100,
//         ticks: {
//           callback: (value) => `${value}`, // Optional: show '%' symbol
//         },
//       },
//     },
//   };

//   return (
//     <div style={{ width: "100%", height: "100%" }}>
//       <Bar options={options} data={data} />
//     </div>
//     // <div
//     //   style={{
//     //     display: "flex",
//     //     alignItems: "center",
//     //   }}
//     // >
//     //   <div style={{ flex: 1 }}>
//     //     <Bar options={options} data={data} />
//     //   </div>
//     //   <div style={{ marginLeft: "16px", fontSize: "14px", color: "#333" }}>
//     //     The{" "}
//     //     <span style={{ color: "black", fontWeight: "bold" }}>black line</span>{" "}
//     //     represents the year of intervention.
//     //   </div>
//     // </div>
//   );
// };

// export default WaterAvailabilityChart;

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  annotationPlugin,
  PointElement,
  LineElement
);

const years = ["17-18", "18-19", "19-20", "20-21", "21-22", "22-23", "23-24"];

const WaterAvailabilityChart = ({ waterbody, water_rej_data, mwsFeature }) => {
  console.log(mwsFeature);

  const yearMap = {
    "17-18": "2017-2018",
    "18-19": "2018-2019",
    "19-20": "2019-2020",
    "20-21": "2020-2021",
    "21-22": "2021-2022",
    "22-23": "2022-2023",
    "23-24": "2023-2024",
  };

  const totalRainfall = years.reduce((acc, year) => {
    const longYear = yearMap[year];

    const kharif =
      mwsFeature?.properties?.[`precipitation_kharif_${longYear}`] ?? 0;
    const rabi =
      mwsFeature?.properties?.[`precipitation_rabi_${longYear}`] ?? 0;
    const zaid =
      mwsFeature?.properties?.[`precipitation_zaid_${longYear}`] ?? 0;

    acc[`TR${year}`] = kharif + rabi + zaid;
    return acc;
  }, {});

  console.log(totalRainfall);

  const categories = [
    { key: "zaid", label: "Kharif Rabi Zaid", color: "#0f5e9c" },
    { key: "rabi", label: " Kharif Rabi ", color: "#1ca3ec" },
    { key: "kharif", label: "Kharif", color: "#74CCF4" },
    { key: "shrubs", label: "Shrubs/Scrubs", color: "#eaa4f0" },
    { key: "single_kharif", label: "Single Kharif", color: "#BAD93E" },
    { key: "single_non_kharif", label: "Single Non-Kharif", color: "#f59d22" },
    { key: "tree", label: "Tree/Forest", color: "#38761d" },
    { key: "barren_land", label: "Barren Land", color: "#A9A9A9" },
    { key: "double_cropping", label: "Double Cropping", color: "#FF9371" },
    { key: "triple_cropping", label: "Triple Cropping", color: "#b3561d" },
    { key: "builtup", label: "Built-up", color: "#ff0000" },
  ];

  const rawData = years.map(() => ({
    kharif: 0,
    rabi: 0,
    zaid: 0,
    shrubs: 0,
    single_kharif: 0,
    single_non_kharif: 0,
    tree: 0,
    barren_land: 0,
    double_cropping: 0,
    triple_cropping: 0,
    builtup: 0,
  }));

  water_rej_data.features.forEach((feature) => {
    if (feature.properties.waterbody_name === waterbody.waterbody) {
      const p = feature.properties;
      years.forEach((year, i) => {
        const k = p[`k_${year}`] ?? 0;
        const kr = p[`kr_${year}`] ?? 0;
        const krz = p[`krz_${year}`] ?? 0;

        const zaid = krz;
        const rabi = Math.max(0, kr - krz);
        const kharif = Math.max(0, k - kr);

        rawData[i].kharif += kharif;
        rawData[i].rabi += rabi;
        rawData[i].zaid += zaid;
        rawData[i].shrubs += p[`shrubs_${year}`] ?? 0;
        rawData[i].single_kharif += p[`single_kharif_${year}`] ?? 0;
        rawData[i].single_non_kharif += p[`single_kharif_no_${year}`] ?? 0;
        rawData[i].tree += p[`tree_${year}`] ?? 0;
        rawData[i].barren_land += p[`barren_land_${year}`] ?? 0;
        rawData[i].double_cropping += p[`double_cropping_${year}`] ?? 0;
        rawData[i].triple_cropping += p[`tripple_cropping_${year}`] ?? 0;
        rawData[i].builtup += p[`build_up_${year}`] ?? 0;
      });
    }
  });

  // Normalize totals to 100% if needed
  const normalizedData = rawData.map((yearData) => {
    const total = Object.values(yearData).reduce((sum, v) => sum + v, 0);
    const scale = total > 100 ? 100 / total : 1;
    return Object.fromEntries(
      Object.entries(yearData).map(([key, value]) => [key, value * scale])
    );
  });

  const datasets = categories.map((cat) => ({
    label: cat.label,
    backgroundColor: cat.color,
    data: normalizedData.map((yearData) => yearData[cat.key]),
    order: 2,
  }));

  datasets.push({
    type: "line",
    label: "Total Rainfall (mm)",
    data: years.map((year) => totalRainfall[`TR${year}`] ?? 0),
    borderColor: "#4F555F",
    backgroundColor: "#4F555F",
    yAxisID: "y1",
    tension: 0,
    pointRadius: 4,
    pointBackgroundColor: "#4F555F",
    pointBorderWidth: 2,
    order: 1,
  });

  const data = {
    labels: years,
    datasets,
  };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "Land Use Categories Over Time (Max 100%)",
      },
      annotation: {
        annotations: {
          interventionLine: {
            type: "line",
            scaleID: "x",
            value: "22-23",
            borderColor: "black",
            borderWidth: 2,
            label: {
              content: "Intervention Year",
              enabled: true,
              position: "start",
              color: "black",
              font: { weight: "bold" },
            },
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        title: { display: true, text: "Year" },
      },
      y: {
        stacked: true,
        title: { display: true, text: "Land Use (%)" },
        min: 0,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`,
        },
      },
      y1: {
        position: "right",
        title: { display: true, text: "Rainfall (mm)" },
        grid: { drawOnChartArea: false },
      },
    },
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Bar options={options} data={data} />
    </div>
  );
};

export default WaterAvailabilityChart;
