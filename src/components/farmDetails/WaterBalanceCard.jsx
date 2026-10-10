import { waterBalanceSummary } from './farmDetailsUtils';
import {
  colorPrimary, colorPrimaryLight, colorBorder, colorBorderSoft, colorSurface,
  colorInk, colorMuted, colorFaint,
} from './farmDetailsTokens';

function MoistureScale({ mai }) {
  const pct = Math.max(0, Math.min(1, mai)) * 100;
  return (
    <div className="relative h-[16px] mt-1.5">
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] rounded" style={{ background: colorPrimaryLight }} />
      <div className="absolute top-0 bottom-0 w-px" style={{ left: '50%', background: colorFaint }} />
      <div
        className="absolute top-1/2 w-[16px] h-[16px] rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-white"
        style={{ left: `${pct}%`, background: colorPrimary }}
      />
    </div>
  );
}

export default function WaterBalanceCard({ record }) {
  const s = waterBalanceSummary(record);
  const hasData = s.percentUsed !== null;
  const reading = s.mai === null
    ? 'No soil moisture reading for this year.'
    : s.mai < 0.5
      ? 'Below the 0.5 dry mark: dry for much of the year.'
      : 'Comfortably above the 0.5 dry mark.';

  return (
    <section className="rounded-2xl p-4" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      {hasData ? (
        <>
          <p className="text-[17px] leading-snug font-medium" style={{ color: colorInk }}>
            The crop received{' '}
            <strong style={{ color: colorPrimary }}>{s.percentUsed}%</strong> of the water it needed.
          </p>
          <p className="text-[12px] mt-1" style={{ color: colorMuted }}>A shortfall of {s.shortfall} mm over the season.</p>
          <div className="mt-2.5 relative h-[10px] rounded-full" style={{ background: colorPrimaryLight }}>
            <div className="absolute left-0 top-0 bottom-0 rounded-full" style={{ width: `${Math.min(100, s.percentUsed)}%`, background: colorPrimary }} />
          </div>
          <div className="flex justify-between mt-1 text-[10px]" style={{ color: colorMuted }}>
            <span>AET {Math.round(s.aet)} mm</span>
            <span>PET {Math.round(s.pet)} mm</span>
          </div>
        </>
      ) : (
        <p className="text-[12px]" style={{ color: colorMuted }}>Water use is unavailable for this year.</p>
      )}

      <div className="mt-3.5 pt-3" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colorMuted }} title="Mean annual soil moisture index, 0 to 1">
            Soil moisture (MAI) ⓘ
          </span>
          <span className="text-[13px] font-bold" style={{ color: colorInk }}>{s.mai !== null ? s.mai.toFixed(2) : '--'}</span>
        </div>
        <p className="text-[11px] mt-1" style={{ color: colorMuted }}>{reading}</p>
        {s.mai !== null && <MoistureScale mai={s.mai} />}
        <div className="flex justify-between text-[10px] mt-0.5" style={{ color: colorMuted }}>
          <span>0 · dry</span><span>0.5</span><span>1 · ample</span>
        </div>
      </div>
    </section>
  );
}
