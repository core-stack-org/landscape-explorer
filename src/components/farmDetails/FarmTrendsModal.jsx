import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './icons';
import WaterChart from './charts/WaterChart';
import DryMonthsChart from './charts/DryMonthsChart';
import { monthlyPointsByYear, countDryMonths, average, waterBalanceSummary, agriYearLabel, hasText } from './farmDetailsUtils';
import { colorBorder, colorSurface, colorPageBg, colorInk, colorMuted, colorFaint, colorBorderSoft } from './farmDetailsTokens';

function dryTakeaway(counts) {
  const valid = counts.filter((c) => c.count !== null);
  if (valid.length === 0) return 'No year has valid monthly data, so no dry-month count can be shown.';
  if (valid.length === 1) return `Only one year of data (${valid[0].yearLabel}), so there is no average to compare against.`;
  const worst = valid.reduce((a, b) => (b.count > a.count ? b : a));
  const avg = average(valid.map((c) => c.count));
  const diff = Math.round((worst.count - avg) * 10) / 10;
  return `Worst year: ${worst.yearLabel}, with ${worst.count} dry months, ${diff} above the average of ${avg.toFixed(1)}.`;
}

function waterTakeaway(annual) {
  const latest = annual[annual.length - 1];
  const s = waterBalanceSummary(latest);
  if (s.percentUsed === null) return 'Water use is unavailable for the latest year.';
  return `In ${agriYearLabel(latest.year)} the crop used ${s.percentUsed}% of the water it needed, a ${s.shortfall} mm shortfall.`;
}

function ChartCard({ title, children, takeaway }) {
  return (
    <section className="rounded-2xl p-4" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <h3 className="text-[13px] font-bold mb-3" style={{ color: colorInk }}>{title}</h3>
      {children}
      <p className="text-[11px] mt-3 pt-2.5 leading-snug" style={{ color: colorMuted, borderTop: `1px solid ${colorBorderSoft}` }}>
        {takeaway}
      </p>
    </section>
  );
}

export default function FarmTrendsModal({ open, onClose, annual, monthly, farmId }) {
  const dialogRef = useRef(null);
  const latestCrop = useMemo(() => {
    const latest = annual?.[annual.length - 1];
    return hasText(latest?.crop1) ? latest.crop1.trim() : 'no crop';
  }, [annual]);

  const series = useMemo(() => monthlyPointsByYear(monthly), [monthly]);
  const counts = useMemo(() => countDryMonths(monthly), [monthly]);

  useEffect(() => {
    if (!open) return undefined;
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(35,35,35,0.5)' }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="farm-trends-title"
        tabIndex={-1}
        className="w-full max-w-[716px] max-h-[90vh] flex flex-col rounded-[18px] overflow-hidden outline-none"
        style={{ background: colorPageBg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ background: colorSurface, borderBottom: `1px solid ${colorBorder}` }}>
          <div className="min-w-0">
            <h2 id="farm-trends-title" className="text-[16px] font-bold" style={{ color: colorInk }}>Year-by-year trends</h2>
            <p className="text-[11px] mt-0.5" style={{ color: colorMuted }}>
              {latestCrop} · Farm {farmId || '--'} · years run July to June
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close trends"
            className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0"
            style={{ color: colorMuted }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          <ChartCard title="Water needed vs water used" takeaway={waterTakeaway(annual || [])}>
            {series.length > 0 ? (
              <WaterChart series={series} />
            ) : (
              <p className="text-[12px] py-10 text-center" style={{ color: colorFaint }}>No monthly water data for this farm.</p>
            )}
          </ChartCard>

          <ChartCard title="Dry months each year" takeaway={dryTakeaway(counts)}>
            {counts.length > 0 ? (
              <DryMonthsChart counts={counts} />
            ) : (
              <p className="text-[12px] py-10 text-center" style={{ color: colorFaint }}>No monthly data for this farm.</p>
            )}
          </ChartCard>
        </div>
      </div>
    </div>,
    document.body,
  );
}
