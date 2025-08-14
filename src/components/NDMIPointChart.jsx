import React, { useMemo } from "react";
import annotationPlugin from "chartjs-plugin-annotation";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Title,
  LineElement,
} from "chart.js";

ChartJS.register(
  LinearScale,
  PointElement,
  Tooltip,
  Title,
  LineElement,
  annotationPlugin
);

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

  const zoiValue = useMemo(
    () => matchedFeature?.get("zoi") || null,
    [matchedFeature]
  );

  const ndmiDistanceData = useMemo(() => {
    if (!matchedFeature) return [];

    const props = matchedFeature.getProperties();
    console.log(props);

    return Object.entries(props)
      .filter(
        ([key, value]) => key.endsWith("_NDMI") && typeof value === "number"
      )
      .map(([key, value]) => {
        const distance = parseInt(key.split("_")[0], 10); // "150_NDMI" -> 150
        return { x: distance, y: value };
      })
      .filter((point) => point.y >= 0)
      .sort((a, b) => a.x - b.x); // ✅ sort by distance
  }, [matchedFeature]);

  const [minY, maxY] = useMemo(() => {
    if (!ndmiDistanceData.length) return [0, 0.4]; // fallback

    const values = ndmiDistanceData.map((p) => p.y);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    return [
      parseFloat((minValue - 0.01).toFixed(2)), // min with buffer
      parseFloat((maxValue + 0.01).toFixed(2)), // max with buffer
    ];
  }, [ndmiDistanceData]);

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

  // const chartOptions = {
  //   responsive: true,
  //   plugins: {
  //     title: {
  //       display: true,
  //       text: "NDMI Profile from Waterbody",
  //       font: {
  //         size: 18,
  //       },
  //     },
  //     tooltip: {
  //       callbacks: {
  //         label: (context) =>
  //           `Distance: ${context.raw.x}m, NDMI: ${context.raw.y}`,
  //       },
  //     },
  //   },
  //   scales: {
  //     x: {
  //       type: "linear",
  //       title: {
  //         display: true,
  //         text: "Distance from Waterbody (meters)",
  //       },
  //       beginAtZero: true,
  //       ticks: {
  //         callback: (value) => `${value}m`,
  //       },
  //     },
  //     y: {
  //       title: {
  //         display: true,
  //         text: "NDMI Value",
  //       },
  //       min: 0,
  //       max: 0.4,
  //     },
  //   },
  // };

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
      annotation: {
        annotations: zoiValue
          ? {
              zoiLine: {
                type: "line",
                xMin: zoiValue,
                xMax: zoiValue,
                borderColor: "black",
                borderWidth: 2,
                label: {
                  display: true,
                  content: `ZOI (${zoiValue}m)`,
                  position: "start",
                  backgroundColor: "rgba(0,0,0,0.7)",
                  color: "white",
                },
              },
            }
          : {},
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
        min: minY,
        max: maxY,
      },
    },
  };

  return <Line data={chartData} options={chartOptions} />;
};

export default NDMIPointChart;
