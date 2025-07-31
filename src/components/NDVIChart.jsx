import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import regression from "regression";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const NDVIChart = ({ zoiFeatures, waterbody }) => {
  const yearSuffix = ["2017", "2018", "2019", "2020", "2021", "2022", "2023"];

  const matchedFeature = zoiFeatures.find(
    (feature) =>
      feature.get("waterbody_name")?.toLowerCase() ===
      waterbody?.waterbody?.toLowerCase()
  );

  if (!matchedFeature) return null;
  console.log(matchedFeature);

  const ndviDataPoints = [];

  yearSuffix.forEach((year) => {
    const key = `NDVI_${year}`;
    const raw = matchedFeature.get(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        for (const [date, value] of Object.entries(parsed)) {
          ndviDataPoints.push({ date, value });
        }
      } catch (err) {
        console.error(`Error parsing ${key}:`, err);
      }
    }
  });

  if (!ndviDataPoints.length) return null;

  ndviDataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));
  console.log("NDVIIIIIIIIIIIIIIIII", ndviDataPoints);

  // Normalize x-values (days) to 0-1 range
  const startDate = new Date(ndviDataPoints[0].date);
  const endDate = new Date(ndviDataPoints.at(-1).date);
  const totalDays =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

  const normalized = ndviDataPoints.map((point) => {
    const daysSinceStart =
      (new Date(point.date).getTime() - startDate.getTime()) /
      (1000 * 60 * 60 * 24);
    const normalizedX = daysSinceStart / totalDays; // Now between 0 and 1
    return [normalizedX, point.value];
  });

  // Run polynomial regression on normalized x (0 to 1)
  const polyResult = regression.polynomial(normalized, { order: 3 });

  // Generate regression curve (x from 0 to 1), convert back to date
  const regressionData = [];
  const steps = 10; // More points = smoother line
  for (let i = 0; i <= steps; i++) {
    const normalizedX = i / steps;
    const y = polyResult.predict(normalizedX)[1];
    const daysOffset = normalizedX * totalDays;
    const xDate = new Date(startDate.getTime() + daysOffset * 86400000);
    regressionData.push({ x: xDate.toISOString(), y });
  }
  const data = {
    datasets: [
      {
        label: "NDVI Points",
        type: "scatter",
        showLine: false,
        data: ndviDataPoints.map((point) => ({
          x: point.date,
          y: point.value,
        })),
        backgroundColor: "#4caf50",
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Polynomial Regression",
        type: "line",
        data: regressionData,
        borderColor: "red",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        hoverRadius: 0,
        hitRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "month",
          tooltipFormat: "yyyy-MM-dd",
          displayFormats: {
            month: "MMM yyyy",
          },
        },
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        title: {
          display: true,
          text: "NDVI",
        },
        min: 0.0,
        max: 0.6,
      },
    },
  };

  return <Line data={data} options={options} />;
};

export default NDVIChart;
