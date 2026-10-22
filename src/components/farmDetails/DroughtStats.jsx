import { isValid } from './farmDetailsUtils';
import { colorBorder, colorSurface, colorInk, colorMuted } from './farmDetailsTokens';

function StatCard({ label, value, caption }) {
  return (
    <div className="flex-1 rounded-2xl px-4 py-3" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <div className="text-[11px]" style={{ color: colorMuted }}>{label}</div>
      <div className="text-[22px] font-bold leading-tight mt-1" style={{ color: colorInk }}>{value}</div>
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
          label="How often"
          value={hasFrequency ? Number(frequency).toFixed(2) : '--'}
          caption="drought frequency"
        />
        <StatCard
          label="How hard"
          value={hasIntensity ? Number(intensity).toFixed(2) : '--'}
          caption="mean MAI, drought years"
        />
      </div>
    </section>
  );
}
