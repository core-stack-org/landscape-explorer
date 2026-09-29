import { SowIcon, HarvestIcon } from './icons';
import { buildAgriYearMonths, monthKey } from './farmDetailsUtils';
import {
  colorPrimary,
  colorPrimaryLight,
  colorHarvest,
  colorBorder,
  colorTextSecondary,
  colorTextMuted,
  colorTimelineHighlight,
} from './farmDetailsTokens';

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-[10px]" style={{ color: colorTextSecondary }}>{label}</span>
    </div>
  );
}

export default function AgriTimeline({ agriYear, cropStartDate, cropEndDate }) {
  const slots = buildAgriYearMonths(agriYear);
  if (slots.length === 0) return null;

  const startKey = monthKey(cropStartDate);
  const endKey = monthKey(cropEndDate);
  const startIdx = slots.findIndex((s) => s.key === startKey);
  const endIdx = slots.findIndex((s) => s.key === endKey);
  const hasRange = startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx;

  const slotWidthPct = 100 / slots.length;
  const highlightLeftPct = hasRange ? (startIdx + 0.5) * slotWidthPct : 0;
  const highlightWidthPct = hasRange ? (endIdx - startIdx) * slotWidthPct : 0;

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-2.5" style={{ color: colorTextMuted }}>
        Agricultural practices &middot; {slots[0].label} {slots[0].calendarYear} &ndash; {slots[slots.length - 1].displayLabel}
      </div>
      <div className="bg-white rounded-2xl px-3.5 pt-4 pb-3" style={{ border: `1px solid ${colorBorder}` }}>
        <div className="relative flex justify-between">
          <div className="absolute h-[2px] left-0 right-0" style={{ top: 16, background: colorPrimaryLight }} />
          {hasRange && (
            <div
              className="absolute h-[2px]"
              style={{ top: 16, left: `${highlightLeftPct}%`, width: `${highlightWidthPct}%`, background: colorTimelineHighlight }}
            />
          )}
          {slots.map((slot) => {
            const isSow = slot.key === startKey;
            const isHarvest = slot.key === endKey;
            const inRange = hasRange && slot.monthIndex > startIdx && slot.monthIndex < endIdx;
            return (
              <div key={slot.key} className="relative flex flex-col items-center gap-1" style={{ width: `${slotWidthPct}%` }}>
                <div className="h-6 flex items-center justify-center">
                  {isSow ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center z-10" style={{ background: colorPrimary }}>
                      <SowIcon size={12} stroke="#FFFFFF" />
                    </div>
                  ) : isHarvest ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center z-10" style={{ background: colorHarvest }}>
                      <HarvestIcon size={12} stroke="#FFFFFF" />
                    </div>
                  ) : (
                    <div
                      className="rounded-full z-10"
                      style={{ width: inRange ? 8 : 6, height: inRange ? 8 : 6, background: inRange ? colorBorder : colorTextMuted }}
                    />
                  )}
                </div>
                <span className="text-[9px]" style={{ color: isSow || isHarvest ? colorTextSecondary : colorTextMuted }}>
                  {slot.displayLabel}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-4 pt-3 flex-wrap" style={{ borderTop: `1px solid ${colorBorder}` }}>
          <LegendDot color={colorPrimary} label="Sowing" />
          <LegendDot color={colorHarvest} label="Harvest" />
          <LegendDot color={colorTextMuted} label="No active crop" />
        </div>
      </div>
    </div>
  );
}
