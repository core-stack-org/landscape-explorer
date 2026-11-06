import { useEffect, useState } from 'react';
import { ExpandIcon } from '../../farmDetails/icons';
import WaterbodySeasonModal from './WaterbodySeasonModal';
import {
  colorBorder, colorBorderSoft, colorSurface, colorInk, colorMuted,
  colorSeasonKharif, colorSeasonRabi, colorSeasonZaid,
} from '../sidebarTokens';

// Field names come straight off the live waterbody vector-tile feature,
// confirmed against record 12_356033_125 — kyl-sidebar-plan.md §5. The old
// card (stream order, river name, a single extent) is gone: none of those
// keys exist in the record.
const YEAR_SUFFIXES = ['17-18', '18-19', '19-20', '20-21', '21-22', '22-23', '23-24', '24-25'];

function isValid(v) {
  return v !== null && v !== undefined && Number.isFinite(Number(v));
}

// wbCategory/wbDrainage/wbSizeCategory are enums where only one value each has
// been seen in a live record (plan §10.2). Known values get their confirmed
// copy; anything else falls back to a humanized version of the raw value
// rather than guessing more label text.
function humanize(raw) {
  if (!raw) return null;
  const spaced = String(raw).replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

const POSITION_LABELS = { onriver: 'On river', offriver: 'Off river' };
function positionLabel(wbCategory) {
  if (!wbCategory) return null;
  return POSITION_LABELS[String(wbCategory).toLowerCase()] ?? humanize(wbCategory);
}

const DRAINAGE_LABELS = { ondrainage: 'On the drainage line', offdrainage: 'Off the drainage line' };
function drainageLabel(wbDrainage) {
  if (!wbDrainage) return null;
  return DRAINAGE_LABELS[String(wbDrainage).toLowerCase()] ?? humanize(wbDrainage);
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
      <span className="text-[12px]" style={{ color: colorMuted }}>{label}</span>
      <span className="text-[12px] font-semibold text-right" style={{ color: colorInk }}>{value}</span>
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: colorMuted }}>
      {children}
    </div>
  );
}

// Grouped (not nested/stacked) bars: each year gets 3 bars side by side —
// Kharif, Kharif+Rabi, Kharif+Rabi+Zaid — each plotted at its own height on a
// shared 0-100% scale, so a season held nothing (e.g. Zaid in 22-23) draws as
// a near-invisible sliver rather than disappearing into a stack.
export function SeasonGroupedBarChart({ rows }) {
  return (
    <div className="flex">
      <div className="flex flex-col justify-between text-[10px] pr-1.5 h-[140px] pb-5" style={{ color: colorMuted }}>
        <span>100%</span>
        <span>50%</span>
        <span>0%</span>
      </div>
      <div className="flex-1 flex items-end gap-2 h-[140px] border-l" style={{ borderColor: colorBorderSoft }}>
        {rows.map((r) => (
          <div key={r.suffix} className="flex-1 flex flex-col items-center">
            <div className="w-full flex items-end justify-center gap-[2px] h-[120px]">
              {[
                { value: r.k, color: colorSeasonKharif, label: 'Kharif' },
                { value: r.kr, color: colorSeasonRabi, label: 'Kharif + Rabi' },
                { value: r.krz, color: colorSeasonZaid, label: 'Kharif + Rabi + Zaid' },
              ].map((band) => (
                <div
                  key={band.label}
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${isValid(band.value) ? Math.max(band.value > 0 ? 2 : 0, band.value) : 0}%`,
                    background: band.color,
                  }}
                  title={isValid(band.value) ? `${band.label}: ${band.value.toFixed(1)}%` : `${band.label}: no data`}
                />
              ))}
            </div>
            <span className="text-[10px] mt-1" style={{ color: colorMuted }}>{r.suffix.replace('-', '–')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LegendChip({ color, label }) {
  return (
    <span className="flex items-center gap-1 text-[10px]" style={{ color: colorMuted }}>
      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

export default function WaterbodyTab({ waterbody }) {
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const p = waterbody?.properties ?? {};
  const uid = p.UID ?? waterbody?.id;

  useEffect(() => {
    setSeasonModalOpen(false);
  }, [uid]);
  const mwsUid = p.MWS_UID;
  const sizeLabel = p.wbSizeCategory
    ? `${humanize(p.wbSizeCategory)}${p.category_sq_m ? ` · ${p.category_sq_m}` : ''}`
    : null;
  const position = positionLabel(p.wbCategory);
  const drainage = drainageLabel(p.wbDrainage);

  // k_YY/kr_YY/krz_YY are already 0-100 (e.g. k=93.33, kr=78.67, krz=2) — not
  // 0-1 shares, so no scaling. Each is the % of water still present going
  // into that season: k = end of Kharif, kr = end of Rabi, krz = end of Zaid,
  // each necessarily <= the one before it within the same agri year.
  const seasonRows = YEAR_SUFFIXES.map((suffix) => ({
    suffix,
    k: isValid(p[`k_${suffix}`]) ? Number(p[`k_${suffix}`]) : null,
    kr: isValid(p[`kr_${suffix}`]) ? Number(p[`kr_${suffix}`]) : null,
    krz: isValid(p[`krz_${suffix}`]) ? Number(p[`krz_${suffix}`]) : null,
  }));
  const hasSeasonRows = seasonRows.some((r) => r.k !== null || r.kr !== null || r.krz !== null);
  const zeroZaidYears = seasonRows.filter((r) => r.krz === 0).map((r) => r.suffix);
  const recentSeasonRows = seasonRows.slice(-4);

  return (
    <div className="space-y-3.5">
      <div className="rounded-xl p-3.5 space-y-2.5" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#E0F3F8' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1769A8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold" style={{ color: colorInk }}>Waterbody</div>
            <div className="text-[11px] truncate break-words" style={{ color: colorMuted }}>{uid || '--'}</div>
          </div>
        </div>

        <div>
          {sizeLabel && <Row label="Size" value={sizeLabel} />}
          {position && <Row label="Position" value={position} />}
          {drainage && <Row label="Drainage" value={drainage} />}
        </div>
      </div>

      {hasSeasonRows && (
        <section>
          <SectionHeading>Seasonal water availability</SectionHeading>
          <div className="rounded-xl p-3.5" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <p className="text-[12px]" style={{ color: colorMuted }}>
                Percentage of water availability · {recentSeasonRows[0].suffix.replace('-', '–')} to {recentSeasonRows[recentSeasonRows.length - 1].suffix.replace('-', '–')}
              </p>
              <button
                type="button"
                onClick={() => setSeasonModalOpen(true)}
                aria-label="Open all years of seasonal water availability"
                className="w-[28px] h-[28px] rounded-lg flex items-center justify-center hover:bg-gray-50 flex-shrink-0"
                style={{ border: `1px solid ${colorBorder}`, color: colorInk }}
              >
                <ExpandIcon size={13} />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-2.5 flex-wrap">
              <LegendChip color={colorSeasonKharif} label="Kharif" />
              <LegendChip color={colorSeasonRabi} label="Kharif + Rabi" />
              <LegendChip color={colorSeasonZaid} label="Kharif + Rabi + Zaid" />
            </div>

            <SeasonGroupedBarChart rows={recentSeasonRows} />

            <p className="text-[11px] mt-2.5 pt-2.5 leading-snug" style={{ color: colorMuted, borderTop: `1px solid ${colorBorderSoft}` }}>
              Each bar is the share of water available through that season group, so Kharif + Rabi + Zaid can never exceed Kharif + Rabi.
              {zeroZaidYears.length > 0 && ` Held nothing through Zaid in ${zeroZaidYears.join(', ')}.`}
            </p>
          </div>
        </section>
      )}

      <WaterbodySeasonModal
        open={seasonModalOpen}
        onClose={() => setSeasonModalOpen(false)}
        rows={seasonRows}
        uid={uid}
        zeroZaidYears={zeroZaidYears}
      />

      {mwsUid && (
        <p className="text-[11px] px-1" style={{ color: colorMuted }}>
          In micro-watershed {mwsUid}.
        </p>
      )}
    </div>
  );
}
