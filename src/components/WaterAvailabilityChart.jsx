import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import WaterProjectDashboard from "./water_project_dashboard";

// Register the required chart components
ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

const SurfaceWaterBodiesChart = ({ water_rej }) => {
  const years = [
    { key: "17-18", label: "2017-18" },
    { key: "18-19", label: "2018-19" },
    { key: "19-20", label: "2019-20" },
    { key: "20-21", label: "2020-21" },
    { key: "21-22", label: "2021-22" },
    { key: "22-23", label: "2022-23" },
    { key: "23-24", label: "2023-24" },
  ];

  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  console.log(water_rej);

  useEffect(() => {
    if (!water_rej?.features) return;

    const kharifZaidData = [];
    const kharifRabiData = [];
    const kharifData = [];

    years.forEach(({ key }) => {
      let kharifZaidSum = 0;
      let kharifRabiSum = 0;
      let kharifSum = 0;

      water_rej.features.forEach((feature) => {
        const props = feature?.properties || {};
        kharifZaidSum += parseFloat(props[`krz_${key}`]) || 0; // KRZ (Kharif Rabi Zaid)
        kharifRabiSum += parseFloat(props[`kr_${key}`]) || 0; // KR (Kharif-Rabi)
        kharifSum += parseFloat(props[`k_${key}`]) || 0; // K (Kharif)
      });

      kharifZaidData.push(kharifZaidSum);
      kharifRabiData.push(kharifRabiSum - kharifZaidSum); // KR - KRZ (Kharif-Rabi minus Kharif Rabi Zaid)
      kharifData.push(kharifSum - kharifRabiSum); // K - KR (Kharif minus Kharif-Rabi)
    });

    setChartData({
      labels: years.map((y) => y.label),
      datasets: [
        {
          label: "Kharif Rabi Zaid",
          data: kharifZaidData,
          backgroundColor: "#0f5e9c",
          stack: "stack1",
        },
        {
          label: "Kharif-Rabi",
          data: kharifRabiData,
          backgroundColor: "#1ca3ec",
          stack: "stack1",
        },
        {
          label: "Kharif",
          data: kharifData,
          backgroundColor: "#74CCF4",
          stack: "stack1",
        },
      ],
    });
  }, [water_rej]);

  const chartOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Surface Waterbody Area Over Years (Stacked)",
      },
      legend: {
        position: "top",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Area (sq.m)" },
      },
      x: {
        title: { display: true, text: "Year" },
      },
    },
  };

  return (
    <div className="px-6 py-4 w-full max-w-5xl mx-auto">
      <div className="text-xl font-semibold text-center mb-4">
        Surface Waterbody Analysis (Stacked)
      </div>
      <div style={{ width: "100%", height: "400px" }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default SurfaceWaterBodiesChart;
