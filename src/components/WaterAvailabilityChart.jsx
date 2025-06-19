import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  annotationPlugin
);

const years = ["17-18", "18-19", "19-20", "20-21", "21-22", "22-23", "23-24"];

const WaterAvailabilityChart = ({ waterbody, water_rej_data }) => {
  // Prepare empty arrays that will hold season‑wise values for each year
  const kharifData = new Array(years.length).fill(0);
  const rabiData = new Array(years.length).fill(0);
  const zaidData = new Array(years.length).fill(0);

  // Populate the arrays from feature properties
  water_rej_data.features.forEach((feature) => {
    if (feature.properties.waterbody_name === waterbody.waterbody) {
      const p = feature.properties;

      years.forEach((year, i) => {
        kharifData[i] += p[`k_${year}`] ?? 0; // Kharif
        rabiData[i] += p[`kr_${year}`] ?? 0; // Rabi
        zaidData[i] += p[`krz_${year}`] ?? 0; // Zaid
      });
    }
  });

  // Chart.js dataset structure
  const data = {
    labels: years,
    datasets: [
      {
        label: "Kharif",
        data: kharifData,
        backgroundColor: "#74CCF4",
      },
      {
        label: "Rabi",
        data: rabiData,
        backgroundColor: "#1ca3ec",
      },
      {
        label: "Zaid",
        data: zaidData,
        backgroundColor: "#0f5e9c",
      },
    ],
  };

  // Options: turn *off* stacking so bars are grouped
  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "Water Availability Over Time",
      },
      annotation: {
        annotations: {
          interventionLine: {
            type: "line",
            scaleID: "x",
            value: "22-23", // Will appear *before* this label
            borderColor: "black",
            borderWidth: 2,
            label: {
              content: "Intervention Year",
              enabled: true,
              position: "start",
              color: "black",
              font: {
                weight: "bold",
              },
            },
          },
        },
      },
    },
    scales: {
      x: {
        stacked: false,
        title: { display: true, text: "Year" },
      },
      y: {
        stacked: false,
        title: { display: true, text: "Area (in Percent)" },
        min: 0,
        max: 100,
        ticks: {
          callback: (value) => `${value}`, // Optional: show '%' symbol
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
    //     <Bar options={options} data={data} />
    //   </div>
    //   <div style={{ marginLeft: "16px", fontSize: "14px", color: "#333" }}>
    //     The{" "}
    //     <span style={{ color: "black", fontWeight: "bold" }}>black line</span>{" "}
    //     represents the year of intervention.
    //   </div>
    // </div>
  );
};

export default WaterAvailabilityChart;
