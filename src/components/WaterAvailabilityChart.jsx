import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const years = [
  "17-18",
  "18-19",
  "19-20",
  "20-21",
  "21-22",
  "22-23",
  "23-24",
  "24-25",
];

export default function WaterAvailabilityGraph({ water_rej }) {
  // Initialize arrays for data
  const kharifData = new Array(years.length).fill(0);
  const rabiData = new Array(years.length).fill(0);
  const zaidData = new Array(years.length).fill(0);

  // Iterate over each feature in water_rej
  water_rej.features.forEach((feature) => {
    const featureProps = feature.properties;

    console.log("Feature Properties: ", featureProps); // Log entire properties to check

    years.forEach((year, index) => {
      // Check if `k`, `kr`, `krz` values exist for this feature and year
      const k_value = featureProps[`k_${year}`] ?? 0;
      const kr_value = featureProps[`kr_${year}`] ?? 0;
      const krz_value = featureProps[`krz_${year}`] ?? 0;

      // Log the specific values for `k`, `kr`, and `krz` for debugging
      console.log(
        `Year: ${year} | k: ${k_value} | kr: ${kr_value} | krz: ${krz_value}`
      );

      // Calculate the values based on `k`, `kr`, `krz`
      kharifData[index] += k_value - kr_value; // Kharif = k - kr
      rabiData[index] += kr_value - krz_value; // Rabi = kr - krz
      zaidData[index] += krz_value; // Zaid = krz

      // Log data for each year after calculation
      console.log(`After processing ${year}:`);
      console.log("Kharif Data: ", kharifData);
      console.log("Rabi Data: ", rabiData);
      console.log("Zaid Data: ", zaidData);
    });
  });

  // Log final datasets to verify if the data is correctly populated
  console.log("Kharif Data: ", kharifData);
  console.log("Rabi Data: ", rabiData);
  console.log("Zaid Data: ", zaidData);

  const data = {
    labels: years,
    datasets: [
      {
        label: "Kharif",
        data: kharifData,
        backgroundColor: "#ffbe0b",
      },
      {
        label: "Rabi",
        data: rabiData,
        backgroundColor: "#fb5607",
      },
      {
        label: "Zaid",
        data: zaidData,
        backgroundColor: "#ff006e",
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Water Availability Over Time (Area in Hectares)",
      },
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: "Year",
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: "Area (Hectares)",
        },
      },
    },
  };

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <Bar options={options} data={data} />
    </div>
  );
}
