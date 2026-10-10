import { Bar } from 'react-chartjs-2';
import './chartSetup';
import { colorKharif, colorPrimary, colorDataWarm, colorBorderSoft, colorMuted, colorInk } from '../farmDetailsTokens';
import { average } from '../farmDetailsUtils';

const SEASON_COLORS = { Kharif: colorKharif, Rabi: colorPrimary, Zaid: colorDataWarm };
// Stacking order bottom-to-top matches this order.
const SEASON_ORDER = ['Kharif', 'Rabi', 'Zaid'];

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

// Labels the total (the full stack height) above each bar, reading it off
// the topmost dataset's bar coordinates since chart.js already positions
// those at the top of the stack.
const stackedTotalLabelPlugin = {
  id: 'stackedTotalLabels',
  afterDatasetsDraw(chart) {
    const { ctx, data } = chart;
    const topMeta = chart.getDatasetMeta(data.datasets.length - 1);
    ctx.save();
    ctx.font = '600 10px sans-serif';
    ctx.fillStyle = colorInk;
    ctx.textAlign = 'center';
    topMeta.data.forEach((bar, i) => {
      const total = data.datasets.reduce((sum, ds) => (ds.data[i] == null ? sum : sum + ds.data[i]), null);
      if (total === null) return;
      ctx.fillText(String(total), bar.x, bar.y - 4);
    });
    ctx.restore();
  },
};

export default function DryMonthsChart({ counts }) {
  const labels = counts.map((c) => (c.count === null ? [c.yearLabel, 'no data'] : c.yearLabel));
  const totals = counts.map((c) => c.count);
  const avg = average(totals);
  const showAverage = avg !== null && counts.filter((c) => c.count !== null).length > 1;

  const data = {
    labels,
    datasets: SEASON_ORDER.map((season) => ({
      label: season,
      data: counts.map((c) => (c.count === null ? null : c.bySeason[season])),
      backgroundColor: SEASON_COLORS[season],
      maxBarThickness: 36,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 12 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => counts[items[0].dataIndex].yearLabel,
          label: (item) => {
            const c = counts[item.dataIndex];
            const months = c?.dryMonthsBySeason?.[item.dataset.label] ?? [];
            return months.length
              ? `${item.dataset.label}: ${item.raw} (${months.join(', ')})`
              : `${item.dataset.label}: ${item.raw}`;
          },
          afterBody: (items) => {
            const c = counts[items[0].dataIndex];
            if (c.count === null) return 'No valid monthly data';
            return `Total: ${c.count} of ${c.validMonths} valid months`;
          },
        },
      },
      annotation: showAverage
        ? {
            annotations: {
              avg: {
                type: 'line',
                yMin: avg,
                yMax: avg,
                borderColor: colorMuted,
                borderWidth: 1,
                borderDash: [4, 4],
                label: {
                  display: true,
                  content: `average ${avg.toFixed(1)}`,
                  position: 'start',
                  backgroundColor: 'transparent',
                  color: colorMuted,
                  font: { size: 10, weight: '600' },
                  yAdjust: -10,
                  xAdjust: 28,
                },
              },
            },
          }
        : {},
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
