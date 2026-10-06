import { getConfidenceLevel, hasText } from './farmDetailsUtils';
import { colorBorder, colorBorderSoft, colorSurface, colorInk, colorMuted, colorFaint, colorGood, colorWarn, colorBad } from './farmDetailsTokens';

const DOT = { High: colorGood, Medium: colorWarn, Low: colorBad };

export default function OtherCropsCard({ record }) {
  const rows = [
    { name: record?.crop2, level: getConfidenceLevel(record?.conf2) },
    { name: record?.crop3, level: getConfidenceLevel(record?.conf3) },
  ].filter((r) => hasText(r.name));

  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl px-4 py-3" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: colorFaint }}>Other possible crops</div>
      {rows.map((r, i) => (
        <div key={r.name} className="flex items-center justify-between py-2" style={{ borderTop: i === 0 ? 'none' : `1px solid ${colorBorderSoft}` }}>
          <span className="text-[12px] font-semibold" style={{ color: colorInk }}>{r.name.trim()}</span>
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: colorMuted }}>
            {r.level && <span className="w-1.5 h-1.5 rounded-full" style={{ background: DOT[r.level] }} />}
            {r.level || 'Unscored'}
          </span>
        </div>
      ))}
      <p className="text-[10px] mt-1 leading-snug" style={{ color: colorMuted }}>
        These came out lower in the model's ranking, so they are less certain than the main crop.
      </p>
    </section>
  );
}
