import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { ExpandIcon } from '../../farmDetails/icons';
import {
  colorBorder, colorBorderSoft, colorSurface, colorInk, colorMuted,
  colorAreaLatest, colorAreaPrior, colorDataWarm,
  colorSeasonKharif, colorSeasonRabi, colorSeasonZaid, colorSeasonTrack,colorPrimaryHover
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

// Years run left to right; the last bar (the current year) is the only one
// drawn in the dark "latest" colour. The dashed line is the largest extent on
// record (area_ored) — never the max of just the 8 bars, which could be lower.
function SurfaceWaterAreaChart({ areas, areaOred }) {
  const maxValue = Math.max(areaOred ?? 0, ...areas.map((a) => a.value ?? 0), 0.01);
  const oredPct = areaOred !== null ? Math.min(100, (areaOred / maxValue) * 100) : null;

  return (
    <div className="relative h-[120px] mt-1" style={{ paddingTop: 4 }}>
      {oredPct !== null && (
        <div
          className="absolute left-0 right-0 border-t border-dashed"
          style={{ bottom: `${oredPct}%`, borderColor: colorDataWarm }}
        />
      )}
      <div className="absolute inset-0 flex items-end gap-1.5">
        {areas.map((a, i) => {
          const isLatest = i === areas.length - 1;
          const pct = a.value !== null ? Math.max(2, (a.value / maxValue) * 100) : 0;
          return (
            <div key={a.suffix} className="flex-1 flex flex-col items-center justify-end h-full" title={a.value !== null ? `${a.value.toFixed(2)} ha` : 'No data'}>
              <div
                className="w-full rounded-t"
                style={{ height: `${pct}%`, background: isLatest ? colorAreaLatest : colorAreaPrior, minHeight: a.value !== null ? 3 : 0 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NestedSeasonBar({ k, kr, krz }) {
  // Nested, not stacked — k >= kr >= krz by construction. Each band is drawn
  // from zero; later bands sit on top of (not after) the one before them. A
  // native title on each band means hovering the visible strip of any of
  // them (even where a narrower band sits on top) shows that band's own value.
  return (
    <div className="relative h-4 rounded-md overflow-hidden flex-1" style={{ background: colorSeasonTrack }}>
      {isValid(k) && (
        <div
          className="absolute inset-y-0 left-0 rounded-md"
          style={{ width: `${Math.min(100, k)}%`, background: colorSeasonKharif }}
          title={`Kharif: ${k.toFixed(1)}%`}
        />
      )}
      {isValid(kr) && (
        <div
          className="absolute inset-y-0 left-0 rounded-md"
          style={{ width: `${Math.min(100, kr)}%`, background: colorSeasonRabi }}
          title={`Through Rabi: ${kr.toFixed(1)}%`}
        />
      )}
      {isValid(krz) && (
        <div
          className="absolute inset-y-0 left-0 rounded-md"
          style={{ width: `${Math.min(100, krz)}%`, background: colorSeasonZaid }}
          title={`Through Zaid: ${krz.toFixed(1)}%`}
        />
      )}
    </div>
  );
}

function LegendChip({ color, label }) {
  return (
    <span className="flex items-center gap-1 text-[10px]" style={{ color: colorMuted }}>
      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

export default function WaterbodyTab({ waterbody }) {
  const p = waterbody?.properties ?? {};
  console.log(p)
  const uid = p.UID ?? waterbody?.id;
  const dashboardUrl = waterbody?.dashboardUrl;
  const mwsUid = p.MWS_UID;
  const sizeLabel = p.wbSizeCategory
    ? `${humanize(p.wbSizeCategory)}${p.category_sq_m ? ` · ${p.category_sq_m}` : ''}`
    : null;
  const position = positionLabel(p.wbCategory);
  const drainage = drainageLabel(p.wbDrainage);

  const areas = YEAR_SUFFIXES.map((suffix) => ({
    suffix,
    yearLabel: `20${suffix}`,
    value: isValid(p[`area_${suffix}`]) ? Number(p[`area_${suffix}`]) : null,
  }));
  const validAreas = areas.filter((a) => a.value !== null);
  const hasAreaSeries = validAreas.length > 0;
  const areaOred = isValid(p.area_ored) ? Number(p.area_ored) : null;
  const latest = areas[areas.length - 1];

  // Composed per plan §7: trend word from wbTrend, smallest year from a plain
  // min() lookup over the series actually present.
  const TREND_WORDS = { positive: 'up', negative: 'down' };
  const trendWord = p.wbTrend ? (TREND_WORDS[String(p.wbTrend).toLowerCase()] ?? 'steady') : null;
  const smallest = validAreas.length > 0
    ? validAreas.reduce((min, a) => (a.value < min.value ? a : min))
    : null;

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
        {dashboardUrl && (
          <button
            type="button"
            onClick={() => window.open(dashboardUrl, '_blank')}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold"
            style={{ border: `1px solid ${colorBorder}`, color: colorPrimaryHover }}
          >
            <ExternalLink size={14} />
            View Waterbody Profile
          </button>
        )}
      </div>

      {hasAreaSeries && (
        <section>
          <SectionHeading>Surface water area · 2017-18 to 2024-25</SectionHeading>
          <div className="rounded-xl p-3.5" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px]" style={{ color: colorMuted }}>{latest.yearLabel}</span>
              <span className="text-[20px] font-bold" style={{ color: colorInk }}>
                {latest.value !== null ? latest.value.toFixed(2) : '--'} <span className="text-[12px] font-medium" style={{ color: colorMuted }}>ha</span>
              </span>
            </div>

            <SurfaceWaterAreaChart areas={areas} areaOred={areaOred} />

            <div className="flex justify-between gap-1 text-[10px] mt-1" style={{ color: colorMuted }}>
              {areas.map((a) => <span key={a.suffix} className="flex-1 text-center">{a.suffix.split('-')[0]}</span>)}
            </div>

            {areaOred !== null && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-3 border-t border-dashed" style={{ borderColor: colorDataWarm }} />
                <span className="text-[10px]" style={{ color: colorMuted }}>Largest extent on record, {areaOred.toFixed(2)} ha</span>
              </div>
            )}

            {(trendWord || smallest) && (
              <p className="text-[12px] mt-2.5 pt-2.5" style={{ color: colorInk, borderTop: `1px solid ${colorBorderSoft}` }}>
                {trendWord && <>Area is trending <strong>{trendWord}</strong>. </>}
                {smallest && <>Smallest year was {smallest.suffix} at {smallest.value.toFixed(2)} ha.</>}
              </p>
            )}
          </div>
        </section>
      )}

      {hasSeasonRows && (
        <section>
          <SectionHeading>How long water holds</SectionHeading>
          <div className="rounded-xl p-3.5" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
            <div className="flex items-center gap-4 mb-2.5">
              <LegendChip color={colorSeasonKharif} label="Kharif" />
              <LegendChip color={colorSeasonRabi} label="+ Rabi" />
              <LegendChip color={colorSeasonZaid} label="+ Zaid" />
            </div>

            <div className="space-y-1.5">
              {seasonRows.map((r) => (
                <div key={r.suffix} className="flex items-center gap-2.5">
                  <span className="text-[11px] w-10 flex-shrink-0" style={{ color: colorMuted }}>{r.suffix}</span>
                  <NestedSeasonBar k={r.k} kr={r.kr} krz={r.krz} />
                  <span className="text-[11px] font-semibold w-9 text-right flex-shrink-0" style={{ color: colorInk }}>
                    {r.k !== null ? `${Math.round(r.k)}%` : '--'}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[11px] mt-2.5 pt-2.5 leading-snug" style={{ color: colorMuted, borderTop: `1px solid ${colorBorderSoft}` }}>
              Figures are the share held through each season, so each band sits inside the one before it.
              {zeroZaidYears.length > 0 && ` Held nothing through Zaid in ${zeroZaidYears.join(', ')}.`}
            </p>
          </div>
        </section>
      )}

      {mwsUid && (
        <p className="text-[11px] px-1" style={{ color: colorMuted }}>
          In micro-watershed {mwsUid}.
        </p>
      )}
    </div>
  );
}
