// import React, { useMemo } from "react";
// import { Scatter } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   LinearScale,
//   PointElement,
//   Tooltip,
//   Title,
// } from "chart.js";

// ChartJS.register(LinearScale, PointElement, Tooltip, Title);

// const NDMIPointChart = ({ zoiFeatures = [], waterbody }) => {
//   const waterbodyName = useMemo(() => {
//     return waterbody?.waterbody?.toLowerCase().trim() || "";
//   }, [waterbody]);

//   const matchedFeature = useMemo(() => {
//     if (!waterbodyName || !zoiFeatures.length) return null;

//     return (
//       zoiFeatures.find((feature) => {
//         const name = feature.get("waterbody_name")?.toLowerCase().trim();
//         return name === waterbodyName;
//       }) || null
//     );
//   }, [zoiFeatures, waterbodyName]);

//   const ndmiDistanceData = useMemo(() => {
//     if (!matchedFeature) return [];

//     const props = matchedFeature.getProperties();

//     return Object.entries(props)
//       .filter(
//         ([key, value]) => key.endsWith("_NDMI") && typeof value === "number"
//       )
//       .map(([key, value]) => {
//         const distance = parseInt(key.split("_")[0], 10); // e.g., "150_NDMI" -> 150
//         return { x: distance, y: value };
//       })
//       .sort((a, b) => a.y - b.y);
//   }, [matchedFeature]);

//   const chartData = {
//     datasets: [
//       {
//         label: "NDMI vs Distance",
//         data: ndmiDistanceData,
//         backgroundColor: "#0074D9",
//         pointRadius: 5,
//       },
//     ],
//   };

//   const chartOptions = {
//     responsive: true,
//     plugins: {
//       title: {
//         display: true,
//         text: "NDMI Profile from Waterbody",
//         font: {
//           size: 18,
//         },
//       },
//       tooltip: {
//         callbacks: {
//           label: (context) =>
//             `NDMI: ${context.raw.x}, Distance: ${context.raw.y}m`,
//         },
//       },
//     },
//     scales: {
//       x: {
//         title: {
//           display: true,
//           text: "Distance from Waterbody (meters)",
//         },
//         ticks: {
//           stepSize: 50,
//           callback: (value) => `${value}m`,
//         },
//         beginAtZero: true,
//       },
//       y: {
//         title: {
//           display: true,
//           text: "NDMI Value",
//         },
//         min: -1,
//         max: 1,
//       },
//     },
//   };

//   return <Scatter data={chartData} options={chartOptions} />;
// };

// export default NDMIPointChart;

import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Title,
  LineElement,
} from "chart.js";

ChartJS.register(LinearScale, PointElement, Tooltip, Title, LineElement);

const NDMIPointChart = ({ zoiFeatures, waterbody }) => {
  console.log(zoiFeatures);
  const waterbodyName = useMemo(() => {
    return waterbody?.waterbody?.toLowerCase().trim() || "";
  }, [waterbody]);

  const matchedFeature = useMemo(() => {
    if (!waterbodyName || !zoiFeatures.length) return null;

    return (
      zoiFeatures.find((feature) => {
        const name = feature.get("waterbody_name")?.toLowerCase().trim();
        return name === waterbodyName;
      }) || null
    );
  }, [zoiFeatures, waterbodyName]);

  const ndmiDistanceData = useMemo(() => {
    if (!matchedFeature) return [];

    const props = matchedFeature.getProperties();

    return Object.entries(props)
      .filter(
        ([key, value]) => key.endsWith("_NDMI") && typeof value === "number"
      )
      .map(([key, value]) => {
        const distance = parseInt(key.split("_")[0], 10); // "150_NDMI" -> 150
        return { x: distance, y: value };
      })
      .sort((a, b) => a.x - b.x); // ✅ sort by distance
  }, [matchedFeature]);

  const chartData = {
    datasets: [
      {
        label: "NDMI vs Distance",
        data: ndmiDistanceData,
        borderColor: "#2ECC40", // green line
        backgroundColor: "#2ECC40",
        pointRadius: 4,
        pointBackgroundColor: "#2ECC40",
        showLine: true, // ✅ connect points with line
        tension: 0, // 0 = straight lines (no curve)
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "NDMI Profile from Waterbody",
        font: {
          size: 18,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) =>
            `Distance: ${context.raw.x}m, NDMI: ${context.raw.y}`,
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: {
          display: true,
          text: "Distance from Waterbody (meters)",
        },
        beginAtZero: true,
        ticks: {
          callback: (value) => `${value}m`,
        },
      },
      y: {
        title: {
          display: true,
          text: "NDMI Value",
        },
        min: 0,
        max: 0.6,
      },
    },
  };

  return <Line data={chartData} options={chartOptions} />;
};

export default NDMIPointChart;
