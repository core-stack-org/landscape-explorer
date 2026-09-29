import { SowIcon, HarvestIcon, VegetativeIcon } from './icons';
import { getConfidenceLevel, buildAgriYearMonths, buildMonthlyLookup, monthKey, parseFlexibleDate } from './farmDetailsUtils';
import {
  colorPrimary,
  colorPrimaryLight,
  colorBorder,
  colorTextPrimary,
  colorTextSecondary,
  colorTextMuted,
  colorHarvest,
  colorConfidenceHigh,
} from './farmDetailsTokens';

const CONFIDENCE_DOT = {
  High: colorConfidenceHigh,
  Medium: colorHarvest,
  Low: '#B91C1C',
};

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function CropContextStrip({ record }) {
  const hasCrop = hasText(record.crop1);
  const level = getConfidenceLevel(record.conf1);
  return (
    <div className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5" style={{ border: `1px solid ${colorBorder}` }}>
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: hasCrop ? colorPrimaryLight : '#F2F2F2' }}
      >
        <SowIcon size={15} stroke={hasCrop ? colorPrimary : colorTextMuted} strokeWidth={1.8} />
      </div>
      <div className="flex-grow min-w-0">
        <div className="text-[12px] font-bold truncate" style={{ color: hasCrop ? colorTextPrimary : colorTextMuted }}>
          {hasCrop ? record.crop1 : 'No crop detected'}
        </div>
        <div className="text-[10px]" style={{ color: colorTextSecondary }}>Agri year &middot; {record.year}</div>
      </div>
      {hasCrop && level && (
        <div className="flex items-center gap-1 px-2 py-[3px] rounded-full flex-shrink-0" style={{ background: 'rgba(0,100,0,0.10)' }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: CONFIDENCE_DOT[level] }} />
          <span className="text-[10px] font-semibold" style={{ color: CONFIDENCE_DOT[level] }}>{level}</span>
        </div>
      )}
    </div>
  );
}

function MaiBar({ value }) {
  if (value == null) return <span className="text-[10px]" style={{ color: colorTextMuted }}>--</span>;
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color = value >= 0.5 ? colorConfidenceHigh : colorHarvest;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-grow h-[5px] rounded-full overflow-hidden" style={{ background: colorPrimaryLight }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] w-[24px]" style={{ color: colorTextSecondary }}>{value.toFixed(2)}</span>
    </div>
  );
}

function MonthRow({ slot, record, isSow, isHarvest, sowDay, harvestDay, dim }) {
  const icon = isSow ? (
    <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center" style={{ background: colorPrimaryLight }}>
      <SowIcon size={11} stroke={colorPrimary} />
    </div>
  ) : isHarvest ? (
    <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center" style={{ background: colorPrimaryLight }}>
      <HarvestIcon size={11} stroke={colorHarvest} strokeWidth={2.4} />
    </div>
  ) : dim ? (
    <div className="w-[22px] h-[22px] rounded-full" style={{ background: colorPrimaryLight }} />
  ) : (
    <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center" style={{ background: 'rgba(0,100,0,0.10)' }}>
      <VegetativeIcon size={11} />
    </div>
  );

  const annotation = isSow && sowDay
    ? ` · sown ${sowDay}${ordinalSuffix(sowDay)}`
    : isHarvest && harvestDay
    ? ` · harvested ${harvestDay}${ordinalSuffix(harvestDay)}`
    : '';

  const numberColor = dim ? colorTextMuted : colorTextPrimary;

  return (
    <div
      className="grid items-center gap-2 px-3 py-2"
      style={{
        gridTemplateColumns: '30px 1fr 42px 42px 72px',
        borderTop: `1px solid ${colorBorder}`,
        opacity: dim ? 0.7 : 1,
      }}
    >
      {icon}
      <div className="text-[12px] font-semibold" style={{ color: dim ? colorTextSecondary : colorTextPrimary }}>
        {slot.displayLabel}
        {annotation && <span className="font-normal" style={{ color: colorTextMuted }}>{annotation}</span>}
      </div>
      <div className="text-[12px] text-right" style={{ color: numberColor }}>{record?.aet != null ? record.aet.toFixed(0) : '--'}</div>
      <div className="text-[12px] text-right" style={{ color: numberColor }}>{record?.pet != null ? record.pet.toFixed(0) : '--'}</div>
      <MaiBar value={record?.mai} />
    </div>
  );
}

function ordinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export default function FarmMonthlyView({ annual, monthly, selectedYear }) {
  if (!annual || annual.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-xs" style={{ color: colorTextMuted }}>
        No monthly data available for this farm.
      </div>
    );
  }

  // Scoped to whichever year the dropdown has selected; fall back to the
  // most recent record until a selection lands.
  const record = annual.find((r) => String(r.year) === String(selectedYear)) || annual[annual.length - 1];

  const slots = buildAgriYearMonths(record.year);
  const lookup = buildMonthlyLookup(monthly);

  const startKey = monthKey(record.cropStartDate);
  const endKey = monthKey(record.cropEndDate);
  const startIdx = slots.findIndex((s) => s.key === startKey);
  const endIdx = slots.findIndex((s) => s.key === endKey);
  const hasRange = startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx;
  const sowDay = parseFlexibleDate(record.cropStartDate)?.getDate();
  const harvestDay = parseFlexibleDate(record.cropEndDate)?.getDate();

  return (
    <div className="flex flex-col gap-4">
      <CropContextStrip record={record} />

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colorTextMuted }}>
            Monthly water balance
          </div>
          <div className="text-[10px]" style={{ color: colorTextMuted }}>mm &middot; MAI</div>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: `1px solid ${colorBorder}` }}>
          <div
            className="grid gap-2 px-3 py-2 text-[9px] font-bold uppercase tracking-wide"
            style={{ gridTemplateColumns: '30px 1fr 42px 42px 72px', background: colorPrimaryLight, color: colorTextMuted }}
          >
            <div />
            <div>Month</div>
            <div className="text-right">AET</div>
            <div className="text-right">PET</div>
            <div>MAI</div>
          </div>

          {slots.map((slot) => {
            const record = lookup.get(slot.key);
            const isSow = slot.key === startKey;
            const isHarvest = slot.key === endKey;
            const inGrowingWindow = hasRange && slot.monthIndex >= startIdx && slot.monthIndex <= endIdx;
            return (
              <MonthRow
                key={slot.key}
                slot={slot}
                record={record}
                isSow={isSow}
                isHarvest={isHarvest}
                sowDay={sowDay}
                harvestDay={harvestDay}
                dim={!inGrowingWindow}
              />
            );
          })}
        </div>
      </div>

      <div className="flex gap-3.5 flex-wrap px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: colorPrimary }} />
          <span className="text-[10px]" style={{ color: colorTextSecondary }}>Sowing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: colorConfidenceHigh }} />
          <span className="text-[10px]" style={{ color: colorTextSecondary }}>Vegetative</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: colorHarvest }} />
          <span className="text-[10px]" style={{ color: colorTextSecondary }}>Harvest</span>
        </div>
      </div>
    </div>
  );
}
