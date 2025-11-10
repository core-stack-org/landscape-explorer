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
  ScatterController,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { create, all } from "mathjs";
const math = create(all);

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ScatterController
);

// Whittaker smoothing (Eilers, 2003)
const whittakerSmooth = (y, lambda = 100, d = 2) => {
  const n = y.length;
  const E = Array.from({ length: n }, (_, i) => {
    const row = new Array(n).fill(0);
    row[i] = 1;
    return row;
  });

  let D = [];
  for (let i = 0; i < n - d; i++) {
    const row = new Array(n).fill(0);
    for (let j = 0; j <= d; j++) {
      row[i + j] = (j % 2 === 0 ? 1 : -1) * (d === 2 && j === 1 ? 2 : 1);
    }
    D.push(row);
  }

  const DT = math.transpose(D);
  const B = math.add(E, math.multiply(lambda, math.multiply(DT, D)));
  const z = math.lusolve(B, y).flat();
  return z;
};

const NDVIChart = ({
  zoiFeatures,
  waterbody,
  years = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"],
}) => {
  const matchedFeature = zoiFeatures.find(
    (feature) =>
      feature.get("UID")?.toLowerCase() === waterbody?.UID?.toLowerCase()
  );

  if (!matchedFeature) return null;

  const ndviPoints = [];

  years.forEach((year) => {
    const raw = matchedFeature.get(`NDVI_${year}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        Object.entries(parsed).forEach(([date, value]) => {
          ndviPoints.push({ x: date, y: value });
        });
      } catch (err) {
        console.error(`Error parsing NDVI_${year}:`, err);
      }
    }
  });

  if (!ndviPoints.length) return null;

  ndviPoints.sort((a, b) => new Date(a.x) - new Date(b.x));

  // Prepare Y values but replace negatives with nearest neighbor interpolation
  const yValues = ndviPoints.map((pt) => (pt.y >= 0 ? pt.y : null));

  // Simple linear interpolation for missing (negative) values
  const interpolated = [...yValues];
  for (let i = 0; i < interpolated.length; i++) {
    if (interpolated[i] === null) {
      // find previous and next non-null
      let prevIndex = i - 1;
      while (prevIndex >= 0 && interpolated[prevIndex] === null) prevIndex--;
      let nextIndex = i + 1;
      while (
        nextIndex < interpolated.length &&
        interpolated[nextIndex] === null
      )
        nextIndex++;
      if (prevIndex >= 0 && nextIndex < interpolated.length) {
        const ratio = (i - prevIndex) / (nextIndex - prevIndex);
        interpolated[i] =
          interpolated[prevIndex] +
          ratio * (interpolated[nextIndex] - interpolated[prevIndex]);
      } else {
        interpolated[i] =
          prevIndex >= 0
            ? interpolated[prevIndex]
            : interpolated[nextIndex] || 0;
      }
    }
  }

  // Smooth the interpolated values
  const smoothed = whittakerSmooth(interpolated, 2, 2);

  const smoothedCurve = ndviPoints.map((pt, idx) => ({
    x: pt.x,
    y: smoothed[idx],
  }));

  const data = {
    datasets: [
      {
        label: `NDVI Raw`,
        type: "scatter",
        data: ndviPoints.map((pt) => (pt.y >= 0 ? pt : { ...pt, y: null })),
        backgroundColor: "#4caf50",
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: false, // raw scatter won't connect
      },
      {
        label: `Whittaker Smoothed`,
        type: "line",
        data: smoothedCurve,
        borderColor: "blue",
        borderWidth: 2,
        pointRadius: 0,
        spanGaps: true, // connect line over skipped points
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    layout: {
      padding: { bottom: -24 }, // same padding for both
    },

    plugins: {
      legend: { display: true },
      position: "top",
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "month",
          tooltipFormat: "yyyy-MM-dd",
          displayFormats: { month: "MMM yyyy" },
        },
        title: { display: true, text: "Date" },
      },
      y: {
        title: { display: true, text: "NDVI" },
        min: 0,
        max: 0.7,
      },
    },
  };

  return <Line data={data} options={options} />;
};

export default NDVIChart;
