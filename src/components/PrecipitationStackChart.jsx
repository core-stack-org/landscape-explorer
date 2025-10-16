import React from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register necessary Chart.js components
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const extractChartData = (properties) => {
  const seasons = ["kharif", "rabi", "zaid"];
  const yearMap = new Map(); // key: full year string, value: short version

  // Extract all years and format them
  Object.keys(properties).forEach((key) => {
    const match = key.match(
      /^precipitation_(kharif|rabi|zaid)_(\d{4})-(\d{4})$/
    );
    if (match) {
      const fullYear = `${match[2]}-${match[3]}`;
      const shortYear = `${match[2].slice(2)}-${match[3].slice(2)}`;
      yearMap.set(fullYear, shortYear);
    }
  });

  const sortedFullYears = Array.from(yearMap.keys()).sort();
  const seasonData = {
    kharif: [],
    rabi: [],
    zaid: [],
  };

  sortedFullYears.forEach((fullYear) => {
    seasons.forEach((season) => {
      const value = properties[`precipitation_${season}_${fullYear}`];
      seasonData[season].push(value ?? 0);
    });
  });

  const shortYears = sortedFullYears.map((full) => yearMap.get(full));

  return { years: shortYears, seasonData };
};

const PrecipitationStackChart = ({ feature }) => {
  if (!feature?.properties) return null;

  const { years, seasonData } = extractChartData(feature.properties);

  const data = {
    labels: years,
    datasets: [
      {
        label: "Kharif",
        data: seasonData.kharif,
        backgroundColor: "#1E90FF",
        stack: "precip",
      },
      {
        label: "Kharif Rabi",
        data: seasonData.rabi,
        backgroundColor: "#87CEFA",
        stack: "precip",
      },
      {
        label: "Kharif Rabi Zaid",
        data: seasonData.zaid,
        backgroundColor: "#B0E0E6",
        stack: "precip",
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      tooltip: {
        mode: "index",
        intersect: false,
      },
      legend: {
        position: "top",
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: "Precipitation (mm)",
        },
      },
    },
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Bar options={options} data={data} />
    </div>
    // <div
    //   style={{
    //     display: "flex",
    //     alignItems: "center",
    //   }}
    // >
    //   <div style={{ flex: 1 }}>
    //     <Bar data={data} options={options} />;
    //   </div>
    // </div>
  );
};

export default PrecipitationStackChart;
