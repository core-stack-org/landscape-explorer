import { SowIcon, HarvestIcon } from './icons';
import AgriTimeline from './AgriTimeline';
import { getConfidenceLevel, formatDate } from './farmDetailsUtils';
import {
  colorPrimary,
  colorPrimaryLight,
  colorBorder,
  colorTextPrimary,
  colorTextSecondary,
  colorTextMuted,
  colorHarvest,
  colorConfidenceHigh,
  colorConfidenceLow,
  colorConfidenceLowBg,
} from './farmDetailsTokens';

const CONFIDENCE_STYLES = {
  High: { text: colorConfidenceHigh, dot: colorConfidenceHigh, bg: 'rgba(0,100,0,0.10)' },
  Medium: { text: colorHarvest, dot: colorHarvest, bg: 'rgba(255,165,0,0.10)' },
  Low: { text: colorConfidenceLow, dot: colorConfidenceLow, bg: colorConfidenceLowBg },
};

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function ConfidenceBadge({ level }) {
  if (!level) return null;
  const style = CONFIDENCE_STYLES[level];
  return (
    <div className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full" style={{ background: style.bg }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: style.dot }} />
      <span className="text-[10px] font-semibold" style={{ color: style.text }}>{level} confidence</span>
    </div>
  );
}

function SecondaryCropChip({ name, level }) {
  const style = CONFIDENCE_STYLES[level] || CONFIDENCE_STYLES.Low;
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{ background: colorPrimaryLight, border: `1px solid ${colorBorder}` }}
    >
      <span className="text-[11px] font-semibold" style={{ color: colorTextPrimary }}>{name}</span>
      <span className="w-[5px] h-[5px] rounded-full inline-block" style={{ background: style.dot }} />
      <span className="text-[10px]" style={{ color: colorTextSecondary }}>{level}</span>
    </div>
  );
}

function StatTile({ label, value, unit }) {
  return (
    <div className="bg-white rounded-xl px-3.5 py-2.5" style={{ border: `1px solid ${colorBorder}` }}>
      <div className="text-[10px] mb-1" style={{ color: colorTextSecondary }}>{label}</div>
      <div className="text-base font-bold" style={{ color: colorTextPrimary }}>
        {value} {unit && <span className="text-[11px] font-medium" style={{ color: colorTextSecondary }}>{unit}</span>}
      </div>
    </div>
  );
}

export default function FarmYearlyView({ annual, selectedYear }) {
  if (!annual || annual.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-xs" style={{ color: colorTextMuted }}>
        No yearly data available for this farm.
      </div>
    );
  }

  // Everything in this view is scoped to whichever year the dropdown has
  // selected; fall back to the most recent record until a selection lands.
  const record = annual.find((r) => String(r.year) === String(selectedYear)) || annual[annual.length - 1];

  const hasPrimaryCrop = hasText(record.crop1);
  const primaryLevel = getConfidenceLevel(record.conf1);
  const secondaryCrops = [
    { name: record.crop2, level: getConfidenceLevel(record.conf2) },
    { name: record.crop3, level: getConfidenceLevel(record.conf3) },
  ].filter((c) => hasText(c.name));

  const hasSowDate = Boolean(record.cropStartDate);
  const hasHarvestDate = Boolean(record.cropEndDate);

  return (
    <div className="flex flex-col gap-4">
      {/* Crop identity card */}
      <div className="bg-white rounded-2xl p-3.5" style={{ border: `1px solid ${colorBorder}` }}>
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ background: hasPrimaryCrop ? colorPrimaryLight : '#F2F2F2' }}
          >
            <SowIcon size={21} stroke={hasPrimaryCrop ? colorPrimary : colorTextMuted} strokeWidth={1.8} />
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[15px] font-bold" style={{ color: hasPrimaryCrop ? colorTextPrimary : colorTextMuted }}>
                {hasPrimaryCrop ? record.crop1 : 'No crop detected'}
              </div>
              {hasPrimaryCrop && <ConfidenceBadge level={primaryLevel} />}
            </div>
            <div className="text-[11px] mt-[3px]" style={{ color: colorTextSecondary }}>
              {hasPrimaryCrop ? <>Primary crop &middot; {record.year}</> : `No crop identified for ${record.year}`}
            </div>
          </div>
        </div>

        {hasPrimaryCrop && secondaryCrops.length > 0 && (
          <>
            <div className="h-px my-3" style={{ background: colorPrimaryLight }} />
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: colorTextMuted }}>
              Also detected
            </div>
            <div className="flex gap-2 flex-wrap">
              {secondaryCrops.map((c) => (
                <SecondaryCropChip key={c.name} name={c.name} level={c.level} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sown / Harvested */}
      {!hasSowDate && !hasHarvestDate ? (
        <div
          className="bg-white rounded-2xl p-3.5 text-[12px] text-center"
          style={{ border: `1px solid ${colorBorder}`, color: colorTextMuted }}
        >
          No sowing or harvest dates recorded for {record.year}.
        </div>
      ) : (
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-2xl p-3" style={{ border: `1px solid ${colorBorder}` }}>
            <div className="flex items-center gap-2 mb-1.5">
              <SowIcon size={14} stroke={colorTextSecondary} />
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colorTextMuted }}>Sown</span>
            </div>
            <div className="text-[13px] font-bold" style={{ color: hasSowDate ? colorTextPrimary : colorTextMuted }}>
              {hasSowDate ? formatDate(record.cropStartDate) : 'No sowing date'}
            </div>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3" style={{ border: `1px solid ${colorBorder}` }}>
            <div className="flex items-center gap-2 mb-1.5">
              <HarvestIcon size={14} stroke={colorTextSecondary} strokeWidth={2} />
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colorTextMuted }}>Harvested</span>
            </div>
            <div className="text-[13px] font-bold" style={{ color: hasHarvestDate ? colorTextPrimary : colorTextMuted }}>
              {hasHarvestDate ? formatDate(record.cropEndDate) : hasSowDate ? 'Not yet harvested' : 'No harvest date'}
            </div>
          </div>
        </div>
      )}

      {/* Field & water balance */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: colorTextMuted }}>
          Field &amp; water balance
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Area" value={record.areaInHa?.toFixed(2) ?? '--'} unit="ha" />
          <StatTile label="MAI" value={record.maiAnnual?.toFixed(2) ?? '--'} />
          <StatTile label="AET" value={record.aetAnnual?.toFixed(0) ?? '--'} unit="mm" />
          <StatTile label="PET" value={record.petAnnual?.toFixed(0) ?? '--'} unit="mm" />
        </div>
      </div>

      <AgriTimeline
        agriYear={record.year}
        cropStartDate={record.cropStartDate}
        cropEndDate={record.cropEndDate}
      />
    </div>
  );
}
