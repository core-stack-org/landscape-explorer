import { useEffect, useState } from 'react';
import { ChevronIcon, TrendIcon } from './icons';
import CropHeroCard from './CropHeroCard';
import FieldSizeCard from './FieldSizeCard';
import CroppingHistory from './CroppingHistory';
import WaterBalanceCard from './WaterBalanceCard';
import OtherCropsCard from './OtherCropsCard';
import FarmTrendsModal from './FarmTrendsModal';
import { sortedByYear, buildCroppingHistory } from './farmDetailsUtils';
import { colorBorder, colorPageBg, colorInk, colorMuted, colorFaint, colorPrimary, colorBad } from './farmDetailsTokens';

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse py-2">
      {[120, 56, 180, 140].map((h, i) => (
        <div key={i} className="rounded-2xl" style={{ height: h, background: colorBorder }} />
      ))}
    </div>
  );
}

// Body only: the surrounding detail shell owns the header and tab strip.
export default function FarmDetailsPanel({ farmId, annual, monthly, loading, error }) {
  const [trendsOpen, setTrendsOpen] = useState(false);

  useEffect(() => {
    setTrendsOpen(false);
  }, [farmId]);

  const rows = sortedByYear(annual);
  const latest = rows[rows.length - 1];
  const hasHistory = rows.length > 0;
  const latestCycle = hasHistory ? buildCroppingHistory(rows).at(-1) : null;
  const firstYear = hasHistory ? rows[0].year : null;

  return (
    <div className="space-y-3.5" style={{ background: colorPageBg }}>
      <div className="text-[11px]" style={{ color: colorMuted }}>
        Farm ID <span style={{ color: colorMuted }}>{farmId || '--'}</span>
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <p className="text-[12px] text-center py-8" style={{ color: colorBad }}>{error}</p>
      ) : !hasHistory ? (
        <p className="text-[12px] text-center py-8" style={{ color: colorMuted }}>No farm data is available yet.</p>
      ) : (
        <>
          <CropHeroCard record={latest} cycle={latestCycle} year={latest.year} />
          <FieldSizeCard areaInHa={latest.areaInHa} />
          <CroppingHistory annual={rows} />
          <WaterBalanceCard record={latest} />
          <OtherCropsCard record={latest} />

          <button
            type="button"
            onClick={() => setTrendsOpen(true)}
            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left"
            style={{ background: colorPrimary, color: '#FFFFFF' }}
          >
            <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <TrendIcon size={16} stroke="#FFFFFF" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-bold">See year-by-year trends</span>
              <span className="block text-[11px] opacity-90">Water and dry months since {firstYear}</span>
            </span>
            <ChevronIcon size={14} stroke="#FFFFFF" strokeWidth={2.2} />
          </button>
        </>
      )}

      <FarmTrendsModal
        open={trendsOpen}
        onClose={() => setTrendsOpen(false)}
        annual={rows}
        monthly={monthly}
        farmId={farmId}
      />
    </div>
  );
}
