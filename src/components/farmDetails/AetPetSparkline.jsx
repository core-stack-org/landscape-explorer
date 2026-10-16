import { ExpandIcon } from './icons';
import {
  colorPrimary, colorDataWarm, colorBorder, colorBorderSoft, colorSurface, colorMuted, colorInk,
} from './farmDetailsTokens';

const W = 324;
const H = 76;
const PAD = 4;

// Splits a series into runs of consecutive valid points, so a missing month
// breaks the line instead of being bridged or drawn as zero.
function runs(values) {
  const out = [];
  let current = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length) out.push(current);
      current = [];
    } else {
      current.push([i, v]);
    }
  });
  if (current.length) out.push(current);
  return out;
}

// Runs where both lines have a value, for the shortfall band between them.
function bandRuns(aet, pet) {
  const both = aet.map((a, i) => (a !== null && pet[i] !== null ? [a, pet[i]] : null));
  const out = [];
  let current = [];
  both.forEach((pair, i) => {
    if (pair === null) {
      if (current.length) out.push(current);
      current = [];
    } else {
      current.push([i, pair[0], pair[1]]);
    }
  });
  if (current.length) out.push(current);
  return out;
}

export default function AetPetSparkline({ series, onOpen }) {
  if (!series || series.length === 0) return null;

  const aet = series.flatMap((s) => s.points.map((p) => p.aet));
  const pet = series.flatMap((s) => s.points.map((p) => p.pet));
  const n = aet.length;
  const max = Math.max(1, ...aet.filter((v) => v !== null), ...pet.filter((v) => v !== null));

  const x = (i) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v) => H - PAD - (v / max) * (H - PAD * 2);
  const line = (run) => run.map(([i, v], k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const band = (run) =>
    `${run.map(([i, , p], k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p).toFixed(1)}`).join(' ')} `
    + `${[...run].reverse().map(([i, a]) => `L${x(i).toFixed(1)} ${y(a).toFixed(1)}`).join(' ')} Z`;

  const yearEdges = series.slice(1).map((_, k) => x((k + 1) * 12 - 0.5));

  return (
    <section className="rounded-2xl p-3.5" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colorMuted }}>AET vs PET</div>
        <button
          type="button"
          onClick={onOpen}
          aria-label="Open year-by-year trends"
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center hover:bg-gray-50"
          style={{ border: `1px solid ${colorBorder}`, color: colorInk }}
        >
          <ExpandIcon size={14} />
        </button>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        role="img"
        aria-label={`AET and PET by month, ${series[0].yearLabel} to ${series[series.length - 1].yearLabel}`}
      >
        {yearEdges.map((ex, k) => (
          <line key={k} x1={ex} x2={ex} y1={0} y2={H} stroke={colorBorderSoft} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        {bandRuns(aet, pet).map((run, k) => (
          <path key={`b${k}`} d={band(run)} fill={colorDataWarm} fillOpacity="0.15" stroke="none" />
        ))}
        {runs(pet).map((run, k) => (
          <path key={`p${k}`} d={line(run)} fill="none" stroke={colorDataWarm} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
        {runs(aet).map((run, k) => (
          <path key={`a${k}`} d={line(run)} fill="none" stroke={colorPrimary} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      <div className="flex justify-between mt-1 text-[9px]" style={{ color: colorMuted }}>
        <span>{series[0].yearLabel}</span>
        <span>{series[series.length - 1].yearLabel}</span>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5"><span className="w-3 h-0.5" style={{ background: colorPrimary }} /><span className="text-[10px]" style={{ color: colorMuted }}>AET</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-0.5" style={{ background: colorDataWarm }} /><span className="text-[10px]" style={{ color: colorMuted }}>PET</span></div>
      </div>
    </section>
  );
}
