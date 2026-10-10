import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './icons';
import WaterChart, { WaterChartLegend } from './charts/WaterChart';
import DryMonthsChart, { DryMonthsChartLegend } from './charts/DryMonthsChart';
import { monthlyPointsByYear, countDryMonths, average, waterBalanceSummary, agriYearLabel, hasText } from './farmDetailsUtils';
import { colorBorder, colorSurface, colorPageBg, colorInk, colorMuted, colorPrimary } from './farmDetailsTokens';

// Which season has the single highest count each year (ties excluded, since
// no one season "led" that year). Only reported when one season clearly
// leads in a majority of valid years — otherwise there's nothing to claim.
function dominantSeason(valid) {
  const wins = { Kharif: 0, Rabi: 0, Zaid: 0 };
  valid.forEach((c) => {
    const entries = Object.entries(c.bySeason);
    const max = Math.max(...entries.map(([, v]) => v));
    const leaders = entries.filter(([, v]) => v === max && max > 0);
    if (leaders.length === 1) wins[leaders[0][0]] += 1;
  });
  const [season, winCount] = Object.entries(wins).reduce((a, b) => (b[1] > a[1] ? b : a));
  return winCount > 0 ? { season, winCount } : null;
}

function dryTakeaway(counts) {
  const valid = counts.filter((c) => c.count !== null);
  if (valid.length === 0) return 'No year has valid monthly data, so no dry-month count can be shown.';
  if (valid.length === 1) return `Only one year of data (${valid[0].yearLabel}), so there is no average to compare against.`;

  const worst = valid.reduce((a, b) => (b.count > a.count ? b : a));
  const avg = average(valid.map((c) => c.count));
  const dominant = dominantSeason(valid);

  return (
    <>
      {dominant && (
        <>
          <strong style={{ color: colorInk }}>{dominant.season}</strong>
          {dominant.winCount === valid.length
            ? ' carries the most stress in every year on record. '
            : ` carries the most stress most often, leading in ${dominant.winCount} of the ${valid.length} years. `}
        </>
      )}
      <strong style={{ color: colorInk }}>{worst.yearLabel}</strong> was the hardest year overall at {worst.count} months, against an average of {avg.toFixed(1)}.
    </>
  );
}

function waterTakeaway(annual) {
  const latest = annual[annual.length - 1];
  const s = waterBalanceSummary(latest);
  if (s.percentUsed === null) return 'Water use is unavailable for the latest year.';
  return (
    <>
      In {agriYearLabel(latest.year)} the crop used <strong style={{ color: colorPrimary }}>{s.percentUsed}%</strong> of the water it needed, a {s.shortfall} mm shortfall.
    </>
  );
}

function ChartCard({ title, subtitle, legend, children, takeaway }) {
  return (
    <section className="rounded-2xl p-4" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="text-[15px] font-bold" style={{ color: colorInk }}>{title}</h3>
        {legend}
      </div>
      {subtitle && <p className="text-[12px] mb-3" style={{ color: colorMuted }}>{subtitle}</p>}
      {children}
      <p className="text-[12px] mt-3 p-3 rounded-xl leading-snug" style={{ color: colorMuted, background: colorPageBg }}>
        {takeaway}
      </p>
    </section>
  );
}

export default function FarmTrendsModal({ open, onClose, annual, monthly, farmId }) {
  const dialogRef = useRef(null);
  const latestCrop = useMemo(() => {
    const latest = annual?.[annual.length - 1];
    return hasText(latest?.crop1) ? latest.crop1.trim().toUpperCase() : 'NO CROP';
  }, [annual]);

  const series = useMemo(() => monthlyPointsByYear(monthly), [monthly]);
  const counts = useMemo(() => countDryMonths(monthly), [monthly]);
  const firstCalendarYear = series[0]?.year;

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
            <h2 id="farm-trends-title" className="text-[20px] font-bold" style={{ color: colorInk }}>Year-by-year trends</h2>
            <p className="text-[12px] mt-0.5" style={{ color: colorMuted }}>
              {latestCrop} · Farm {farmId || '--'} · agricultural years run July to June
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
          <ChartCard
            title="AET vs PET"
            subtitle={`Every month since ${firstCalendarYear ?? ''}, grouped by year. The orange band is water the crop went without.`}
            legend={series.length > 0 && <WaterChartLegend />}
            takeaway={waterTakeaway(annual || [])}
          >
            {series.length > 0 ? (
              <WaterChart series={series} />
            ) : (
              <p className="text-[12px] py-10 text-center" style={{ color: colorMuted }}>No monthly water data for this farm.</p>
            )}
          </ChartCard>

          <ChartCard
            title="Months of stress by season"
            subtitle="Months where soil moisture stayed below 0.5, split across the three cropping seasons."
            legend={counts.length > 0 && <DryMonthsChartLegend />}
            takeaway={dryTakeaway(counts)}
          >
            {counts.length > 0 ? (
              <DryMonthsChart counts={counts} />
            ) : (
              <p className="text-[12px] py-10 text-center" style={{ color: colorMuted }}>No monthly data for this farm.</p>
            )}
          </ChartCard>
        </div>
      </div>
    </div>,
    document.body,
  );
}
