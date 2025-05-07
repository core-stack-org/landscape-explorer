import React from "react";
import WaterChart from "../components/waterChart";

const WaterAvailabilityChart = ({ waterRej }) => {
  const labels = waterRej.map((item) => item.district);

  const data = {
    labels,
    datasets: [
      {
        label: "Zaid",
        data: waterRej.map((item) => item.avg_water_availability_zaid),
        backgroundColor: "#4caf50",
      },
      {
        label: "Kharif",
        data: waterRej.map((item) => item.avg_water_availability_kharif),
        backgroundColor: "#2196f3",
      },
      {
        label: "Rabi",
        data: waterRej.map((item) => item.avg_water_availability_rabi),
        backgroundColor: "#ff9800",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "Average Water Availability by Season (%)",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "%" },
      },
    },
  };

  return <WaterChart data={data} options={options} />;
};

export default WaterAvailabilityChart;
