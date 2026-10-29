import { agriYearLabel, isValid } from './farmDetailsUtils';
import { colorBorder, colorSurface, colorInk, colorMuted, colorTrack } from './farmDetailsTokens';

// A zero/no-crop year gets the flat track color so it reads as "nothing
// happened" rather than a low but real intensity.
function IntensityChip({ year, value }) {
  const hasValue = isValid(value);
  const isZero = hasValue && Number(value) === 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-full aspect-square rounded-xl flex items-center justify-center text-[12px] font-bold"
        style={{ background: hasValue && !isZero ? colorBorder : colorTrack, color: colorInk }}
      >
        {hasValue ? Number(value).toFixed(1) : '--'}
      </div>
      <div className="text-[10px]" style={{ color: colorMuted }}>{String(year).slice(-2)}</div>
    </div>
  );
}

// `annual` is the already year-sorted rows from FarmDetailsPanel; each row
// carries its own cropIntensity straight from the timeseries API.
export default function CroppingIntensity({ annual }) {
  const rows = (annual || []).filter((row) => isValid(row.year));
  if (rows.length === 0) return null;

  const latest = rows[rows.length - 1];
  const hasLatest = isValid(latest.cropIntensity);

  return (
    <section>
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: colorMuted }}>
        Cropping intensity
      </div>
      <div className="rounded-2xl px-4 py-3" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[13px]" style={{ color: colorMuted }}>{agriYearLabel(latest.year)}</span>
          <span className="text-[26px] font-bold" style={{ color: colorInk }}>
            {hasLatest ? Number(latest.cropIntensity).toFixed(1) : '--'}
          </span>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
          {rows.map((row) => (
            <IntensityChip key={row.year} year={row.year} value={row.cropIntensity} />
          ))}
        </div>
      </div>
    </section>
  );
}
