import { Bar } from 'react-chartjs-2';
import './chartSetup';
import { colorPrimary, colorBorderSoft, colorMuted, colorFaint, colorInk } from '../farmDetailsTokens';
import { average } from '../farmDetailsUtils';

const valueLabelPlugin = {
  id: 'dryValueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.font = '600 10px sans-serif';
    ctx.fillStyle = colorInk;
    ctx.textAlign = 'center';
    meta.data.forEach((bar, i) => {
      const v = chart.data.datasets[0].data[i];
      if (v === null || v === undefined) return;
      ctx.fillText(String(v), bar.x, bar.y - 4);
    });
    ctx.restore();
  },
};

export default function DryMonthsChart({ counts }) {
  const labels = counts.map((c) => (c.count === null ? [c.yearLabel, 'no data'] : c.yearLabel));
  const values = counts.map((c) => c.count);
  const avg = average(values);
  const showAverage = avg !== null && counts.filter((c) => c.count !== null).length > 1;

  const data = {
    labels,
    datasets: [{
      label: 'Dry months',
      data: values,
      backgroundColor: colorPrimary,
      borderRadius: 4,
      borderSkipped: 'bottom',
      maxBarThickness: 36,
    }],
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
            if (c.count === null) return 'No valid monthly data';
            return `${c.count} dry of ${c.validMonths} valid months`;
          },
          afterLabel: (item) => {
            const c = counts[item.dataIndex];
            return c.dryMonths.length ? `Dry: ${c.dryMonths.join(', ')}` : '';
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
                  content: `avg ${avg.toFixed(1)}`,
                  position: 'end',
                  backgroundColor: 'transparent',
                  color: colorMuted,
                  font: { size: 10 },
                  yAdjust: -8,
                },
              },
            },
          }
        : {},
    },
    scales: {
      x: { ticks: { color: colorMuted, font: { size: 10 }, autoSkip: false }, grid: { display: false } },
      y: {
        min: 0,
        max: 12,
        ticks: { stepSize: 3, color: colorFaint, font: { size: 10 } },
        title: { display: true, text: 'months', color: colorMuted, font: { size: 10 } },
        grid: { color: colorBorderSoft },
      },
    },
  };

  return (
    <div className="relative h-[200px]">
      <Bar data={data} options={options} plugins={[valueLabelPlugin]} />
    </div>
  );
}
