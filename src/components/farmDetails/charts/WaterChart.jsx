import { Line } from 'react-chartjs-2';
import './chartSetup';
import { colorPrimary, colorDataWarm, colorBorderSoft, colorMuted } from '../farmDetailsTokens';

const ODD_YEAR_BAND = '#FBFAFE';

const yearBandsPlugin = {
  id: 'yearBands',
  beforeDatasetsDraw(chart, _args, opts) {
    const { ctx, chartArea, scales } = chart;
    const { x } = scales;
    const years = opts.years || [];
    if (!x || !chartArea) return;
    ctx.save();
    years.forEach((_y, k) => {
      if (k % 2 === 0) return;
      const startIdx = k * 12;
      const left = x.getPixelForValue(startIdx - 0.5);
      const right = x.getPixelForValue(startIdx + 11.5);
      ctx.fillStyle = ODD_YEAR_BAND;
      ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top);
    });
    ctx.restore();
  },
};

const yearBoundaryPlugin = {
  id: 'yearBoundaries',
  afterDatasetsDraw(chart, _args, opts) {
    const { ctx, chartArea, scales } = chart;
    const { x } = scales;
    const years = opts.years || [];
    if (!x || !chartArea) return;
    ctx.save();
    years.forEach((y, k) => {
      const startIdx = k * 12;
      const endIdx = startIdx + 11;
      const left = x.getPixelForValue(startIdx);
      const right = x.getPixelForValue(endIdx);
      if (k > 0) {
        const edge = x.getPixelForValue(startIdx - 0.5);
        ctx.strokeStyle = colorBorderSoft;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(edge, chartArea.top);
        ctx.lineTo(edge, chartArea.bottom);
        ctx.stroke();
      }
      ctx.fillStyle = colorMuted;
      ctx.font = '600 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(y.label, (left + right) / 2, chartArea.bottom + 22);
    });
    ctx.restore();
  },
};

export function WaterChartLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
      <div className="flex items-center gap-1.5"><span className="w-3 h-0.5" style={{ background: colorPrimary }} /><span className="text-[10px]" style={{ color: colorMuted }}>AET</span></div>
      <div className="flex items-center gap-1.5"><span className="w-3 h-0.5" style={{ background: colorDataWarm }} /><span className="text-[10px]" style={{ color: colorMuted }}>PET</span></div>
      <div className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm" style={{ background: 'rgba(204,107,0,0.13)' }} /><span className="text-[10px]" style={{ color: colorMuted }}>Shortfall</span></div>
    </div>
  );
}

export default function WaterChart({ series }) {
  const labels = [];
  const aet = [];
  const pet = [];
  series.forEach(({ points }) => {
    points.forEach((p) => {
      labels.push(p.label);
      aet.push(p.aet);
      pet.push(p.pet);
    });
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'AET',
        data: aet,
        borderColor: colorPrimary,
        backgroundColor: colorPrimary,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0,
      },
      {
        label: 'PET',
        data: pet,
        borderColor: colorDataWarm,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0,
        fill: '-1',
        backgroundColor: 'rgba(204,107,0,0.13)',
      },
    ],
  };

  const yearOpt = { years: series.map((s) => ({ label: s.yearLabel })) };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    layout: { padding: { bottom: 28 } },
    plugins: {
      legend: { display: false },
      yearBands: yearOpt,
      yearBoundaries: yearOpt,
      tooltip: {
        callbacks: {
          title: (items) => {
            const i = items[0].dataIndex;
            const s = series[Math.floor(i / 12)];
            return `${items[0].label} · ${s ? s.yearLabel : ''}`;
          },
          afterBody: (items) => {
            const a = items.find((it) => it.datasetIndex === 0)?.parsed.y;
            const p = items.find((it) => it.datasetIndex === 1)?.parsed.y;
            if (a == null || p == null) return 'No valid reading this month';
            return `Gap: ${(p - a).toFixed(1)} mm`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { display: false },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: 'mm', color: colorMuted, font: { size: 10 } },
        ticks: { color: colorMuted, font: { size: 10 } },
        grid: { color: colorBorderSoft },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="relative h-[240px]">
      <Line data={data} options={options} plugins={[yearBandsPlugin, yearBoundaryPlugin]} />
    </div>
  );
}
