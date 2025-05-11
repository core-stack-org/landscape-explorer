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

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

const SurfaceWaterChart = ({waterbody, water_rej }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    if (!water_rej || !water_rej.features) return;


    const yearKeys = [
      "area_17-18",
      "area_18-19",
      "area_19-20",
      "area_20-21",
      "area_21-22",
      "area_22-23",
      "area_23-24",
      "area_24-25",
    ];

    const yearLabels = [
      "2017-18",
      "2018-19",
      "2019-20",
      "2020-21",
      "2021-22",
      "2022-23",
      "2023-24",
      "2024-25",
    ];

    const totals = new Array(yearKeys.length).fill(0);

    water_rej.features.forEach((feature) => {
      if(feature.properties.waterbody_name === waterbody.waterbody){
        const featureProps = feature.properties;
        
        yearKeys.map((key, idx) =>{
          const area = parseFloat(feature?.properties?.[key]) || 0;
          totals[idx] = area
        })
      }
    })

    setChartData({
      labels: yearLabels,
      datasets: [
        {
          label: "Area of Surface Waterbody (Hectare)",
          data: totals,
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    });
  }, [water_rej]);

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Area of Surface Waterbody (in Heactare)",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Area (Heactare)" },
      },
      x: {
        title: { display: true, text: "Year" },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default SurfaceWaterChart;
