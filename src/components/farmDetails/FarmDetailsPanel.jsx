import { useEffect, useMemo, useState } from 'react';
import AetPetSparkline from './AetPetSparkline';
import DroughtStats from './DroughtStats';
import FieldSizeCard from './FieldSizeCard';
import CroppingHistory from './CroppingHistory';
import FarmTrendsModal from './FarmTrendsModal';
import { sortedByYear, monthlyPointsByYear } from './farmDetailsUtils';
import { colorBorder, colorPageBg, colorMuted, colorBad } from './farmDetailsTokens';

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse py-2">
      {[120, 56, 180].map((h, i) => (
        <div key={i} className="rounded-2xl" style={{ height: h, background: colorBorder }} />
      ))}
    </div>
  );
}

// Body only: the surrounding detail shell owns the header and tab strip.
export default function FarmDetailsPanel({ farmId, annual, monthly, loading, error, frequency, intensity }) {
  const [trendsOpen, setTrendsOpen] = useState(false);

  useEffect(() => {
    setTrendsOpen(false);
  }, [farmId]);

  const rows = sortedByYear(annual);
  const latest = rows[rows.length - 1];
  const hasHistory = rows.length > 0;
  const series = useMemo(() => monthlyPointsByYear(monthly), [monthly]);

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
          <AetPetSparkline series={series} onOpen={() => setTrendsOpen(true)} />
          <DroughtStats frequency={frequency} intensity={intensity} />
          <FieldSizeCard areaInHa={latest.areaInHa} />
          <CroppingHistory annual={rows} />
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
