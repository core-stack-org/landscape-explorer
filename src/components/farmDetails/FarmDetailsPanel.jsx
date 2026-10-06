import { useEffect, useState } from 'react';
import { ChevronIcon, CloseIcon, TrendIcon } from './icons';
import CropHeroCard from './CropHeroCard';
import FieldSizeCard from './FieldSizeCard';
import CroppingHistory from './CroppingHistory';
import WaterBalanceCard from './WaterBalanceCard';
import OtherCropsCard from './OtherCropsCard';
import FarmTrendsModal from './FarmTrendsModal';
import { sortedByYear, buildCroppingHistory } from './farmDetailsUtils';
import { colorBorder, colorPageBg, colorSurface, colorInk, colorMuted, colorFaint, colorPrimary, colorBad } from './farmDetailsTokens';

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse py-2">
      {[120, 56, 180, 140].map((h, i) => (
        <div key={i} className="rounded-2xl" style={{ height: h, background: colorBorder }} />
      ))}
    </div>
  );
}

export default function FarmDetailsPanel({ farmId, annual, monthly, loading, error, onClose }) {
  const [trendsOpen, setTrendsOpen] = useState(false);

  useEffect(() => {
    setTrendsOpen(false);
  }, [farmId]);

  const rows = sortedByYear(annual);
  const latest = rows[rows.length - 1];
  const hasHistory = rows.length > 0;
  const latestCycle = hasHistory ? buildCroppingHistory(rows).at(-1) : null;

  return (
    <div className="flex flex-col rounded-xl overflow-hidden" style={{ background: colorPageBg, border: `1px solid ${colorBorder}` }}>
      <div className="flex items-center gap-2.5 px-3.5 py-3" style={{ background: colorSurface, borderBottom: `1px solid ${colorBorder}` }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-gray-50"
          style={{ border: `1px solid ${colorBorder}`, color: colorInk }}
        >
          <ChevronIcon size={14} direction="left" stroke={colorInk} strokeWidth={2.2} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-bold leading-tight" style={{ color: colorInk }}>This farm</div>
          <div className="text-[11px] mt-0.5 truncate" style={{ color: colorFaint }}>Farm ID {farmId || '--'}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close farm details"
          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-100 flex-shrink-0"
          style={{ color: colorMuted }}
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="px-3.5 py-3.5 space-y-3.5 overflow-y-auto" style={{ maxHeight: '65vh' }}>
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
          </>
        )}
      </div>

      {!loading && !error && hasHistory && (
        <div className="p-3.5" style={{ background: colorSurface, borderTop: `1px solid ${colorBorder}` }}>
          <button
            type="button"
            onClick={() => setTrendsOpen(true)}
            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors hover:brightness-95"
            style={{ background: colorPrimary, color: '#FFFFFF' }}
          >
            <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <TrendIcon size={16} stroke="#FFFFFF" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-bold">See year-by-year trends</span>
              <span className="block text-[11px] opacity-90">Water use and dry months across all years</span>
            </span>
            <ChevronIcon size={14} stroke="#FFFFFF" strokeWidth={2.2} />
          </button>
        </div>
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
