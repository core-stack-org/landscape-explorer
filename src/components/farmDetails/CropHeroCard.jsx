import { LeafIcon } from './icons';
import { formatDate, getConfidenceLevel, hasText, agriYearLabel } from './farmDetailsUtils';
import {
  colorPrimary, colorPrimaryLight, colorPrimaryMid, colorBorder, colorBorderSoft, colorSurface,
  colorInk, colorMuted, colorFaint, colorGood, colorWarn, colorBad,
} from './farmDetailsTokens';

const CONFIDENCE = {
  High: { dot: colorGood, text: colorGood, gloss: 'the model is sure about this crop' },
  Medium: { dot: colorWarn, text: colorMuted, gloss: 'the model is fairly sure about this crop' },
  Low: { dot: colorBad, text: colorBad, gloss: 'treat this crop as a guess' },
};

function daysBetween(start, end) {
  if (!start || !end) return null;
  return Math.round((end - start) / 86400000);
}

export default function CropHeroCard({ record, cycle, year }) {
  const hasCrop = hasText(record?.crop1);
  const level = getConfidenceLevel(record?.conf1);
  const conf = level ? CONFIDENCE[level] : null;
  const days = cycle?.days ?? null;

  return (
    <section className="rounded-2xl overflow-hidden" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="w-[46px] h-[46px] rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: hasCrop ? colorPrimaryLight : '#F2F2F2' }}
          >
            <LeafIcon size={22} stroke={hasCrop ? colorPrimary : colorFaint} />
          </div>
          <div className="min-w-0">
            <div className="text-[18px] font-bold leading-tight truncate" style={{ color: hasCrop ? colorInk : colorFaint }}>
              {hasCrop ? record.crop1.trim() : 'No crop detected'}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: colorMuted }}>
              {hasCrop ? `Grown here in ${agriYearLabel(year)}` : `Nothing grown here in ${agriYearLabel(year)}`}
            </div>
          </div>
        </div>

        {hasCrop && conf && (
          <div className="mt-3 flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: colorPrimaryLight }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: conf.dot }} />
            <span className="text-[11px] font-semibold" style={{ color: conf.text }}>{level}</span>
            <span className="text-[11px]" style={{ color: colorMuted }}>— {conf.gloss}</span>
          </div>
        )}
      </div>

      {hasCrop && (
        <div className="px-4 pb-4 pt-3" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colorFaint }}>Sown</div>
              <div className="text-[13px] font-bold mt-0.5" style={{ color: colorInk }}>{formatDate(record.cropStartDate)}</div>
            </div>
            <div className="flex flex-col items-center flex-1">
              <div className="text-[11px] font-semibold" style={{ color: colorInk }}>
                {days !== null ? `${days} days` : '—'}
              </div>
              <div className="w-[30px] h-[2px] mt-1 rounded" style={{ background: colorPrimaryMid }} />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colorFaint }}>Harvested</div>
              <div className="text-[13px] font-bold mt-0.5" style={{ color: colorInk }}>{formatDate(record.cropEndDate)}</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
