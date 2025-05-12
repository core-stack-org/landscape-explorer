import React, { useEffect } from "react";
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

export default function WaterAvailabilityGraph({ waterbody, water_rej }) {
  // Initialize arrays for data
  const kharifData = new Array(years.length).fill(0);
  const rabiData = new Array(years.length).fill(0);
  const zaidData = new Array(years.length).fill(0);


  // Iterate over each feature in water_rej
  water_rej.features.forEach((feature) => {
    if(feature.properties.waterbody_name === waterbody.waterbody){
      const featureProps = feature.properties;
      
      years.forEach((year, index) => {
        // Check if `k`, `kr`, `krz` values exist for this feature and year
        const k_value = featureProps[`k_${year}`] ?? 0;
        const kr_value = featureProps[`kr_${year}`] ?? 0;
        const krz_value = featureProps[`krz_${year}`] ?? 0;

        // Calculate the values based on `k`, `kr`, `krz`
        kharifData[index] += k_value - kr_value; // Kharif = k - kr
        rabiData[index] += kr_value - krz_value; // Rabi = kr - krz
        zaidData[index] += krz_value; // Zaid = krz
        
        kharifData[index] = ((featureProps[`area_${year}`] ?? 0) / 100) * kharifData[index];
        rabiData[index] = ((featureProps[`area_${year}`] ?? 0) / 100) * rabiData[index];
        zaidData[index] = ((featureProps[`area_${year}`] ?? 0) / 100) * zaidData[index];
      });
    }
  });


  const data = {
    labels: years,
    datasets: [
      {
        label: "Zaid",
        data: zaidData,
        backgroundColor: "#0f5e9c",
      },
      {
        label: "Rabi",
        data: rabiData,
        backgroundColor: "#1ca3ec",
      },
      {
        label: "Kharif",
        data: kharifData,
        backgroundColor: "#74CCF4",
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
        text: "Water Used Over Time (Sq.m)",
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
          text: "Area (Sq.m)",
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
