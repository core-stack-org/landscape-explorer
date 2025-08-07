// import React from "react";
// import { Line } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   LineElement,
//   PointElement,
//   LinearScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   TimeScale,
// } from "chart.js";
// import "chartjs-adapter-date-fns";
// import regression from "regression";

// ChartJS.register(
//   LineElement,
//   PointElement,
//   LinearScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   TimeScale
// );

// const NDVIChart = ({ zoiFeatures, waterbody }) => {
//   const yearSuffix = ["2017", "2018", "2019", "2020", "2021", "2022", "2023"];

//   const matchedFeature = zoiFeatures.find(
//     (feature) =>
//       feature.get("waterbody_name")?.toLowerCase() ===
//       waterbody?.waterbody?.toLowerCase()
//   );

//   if (!matchedFeature) return null;
//   console.log(matchedFeature);

//   const ndviDataPoints = [];

//   yearSuffix.forEach((year) => {
//     const key = `NDVI_${year}`;
//     const raw = matchedFeature.get(key);
//     if (raw) {
//       try {
//         const parsed = JSON.parse(raw);
//         for (const [date, value] of Object.entries(parsed)) {
//           ndviDataPoints.push({ date, value });
//         }
//       } catch (err) {
//         console.error(`Error parsing ${key}:`, err);
//       }
//     }
//   });

//   if (!ndviDataPoints.length) return null;

//   ndviDataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));
//   console.log("NDVIIIIIIIIIIIIIIIII", ndviDataPoints);

//   // Normalize x-values (days) to 0-1 range
//   const startDate = new Date(ndviDataPoints[0].date);
//   const endDate = new Date(ndviDataPoints.at(-1).date);
//   const totalDays =
//     (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

//   const normalized = ndviDataPoints.map((point) => {
//     const daysSinceStart =
//       (new Date(point.date).getTime() - startDate.getTime()) /
//       (1000 * 60 * 60 * 24);
//     const normalizedX = daysSinceStart / totalDays; // Now between 0 and 1
//     return [normalizedX, point.value];
//   });

//   // Run polynomial regression on normalized x (0 to 1)
//   const polyResult = regression.polynomial(normalized, { order: 200 });

//   // Generate regression curve (x from 0 to 1), convert back to date
//   const regressionData = [];
//   const steps = 10; // More points = smoother line
//   for (let i = 0; i <= steps; i++) {
//     const normalizedX = i / steps;
//     const y = polyResult.predict(normalizedX)[1];
//     const daysOffset = normalizedX * totalDays;
//     const xDate = new Date(startDate.getTime() + daysOffset * 86400000);
//     regressionData.push({ x: xDate.toISOString(), y });
//   }
//   const data = {
//     datasets: [
//       {
//         label: "NDVI Points",
//         type: "scatter",
//         showLine: false,
//         data: ndviDataPoints.map((point) => ({
//           x: point.date,
//           y: point.value,
//         })),
//         backgroundColor: "#4caf50",
//         pointRadius: 4,
//         pointHoverRadius: 6,
//       },
//       {
//         label: "Polynomial Regression",
//         type: "line",
//         data: regressionData,
//         borderColor: "red",
//         borderWidth: 2,
//         pointRadius: 0,
//         tension: 0.5,
//         pointRadius: 0,
//         pointHoverRadius: 0,
//         hoverRadius: 0,
//         hitRadius: 0,
//       },
//     ],
//   };

//   const options = {
//     responsive: true,
//     plugins: {
//       legend: { display: true },
//       tooltip: { mode: "index", intersect: false },
//     },
//     scales: {
//       x: {
//         type: "time",
//         time: {
//           unit: "month",
//           tooltipFormat: "yyyy-MM-dd",
//           displayFormats: {
//             month: "MMM yyyy",
//           },
//         },
//         title: {
//           display: true,
//           text: "Date",
//         },
//       },
//       y: {
//         title: {
//           display: true,
//           text: "NDVI",
//         },
//         min: -0.1,
//         max: 0.6,
//       },
//     },
//   };

//   return <Line data={data} options={options} />;
// };

// export default NDVIChart;

//Harmonic regression

// import React from "react";
// import { Line } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   LineElement,
//   PointElement,
//   LinearScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   TimeScale,
// } from "chart.js";
// import "chartjs-adapter-date-fns";
// import { create, all } from "mathjs";

// const math = create(all);

// ChartJS.register(
//   LineElement,
//   PointElement,
//   LinearScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   TimeScale
// );

// // Convert date to number of days since startDate
// const dateToDaysSinceStart = (dateStr, startDate) => {
//   const date = new Date(dateStr);
//   return (date - startDate) / 86400000;
// };

// // Fit harmonic function on entire timespan (e.g., 2017–2023)
// const fitHarmonic = (points) => {
//   const X = [];
//   const Y = [];

//   const T = 365.25; // base periodicity (1 year)
//   const startDate = new Date(points[0].x);

//   points.forEach(({ x, y }) => {
//     const days = dateToDaysSinceStart(x, startDate);
//     X.push([
//       1,
//       Math.cos((2 * Math.PI * days) / T),
//       Math.sin((2 * Math.PI * days) / T),
//       Math.cos((4 * Math.PI * days) / T),
//       Math.sin((4 * Math.PI * days) / T),
//     ]);
//     Y.push(y);
//   });

//   const XT = math.transpose(X);
//   const XT_X = math.multiply(XT, X);
//   const XT_Y = math.multiply(XT, Y);
//   const coefficients = math.lusolve(XT_X, XT_Y).flat();
//   return { coefficients, startDate };
// };

// const generateHarmonicCurve = (coeffs, startDate, totalDays) => {
//   const T = 365.25;
//   const [a0, a1, b1, a2, b2] = coeffs;
//   const result = [];

//   const steps = Math.floor(totalDays / 5); // smoother line
//   for (let i = 0; i <= steps; i++) {
//     const d = (i * totalDays) / steps;
//     const y =
//       a0 +
//       a1 * Math.cos((2 * Math.PI * d) / T) +
//       b1 * Math.sin((2 * Math.PI * d) / T) +
//       a2 * Math.cos((4 * Math.PI * d) / T) +
//       b2 * Math.sin((4 * Math.PI * d) / T);

//     const date = new Date(startDate.getTime() + d * 86400000);
//     result.push({ x: date.toISOString(), y });
//   }

//   return result;
// };

// const HarmonicNDVIChart = ({ zoiFeatures, waterbody }) => {
//   const years = ["2017", "2018", "2019", "2020", "2021", "2022", "2023"];

//   const matchedFeature = zoiFeatures.find(
//     (feature) =>
//       feature.get("waterbody_name")?.toLowerCase() ===
//       waterbody?.waterbody?.toLowerCase()
//   );

//   if (!matchedFeature) return null;

//   const ndviPoints = [];

//   years.forEach((year) => {
//     const raw = matchedFeature.get(`NDVI_${year}`);
//     if (raw) {
//       try {
//         const parsed = JSON.parse(raw);
//         Object.entries(parsed).forEach(([date, value]) => {
//           ndviPoints.push({ x: date, y: value });
//         });
//       } catch (e) {
//         console.error(`Invalid NDVI_${year}`, e);
//       }
//     }
//   });

//   if (ndviPoints.length === 0) return null;

//   ndviPoints.sort((a, b) => new Date(a.x) - new Date(b.x));
//   const { coefficients, startDate } = fitHarmonic(ndviPoints);

//   const totalSpanDays =
//     (new Date(ndviPoints.at(-1).x) - new Date(ndviPoints[0].x)) / 86400000;

//   const harmonicCurve = generateHarmonicCurve(
//     coefficients,
//     startDate,
//     totalSpanDays
//   );

//   const data = {
//     datasets: [
//       {
//         label: "NDVI Observations",
//         type: "scatter",
//         data: ndviPoints,
//         backgroundColor: "#4caf50",
//         pointRadius: 4,
//         pointHoverRadius: 6,
//       },
//       {
//         label: "Harmonic Fit",
//         type: "line",
//         data: harmonicCurve,
//         borderColor: "blue",
//         borderWidth: 2,
//         pointRadius: 0,
//       },
//     ],
//   };

//   const options = {
//     responsive: true,
//     plugins: {
//       legend: { display: true },
//       tooltip: { mode: "index", intersect: false },
//     },
//     scales: {
//       x: {
//         type: "time",
//         time: {
//           unit: "month",
//           tooltipFormat: "yyyy-MM-dd",
//           displayFormats: { month: "MMM yyyy" },
//         },
//         title: { display: true, text: "Date" },
//       },
//       y: {
//         title: { display: true, text: "NDVI" },
//         min: -0.1,
//         max: 0.7,
//       },
//     },
//   };

//   return <Line data={data} options={options} />;
// };

// export default HarmonicNDVIChart;

// import React from "react";
// import { Line } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   LineElement,
//   PointElement,
//   LinearScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   TimeScale,
//   ScatterController,
// } from "chart.js";
// import "chartjs-adapter-date-fns";
// import { create, all } from "mathjs";

// const math = create(all);

// ChartJS.register(
//   LineElement,
//   PointElement,
//   LinearScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   TimeScale,
//   ScatterController
// );

// // Convert date string to days since start
// const dateToDaysSinceStart = (dateStr, startDate) => {
//   console.log("ddddddd", dateStr, startDate);
//   const date = new Date(dateStr);
//   return (date - startDate) / 86400000;
// };

// // Fit 2-term harmonic function over full time range
// const fitHarmonic = (points) => {
//   const X = [];
//   const Y = [];
//   const T = 365.25;
//   const startDate = new Date(points[0].x);

//   points.forEach(({ x, y }) => {
//     const d = dateToDaysSinceStart(x, startDate);
//     X.push([
//       1,
//       Math.cos((2 * Math.PI * d) / T),
//       Math.sin((2 * Math.PI * d) / T),
//       Math.cos((4 * Math.PI * d) / T),
//       Math.sin((4 * Math.PI * d) / T),
//     ]);
//     Y.push(y);
//   });

//   const XT = math.transpose(X);
//   const XT_X = math.multiply(XT, X);
//   const XT_Y = math.multiply(XT, Y);
//   const coefficients = math.lusolve(XT_X, XT_Y).flat();
//   return { coefficients, startDate };
// };

// const generateHarmonicCurve = (coeffs, startDate, totalDays) => {
//   const T = 365.25;
//   const [a0, a1, b1, a2, b2] = coeffs;
//   const result = [];

//   const steps = Math.floor(totalDays / 5); // smoother curve
//   for (let i = 0; i <= steps; i++) {
//     const d = (i * totalDays) / steps;
//     const y =
//       a0 +
//       a1 * Math.cos((2 * Math.PI * d) / T) +
//       b1 * Math.sin((2 * Math.PI * d) / T) +
//       a2 * Math.cos((4 * Math.PI * d) / T) +
//       b2 * Math.sin((4 * Math.PI * d) / T);
//     const date = new Date(startDate.getTime() + d * 86400000);
//     result.push({ x: date.toISOString(), y });
//   }

//   return result;
// };

// const NDVIChart = ({
//   zoiFeatures,
//   waterbody,
//   years = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"],
// }) => {
//   const matchedFeature = zoiFeatures.find(
//     (feature) =>
//       feature.get("waterbody_name")?.toLowerCase() ===
//       waterbody?.waterbody?.toLowerCase()
//   );

//   if (!matchedFeature) return null;

//   const ndviPoints = [];

//   years.forEach((year) => {
//     const raw = matchedFeature.get(`NDVI_${year}`);
//     if (raw) {
//       try {
//         const parsed = JSON.parse(raw);
//         Object.entries(parsed).forEach(([date, value]) => {
//           ndviPoints.push({ x: date, y: value });
//         });
//       } catch (err) {
//         console.error(`Error parsing NDVI_${year}:`, err);
//       }
//     }
//   });

//   if (!ndviPoints.length) return null;

//   ndviPoints.sort((a, b) => new Date(a.x) - new Date(b.x));
//   const { coefficients, startDate } = fitHarmonic(ndviPoints);

//   const totalSpanDays =
//     (new Date(ndviPoints.at(-1).x) - new Date(ndviPoints[0].x)) / 86400000;

//   const harmonicCurve = generateHarmonicCurve(
//     coefficients,
//     startDate,
//     totalSpanDays
//   );

//   const data = {
//     datasets: [
//       {
//         label: `NDVI ${years.join(" & ")}`,
//         type: "scatter",
//         data: ndviPoints,
//         backgroundColor: "#4caf50",
//         pointRadius: 4,
//         pointHoverRadius: 6,
//       },
//       {
//         label: `Harmonic Fit (${years.join(" & ")})`,
//         type: "line",
//         data: harmonicCurve,
//         borderColor: "blue",
//         borderWidth: 2,
//         pointRadius: 0,
//       },
//     ],
//   };

//   const options = {
//     responsive: true,
//     plugins: {
//       legend: { display: true },
//       tooltip: { mode: "index", intersect: false },
//     },
//     scales: {
//       x: {
//         type: "time",
//         time: {
//           unit: "month",
//           tooltipFormat: "yyyy-MM-dd",
//           displayFormats: { month: "MMM yyyy" },
//         },
//         title: { display: true, text: "Date" },
//       },
//       y: {
//         title: { display: true, text: "NDVI" },
//         min: -0.1,
//         max: 0.7,
//       },
//     },
//   };

//   return <Line data={data} options={options} />;
// };

// export default NDVIChart;

//Whittaker smoothing

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

  // Build difference matrix D
  let D = [];
  for (let i = 0; i < n - d; i++) {
    const row = new Array(n).fill(0);
    for (let j = 0; j <= d; j++) {
      row[i + j] = (j % 2 === 0 ? 1 : -1) * (d === 2 && j === 1 ? 2 : 1);
    }
    D.push(row);
  }

  // Compute: (E + lambda * D^T * D)^-1 * y
  const ET = E; // Identity
  const DT = math.transpose(D);
  const B = math.add(E, math.multiply(lambda, math.multiply(DT, D)));

  const z = math.lusolve(B, y).flat();
  return z;
};

const NDVIChart = ({
  zoiFeatures,
  waterbody,
  years = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"],
  // years = ["2017"],
}) => {
  const matchedFeature = zoiFeatures.find(
    (feature) =>
      feature.get("waterbody_name")?.toLowerCase() ===
      waterbody?.waterbody?.toLowerCase()
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

  const y = ndviPoints.map((pt) => pt.y);
  const smoothed = whittakerSmooth(y, 2, 2); // λ = 100 for smoothness

  const smoothedCurve = ndviPoints.map((pt, idx) => ({
    x: pt.x,
    y: smoothed[idx],
  }));

  const data = {
    datasets: [
      {
        label: `NDVI ${years.join(" & ")}`,
        type: "scatter",
        data: ndviPoints,
        backgroundColor: "#4caf50",
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: `Whittaker Smoothed`,
        type: "line",
        data: smoothedCurve,
        borderColor: "blue",
        borderWidth: 2,
        pointRadius: 0,
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
          displayFormats: { month: "MMM yyyy" },
        },
        title: { display: true, text: "Date" },
      },
      y: {
        title: { display: true, text: "NDVI" },
        min: -0.1,
        max: 0.7,
      },
    },
  };

  return <Line data={data} options={options} />;
};

export default NDVIChart;

//moving average

// import React from "react";
// import { Line } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   LineElement,
//   PointElement,
//   LinearScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   TimeScale,
//   ScatterController,
// } from "chart.js";
// import "chartjs-adapter-date-fns";

// ChartJS.register(
//   LineElement,
//   PointElement,
//   LinearScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   TimeScale,
//   ScatterController
// );

// // Simple centered moving average
// const movingAverage = (data, windowSize = 3) => {
//   const result = [];

//   for (let i = 0; i < data.length; i++) {
//     let sum = 0;
//     let count = 0;

//     for (
//       let j = i - Math.floor(windowSize / 2);
//       j <= i + Math.floor(windowSize / 2);
//       j++
//     ) {
//       if (j >= 0 && j < data.length) {
//         sum += data[j].y;
//         count++;
//       }
//     }

//     result.push({
//       x: data[i].x,
//       y: count > 0 ? sum / count : data[i].y,
//     });
//   }

//   return result;
// };

// const NDVIChart = ({
//   zoiFeatures,
//   waterbody,
//   years = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"],
// }) => {
//   const matchedFeature = zoiFeatures.find(
//     (feature) =>
//       feature.get("waterbody_name")?.toLowerCase() ===
//       waterbody?.waterbody?.toLowerCase()
//   );

//   if (!matchedFeature) return null;

//   const ndviPoints = [];

//   years.forEach((year) => {
//     const raw = matchedFeature.get(`NDVI_${year}`);
//     if (raw) {
//       try {
//         const parsed = JSON.parse(raw);
//         Object.entries(parsed).forEach(([date, value]) => {
//           ndviPoints.push({ x: date, y: value });
//         });
//       } catch (err) {
//         console.error(`Error parsing NDVI_${year}:`, err);
//       }
//     }
//   });

//   if (!ndviPoints.length) return null;

//   ndviPoints.sort((a, b) => new Date(a.x) - new Date(b.x));

//   // Apply moving average smoothing (window size = 5)
//   const smoothedCurve = movingAverage(ndviPoints, 6);

//   const data = {
//     datasets: [
//       {
//         label: `NDVI ${years.join(" & ")}`,
//         type: "scatter",
//         data: ndviPoints,
//         backgroundColor: "#4caf50",
//         pointRadius: 4,
//         pointHoverRadius: 6,
//       },
//       {
//         label: `Moving Average (5-point)`,
//         type: "line",
//         data: smoothedCurve,
//         borderColor: "black",
//         borderWidth: 2,
//         pointRadius: 0,
//       },
//     ],
//   };

//   const options = {
//     responsive: true,
//     plugins: {
//       legend: { display: true },
//       tooltip: { mode: "index", intersect: false },
//     },
//     scales: {
//       x: {
//         type: "time",
//         time: {
//           unit: "month",
//           tooltipFormat: "yyyy-MM-dd",
//           displayFormats: { month: "MMM yyyy" },
//         },
//         title: { display: true, text: "Date" },
//       },
//       y: {
//         title: { display: true, text: "NDVI" },
//         min: -0.1,
//         max: 0.7,
//       },
//     },
//   };

//   return <Line data={data} options={options} />;
// };

// export default NDVIChart;

//3 or more harmonic reg

// import React from "react";
// import { Line } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   LineElement,
//   PointElement,
//   LinearScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   TimeScale,
//   ScatterController,
// } from "chart.js";
// import "chartjs-adapter-date-fns";
// import { create, all } from "mathjs";

// const math = create(all);

// ChartJS.register(
//   LineElement,
//   PointElement,
//   LinearScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   TimeScale,
//   ScatterController
// );

// // Convert date string to days since start
// const dateToDaysSinceStart = (dateStr, startDate) => {
//   const date = new Date(dateStr);
//   return (date - startDate) / 86400000;
// };

// // Fit N-term harmonic function
// const fitHarmonic = (points, harmonics = 3) => {
//   const X = [];
//   const Y = [];
//   const T = 365.25;
//   const startDate = new Date(points[0].x);

//   points.forEach(({ x, y }) => {
//     const d = dateToDaysSinceStart(x, startDate);
//     const row = [1]; // a0
//     for (let k = 1; k <= harmonics; k++) {
//       row.push(Math.cos((2 * Math.PI * k * d) / T));
//       row.push(Math.sin((2 * Math.PI * k * d) / T));
//     }
//     X.push(row);
//     Y.push(y);
//   });

//   const XT = math.transpose(X);
//   const XT_X = math.multiply(XT, X);
//   const XT_Y = math.multiply(XT, Y);
//   const coefficients = math.lusolve(XT_X, XT_Y).flat();
//   return { coefficients, startDate };
// };

// // Generate harmonic curve from coefficients
// const generateHarmonicCurve = (coeffs, startDate, totalDays, harmonics = 2) => {
//   const T = 365.25;
//   const steps = Math.floor(totalDays / 5);
//   const result = [];

//   for (let i = 0; i <= steps; i++) {
//     const d = (i * totalDays) / steps;
//     let y = coeffs[0]; // a0
//     for (let k = 1; k <= harmonics; k++) {
//       const cosTerm = coeffs[2 * k - 1] * Math.cos((2 * Math.PI * k * d) / T);
//       const sinTerm = coeffs[2 * k] * Math.sin((2 * Math.PI * k * d) / T);
//       y += cosTerm + sinTerm;
//     }
//     const date = new Date(startDate.getTime() + d * 86400000);
//     result.push({ x: date.toISOString(), y });
//   }

//   return result;
// };

// const NDVIChart = ({
//   zoiFeatures,
//   waterbody,
//   years = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"],
//   harmonics = 2, // 👈 You can set this prop to control harmonic count
// }) => {
//   const matchedFeature = zoiFeatures.find(
//     (feature) =>
//       feature.get("waterbody_name")?.toLowerCase() ===
//       waterbody?.waterbody?.toLowerCase()
//   );

//   if (!matchedFeature) return null;

//   const ndviPoints = [];

//   years.forEach((year) => {
//     const raw = matchedFeature.get(`NDVI_${year}`);
//     if (raw) {
//       try {
//         const parsed = JSON.parse(raw);
//         Object.entries(parsed).forEach(([date, value]) => {
//           ndviPoints.push({ x: date, y: value });
//         });
//       } catch (err) {
//         console.error(`Error parsing NDVI_${year}:`, err);
//       }
//     }
//   });

//   if (!ndviPoints.length) return null;

//   ndviPoints.sort((a, b) => new Date(a.x) - new Date(b.x));
//   const { coefficients, startDate } = fitHarmonic(ndviPoints, harmonics);

//   const totalSpanDays =
//     (new Date(ndviPoints.at(-1).x) - new Date(ndviPoints[0].x)) / 86400000;

//   const harmonicCurve = generateHarmonicCurve(
//     coefficients,
//     startDate,
//     totalSpanDays,
//     harmonics
//   );

//   const data = {
//     datasets: [
//       {
//         label: `NDVI (${years.join(", ")})`,
//         type: "scatter",
//         data: ndviPoints,
//         backgroundColor: "#4caf50",
//         pointRadius: 4,
//         pointHoverRadius: 6,
//       },
//       {
//         label: `Harmonic Fit (${harmonics} terms)`,
//         type: "line",
//         data: harmonicCurve,
//         borderColor: "blue",
//         borderWidth: 2,
//         pointRadius: 0,
//       },
//     ],
//   };

//   const options = {
//     responsive: true,
//     plugins: {
//       legend: { display: true },
//       tooltip: { mode: "index", intersect: false },
//     },
//     scales: {
//       x: {
//         type: "time",
//         time: {
//           unit: "month",
//           tooltipFormat: "yyyy-MM-dd",
//           displayFormats: { month: "MMM yyyy" },
//         },
//         title: { display: true, text: "Date" },
//       },
//       y: {
//         title: { display: true, text: "NDVI" },
//         min: -0.1,
//         max: 0.7,
//       },
//     },
//   };

//   return <Line data={data} options={options} />;
// };

// export default NDVIChart;
