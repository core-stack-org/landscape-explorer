import { buildCroppingHistory, formatDate } from './farmDetailsUtils';
import {
  colorInk, colorMuted,
  colorBorder, colorBorderSoft, colorSurface, colorTrack, colorInactive,
  CROP_COLORS, CROP_FALLBACK,
} from './farmDetailsTokens';

const MONTH_INITIALS = ['J', 'A', 'S', 'O', 'N', 'D', 'J', 'F', 'M', 'A', 'M', 'J'];

const CROP_COLORS_BY_LOWER = Object.fromEntries(
  Object.entries(CROP_COLORS).map(([name, color]) => [name.toLowerCase(), color]),
);

export function cropColor(crop) {
  return CROP_COLORS_BY_LOWER[(crop || '').toLowerCase()] ?? CROP_FALLBACK;
}

function CellGrid() {
  return (
    <>
      {Array.from({ length: 11 }, (_, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 w-px"
          style={{ left: `${((i + 1) / 12) * 100}%`, background: colorBorderSoft }}
        />
      ))}
    </>
  );
}

// One edge of a segment: flat + a direction marker when it's clamped or it's
// a continuation sliver, rounded + no marker when it's the cycle's real end.
function Edge({ side, open, markerDirection }) {
  if (!open) return null;
  const isLeft = side === 'left';
  return (
    <span
      className="absolute top-1/2 -translate-y-1/2 text-[7px] leading-none pointer-events-none"
      style={{ [isLeft ? 'left' : 'right']: 2, color: 'rgba(255,255,255,0.9)' }}
      aria-hidden="true"
    >
      {markerDirection === 'up' ? '▲' : '▼'}
    </span>
  );
}

// Hover bubble, anchored above its own segment so it centers on just that
// bar rather than the whole track. CSS-only (Tailwind's group-hover), so it
// needs no component state.
function SegmentTooltip({ crop, sowDate, harvestDate, note }) {
  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] leading-snug shadow-lg"
      style={{ background: colorInk, color: '#FFFFFF' }}
      role="tooltip"
    >
      <div className="font-semibold">{crop}</div>
      <div>Sown {formatDate(sowDate)}</div>
      <div>Harvested {formatDate(harvestDate)}</div>
      {note && <div className="mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{note}</div>}
      <div
        className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
        style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `4px solid ${colorInk}` }}
      />
    </div>
  );
}

function Segment({ startFrac, endFrac, color, flatLeft, flatRight, crop, sowDate, harvestDate, note }) {
  return (
    <div className="absolute top-1/2 -translate-y-1/2 h-[14px] group" style={{
      left: `${(startFrac / 12) * 100}%`,
      width: `${Math.max(0, ((endFrac - startFrac) / 12) * 100)}%`,
      background: color,
      borderTopLeftRadius: flatLeft ? 0 : 7,
      borderBottomLeftRadius: flatLeft ? 0 : 7,
      borderTopRightRadius: flatRight ? 0 : 7,
      borderBottomRightRadius: flatRight ? 0 : 7,
    }}
    >
      <Edge side="left" open={flatLeft} markerDirection="up" />
      <Edge side="right" open={flatRight} markerDirection="down" />
      <SegmentTooltip crop={crop} sowDate={sowDate} harvestDate={harvestDate} note={note} />
    </div>
  );
}

// Crop data only exists from 2020 onward; earlier years would always show as
// gaps. The API keys a record by calendar year, not agri year, so a cycle
// sown in agri year 2020 (Jul 2020 - Jun 2021) — e.g. sown in Mar/Apr 2021 —
// is still returned under year: 2020. Cutting the display off at 2021 would
// hide that record's row entirely, even though most of its bar belongs there.
const MIN_CROP_YEAR = 2020;

export default function CroppingHistory({ annual }) {
  const allRows = buildCroppingHistory(annual);
  const rowsByYear = new Map(allRows.map((r) => [r.year, r]));
  const rows = allRows.filter((row) => row.year >= MIN_CROP_YEAR);
  if (rows.length === 0) return null;

  const currentYear = rows[rows.length - 1].year;

  // Precomputed once per row so the legend and the "no crop" gap check agree
  // with what actually renders, including slivers spilled in from neighbors.
  const rowMeta = rows.map((row) => {
    const hasBar = row.crop && row.startFrac !== null;
    const prev = rowsByYear.get(row.year - 1);
    const next = rowsByYear.get(row.year + 1);
    const prevSpill = prev && prev.harvestAfterWindow
      ? { crop: prev.crop, start: 0, end: Math.min(12, prev.rawEndFrac - 12), sowDate: prev.sowDate, harvestDate: prev.harvestDate }
      : null;
    const nextSpill = next && next.sowBeforeWindow
      ? { crop: next.crop, start: Math.max(0, 12 + next.rawStartFrac), end: 12, sowDate: next.sowDate, harvestDate: next.harvestDate }
      : null;
    return { row, hasBar, prevSpill, nextSpill, hasAnySegment: hasBar || !!prevSpill || !!nextSpill };
  });

  const cropsPresent = [...new Set(
    rowMeta.flatMap(({ row, hasBar, prevSpill, nextSpill }) => [
      hasBar ? row.crop : null,
      prevSpill?.crop ?? null,
      nextSpill?.crop ?? null,
    ]).filter(Boolean),
  )];
  const hasGap = rowMeta.some((m) => !m.hasAnySegment);

  return (
    <section>
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: colorMuted }}>
        Cropping history
      </div>
      <div className="rounded-2xl px-3 py-3" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-[44px]" />
          <div className="flex-1 relative flex">
            {MONTH_INITIALS.map((m, i) => (
              <div key={i} className="flex-1 text-center text-[9px] font-semibold" style={{ color: colorMuted }}>{m}</div>
            ))}
          </div>
        </div>

        {rowMeta.map(({ row, hasBar, prevSpill, nextSpill, hasAnySegment }) => {
          const isCurrent = row.year === currentYear;
          const color = cropColor(row.crop);

          return (
            <div
              key={row.year}
              className="flex items-center gap-2 py-1.5 px-1 rounded-lg"
              style={{ background: isCurrent ? colorTrack : 'transparent' }}
            >
              <div
                className="w-[44px] text-[10px]"
                style={{ color: isCurrent ? colorInk : colorMuted, fontWeight: isCurrent ? 700 : 500 }}
              >
                {`${String(row.year).slice(-2)}–${String(row.year + 1).slice(-2)}`}
              </div>

              <div className="flex-1 relative h-[22px] rounded" style={{ background: colorTrack }}>
                <CellGrid />

                {prevSpill && (
                  <Segment
                    startFrac={prevSpill.start}
                    endFrac={prevSpill.end}
                    color={cropColor(prevSpill.crop)}
                    flatLeft
                    flatRight={false}
                    crop={prevSpill.crop}
                    sowDate={prevSpill.sowDate}
                    harvestDate={prevSpill.harvestDate}
                    note="Continues from the row above"
                  />
                )}

                {hasBar && (
                  <Segment
                    startFrac={row.startFrac}
                    endFrac={row.endFrac}
                    color={color}
                    flatLeft={row.sowBeforeWindow}
                    flatRight={row.harvestAfterWindow}
                    crop={row.crop}
                    sowDate={row.sowDate}
                    harvestDate={row.harvestDate}
                    note={
                      row.sowBeforeWindow && row.harvestAfterWindow
                        ? 'Continues from the row above and into the row below'
                        : row.sowBeforeWindow
                          ? 'Continues from the row above'
                          : row.harvestAfterWindow
                            ? 'Continues into the row below'
                            : null
                    }
                  />
                )}

                {nextSpill && (
                  <Segment
                    startFrac={nextSpill.start}
                    endFrac={nextSpill.end}
                    color={cropColor(nextSpill.crop)}
                    flatLeft={false}
                    flatRight
                    crop={nextSpill.crop}
                    sowDate={nextSpill.sowDate}
                    harvestDate={nextSpill.harvestDate}
                    note="Continues into the row below"
                  />
                )}

                {!hasAnySegment && (
                  <>
                    <div
                      className="absolute left-0 right-0 top-1/2 border-t border-dashed"
                      style={{ borderColor: colorInactive }}
                    />
                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-[9px] whitespace-nowrap"
                      style={{ background: colorTrack, color: colorMuted }}
                    >
                      no crop detected
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        <div className="mt-3 pt-2.5 flex flex-wrap gap-x-3 gap-y-1.5" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
          {cropsPresent.map((crop) => (
            <div key={crop} className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full" style={{ background: cropColor(crop) }} />
              <span className="text-[10px]" style={{ color: colorMuted }}>{crop}</span>
            </div>
          ))}
          {hasGap && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 border-t border-dashed" style={{ borderColor: colorInactive }} />
              <span className="text-[10px]" style={{ color: colorMuted }}>no crop</span>
            </div>
          )}
        </div>
        <p className="text-[10px] mt-2 leading-snug" style={{ color: colorMuted }}>
          Each bar is one crop cycle, placed by its sowing and harvest dates across July to June. Bar length shows how long the crop was in the ground.
          A flat edge with a ▲ or ▼ mark means the cycle continues into the row above or below — hover either piece for the real dates.
        </p>
      </div>
    </section>
  );
}
