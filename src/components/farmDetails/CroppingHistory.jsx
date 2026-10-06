import { buildCroppingHistory, agriYearLabel } from './farmDetailsUtils';
import {
  colorPrimary, colorDataWarm, colorNeutralCrop, colorInk, colorMuted, colorFaint,
  colorBorder, colorBorderSoft, colorSurface, colorTrack, colorInactive,
} from './farmDetailsTokens';

const MONTH_INITIALS = ['J', 'A', 'S', 'O', 'N', 'D', 'J', 'F', 'M', 'A', 'M', 'J'];

export function cropColor(crop) {
  const key = (crop || '').toLowerCase();
  if (key === 'rice') return colorPrimary;
  if (key === 'corn' || key === 'maize') return colorDataWarm;
  return colorNeutralCrop;
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

export default function CroppingHistory({ annual }) {
  const rows = buildCroppingHistory(annual);
  if (rows.length === 0) return null;
  const currentYear = rows[rows.length - 1].year;
  const cropsPresent = [...new Set(rows.filter((r) => r.crop && r.startFrac !== null).map((r) => r.crop))];
  const hasGap = rows.some((r) => !r.crop);

  return (
    <section>
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: colorFaint }}>
        Cropping history
      </div>
      <div className="rounded-2xl px-3 py-3" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-[44px]" />
          <div className="flex-1 relative flex">
            {MONTH_INITIALS.map((m, i) => (
              <div key={i} className="flex-1 text-center text-[9px] font-semibold" style={{ color: colorFaint }}>{m}</div>
            ))}
          </div>
          <div className="w-[30px]" />
        </div>

        {rows.map((row) => {
          const isCurrent = row.year === currentYear;
          const hasBar = row.crop && row.startFrac !== null;
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
                {agriYearLabel(row.year)}
              </div>

              <div className="flex-1 relative h-[22px] rounded" style={{ background: colorTrack }}>
                <CellGrid />
                {hasBar && (
                  <>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-[14px] rounded-[7px]"
                      style={{
                        left: `${(row.startFrac / 12) * 100}%`,
                        width: `${Math.max(0, ((row.endFrac - row.startFrac) / 12) * 100)}%`,
                        background: color,
                      }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 text-[10px] font-semibold whitespace-nowrap"
                      style={{ left: `calc(${(row.endFrac / 12) * 100}% + 6px)`, color: colorInk }}
                    >
                      {row.crop}
                    </div>
                  </>
                )}
                {!row.crop && (
                  <>
                    <div
                      className="absolute left-0 right-0 top-1/2 border-t border-dashed"
                      style={{ borderColor: colorInactive }}
                    />
                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-[9px] whitespace-nowrap"
                      style={{ background: colorTrack, color: colorFaint }}
                    >
                      no crop detected
                    </div>
                  </>
                )}
              </div>

              <div className="w-[30px] text-right text-[10px]" style={{ color: colorMuted }}>
                {row.days !== null ? `${row.days}d` : '—'}
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
        </p>
      </div>
    </section>
  );
}
