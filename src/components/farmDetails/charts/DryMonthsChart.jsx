import { Bar } from 'react-chartjs-2';
import './chartSetup';
import { colorKharif, colorPrimary, colorDataWarm, colorBorderSoft, colorMuted, colorInk } from '../farmDetailsTokens';

const SEASON_COLORS = { Kharif: colorKharif, Rabi: colorPrimary, Zaid: colorDataWarm };
// Stacking order bottom-to-top matches this order.
const SEASON_ORDER = ['Kharif', 'Rabi', 'Zaid'];
// Left-to-right bar order within each year's group.
const BANDS = [
  { key: 'moderate', label: 'Moderate' },
  { key: 'severe', label: 'Severe' },
];

export function DryMonthsChartLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
      {SEASON_ORDER.map((season) => (
        <div key={season} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SEASON_COLORS[season] }} />
          <span className="text-[10px]" style={{ color: colorMuted }}>{season}</span>
        </div>
      ))}
    </div>
  );
}

// Labels the total (the full stack height) above each bar in every stack
// group, reading it off that group's topmost dataset's bar coordinates since
// chart.js already positions those at the top of the stack.
const stackedTotalLabelPlugin = {
  id: 'stackedTotalLabels',
  afterDatasetsDraw(chart) {
    const { ctx, data } = chart;
    const stacks = [...new Set(data.datasets.map((ds) => ds.stack))];
    ctx.save();
    ctx.font = '600 10px sans-serif';
    ctx.fillStyle = colorInk;
    ctx.textAlign = 'center';
    stacks.forEach((stack) => {
      const indexed = data.datasets
        .map((ds, i) => ({ ds, i }))
        .filter(({ ds }) => ds.stack === stack);
      if (indexed.length === 0) return;
      const topMeta = chart.getDatasetMeta(indexed[indexed.length - 1].i);
      topMeta.data.forEach((bar, i) => {
        const total = indexed.reduce((sum, { ds }) => (ds.data[i] == null ? sum : sum + ds.data[i]), null);
        if (total === null) return;
        ctx.fillText(String(total), bar.x, bar.y - 4);
      });
    });
    ctx.restore();
  },
};

export default function DryMonthsChart({ counts }) {
  const labels = counts.map((c) => (c.validMonths === 0 ? [c.yearLabel, 'no data'] : c.yearLabel));

  const data = {
    labels,
    datasets: BANDS.flatMap(({ key }) => SEASON_ORDER.map((season) => ({
      label: season,
      stack: key,
      data: counts.map((c) => (c[key] === null ? null : c[key].bySeason[season])),
      backgroundColor: SEASON_COLORS[season],
      maxBarThickness: 18,
    }))),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 12 } },
    interaction: { mode: 'point', intersect: true },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            const c = counts[items[0].dataIndex];
            const band = BANDS.find((b) => b.key === items[0].dataset.stack);
            return `${c.yearLabel} — ${band?.label ?? ''}`;
          },
          label: (item) => {
            const c = counts[item.dataIndex];
            const band = c?.[item.dataset.stack];
            const months = band?.monthsBySeason?.[item.dataset.label] ?? [];
            return months.length
              ? `${item.dataset.label}: ${item.raw} (${months.join(', ')})`
              : `${item.dataset.label}: ${item.raw}`;
          },
          afterBody: (items) => {
            const c = counts[items[0].dataIndex];
            if (c.validMonths === 0) return 'No valid monthly data';
            const band = c[items[0].dataset.stack];
            return `Total: ${band.count} of ${c.validMonths} valid months`;
          },
        },
      },
    },
    scales: {
      x: { stacked: true, ticks: { color: colorMuted, font: { size: 10 }, autoSkip: false }, grid: { display: false } },
      y: {
        stacked: true,
        min: 0,
        max: 12,
        ticks: { stepSize: 3, color: colorMuted, font: { size: 10 } },
        title: { display: true, text: 'months', color: colorMuted, font: { size: 10 } },
        grid: { color: colorBorderSoft },
      },
    },
  };

  return (
    <div className="relative h-[200px]">
      <Bar data={data} options={options} plugins={[stackedTotalLabelPlugin]} />
    </div>
  );
}
