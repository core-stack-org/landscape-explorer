import { isValid } from './farmDetailsUtils';
import { colorBorder, colorSurface, colorInk, colorMuted } from './farmDetailsTokens';

function StatCard({ label, value, caption }) {
  // A text value (e.g. "No Drought Observed") wraps across several lines at
  // the number size, so it gets a smaller size instead of the 22px numbers use.
  const isTextValue = typeof value === 'string' && !/^-?[\d.]+$/.test(value.trim()) && value !== '--';
  return (
    <div className="flex-1 rounded-2xl px-4 py-3" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <div className="text-[11px]" style={{ color: colorMuted }}>{label}</div>
      <div className={`font-bold leading-snug mt-1 ${isTextValue ? 'text-[14px]' : 'text-[22px]'}`} style={{ color: colorInk }}>{value}</div>
      <div className="text-[10px] mt-0.5" style={{ color: colorMuted }}>{caption}</div>
    </div>
  );
}

// frequency/intensity come straight off the farm_boundaries PMTiles feature
// (properties.frequency, properties.intensity), not the timeseries API.
export default function DroughtStats({ frequency, intensity }) {
  const hasFrequency = isValid(frequency);
  const hasIntensity = isValid(intensity);
  if (!hasFrequency && !hasIntensity) return null;

  return (
    <section>
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: colorMuted }}>
        Drought
      </div>
      <div className="flex gap-3">
        <StatCard
          label="Return Period"
          value={hasFrequency ? (Number(frequency) === 0 ? 'No Drought Observed' : Number(frequency).toFixed(2)) : '--'}
        />
        <StatCard
          label="Intensity"
          value={hasIntensity ? Number(intensity).toFixed(2) : '--'}
        />
      </div>
    </section>
  );
}
