import React, { useMemo } from "react";
import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Title,
} from "chart.js";

ChartJS.register(LinearScale, PointElement, Tooltip, Title);

const NDMIPointChart = ({ zoiFeatures = [], waterbody }) => {
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
        const distance = parseInt(key.split("_")[0], 10); // e.g., "150_NDMI" -> 150
        return { x: value, y: distance };
      })
      .sort((a, b) => a.y - b.y);
  }, [matchedFeature]);

  const chartData = {
    datasets: [
      {
        label: "NDMI vs Distance",
        data: ndmiDistanceData,
        backgroundColor: "#0074D9",
        pointRadius: 5,
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
            `NDMI: ${context.raw.x}, Distance: ${context.raw.y}m`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "NDMI Value",
        },
        min: -1,
        max: 1,
      },
      y: {
        title: {
          display: true,
          text: "Distance from Waterbody (meters)",
        },
        ticks: {
          stepSize: 50,
          callback: (value) => `${value}m`,
        },
        beginAtZero: true,
      },
    },
  };

  return <Scatter data={chartData} options={chartOptions} />;
};

export default NDMIPointChart;
