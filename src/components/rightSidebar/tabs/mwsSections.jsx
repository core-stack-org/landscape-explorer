import { findBin, bandWord, bandCaption, severityColor, isValid } from '../mwsFieldMaps.js';
import {
  colorInk, colorMuted, colorBorder, colorBorderSoft, colorSurface, colorPageBg, colorTrack,
  colorDataWarm, colorDataCool, colorWater,
} from '../sidebarTokens';

const FOREST_COLOR = '#1B6A00';
const CROP_COLOR = colorDataWarm;
const SHRUB_COLOR = '#8D8D6B';
const OTHER_COLOR = '#C9C3B8';

function Card({ title, suffix, children }) {
  return (
    <section className="rounded-xl p-3.5 space-y-2.5" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colorMuted }}>
        {title}{suffix && <span className="normal-case font-medium"> · {suffix}</span>}
      </h3>
      {children}
    </section>
  );
}

function Tile({ label, value, band }) {
  return (
    <div className="rounded-xl px-3 py-2 flex-1" style={{ background: colorPageBg }}>
      <div className="text-[11px]" style={{ color: colorMuted }}>{label}</div>
      <div className="text-[15px] font-bold mt-0.5" style={{ color: colorInk }}>{value}</div>
      {band && <div className="text-[10px] mt-0.5" style={{ color: colorMuted }}>{band}</div>}
    </div>
  );
}

function Row({ label, value, dotColor }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
      <span className="text-[12px]" style={{ color: colorMuted }}>{label}</span>
      <span className="text-[12px] font-semibold text-right flex items-center gap-1.5 justify-end" style={{ color: colorInk }}>
        {dotColor && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />}
        {value}
      </span>
    </div>
  );
}

// 100%-stacked bar with a direct label under every segment — colour is
// reinforcement only, never the sole channel (kyl-sidebar plan §6).
function StackedBar({ segments }) {
  const shown = segments.filter((s) => s.value > 0.05);
  if (shown.length === 0) return null;
  return (
    <div>
      <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ background: colorBorderSoft }}>
        {shown.map((s) => <div key={s.label} style={{ width: `${s.value}%`, background: s.color }} />)}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
        {shown.map((s) => (
          <span key={s.label} className="flex items-center gap-1 text-[10px]" style={{ color: colorMuted }}>
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            {s.label} {s.value.toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}

// A single labelled horizontal bar, 0-100.
function PercentBar({ label, value, band }) {
  const pct = isValid(value) ? Math.min(100, Math.max(0, Number(value))) : null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px]" style={{ color: colorMuted }}>{label}</span>
        <span className="text-[11px] font-semibold" style={{ color: colorInk }}>
          {pct !== null ? `${pct.toFixed(0)}%` : '--'}{band ? ` · ${band}` : ''}
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: colorBorderSoft }}>
        {pct !== null && <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colorWater }} />}
      </div>
    </div>
  );
}

function fmt(v, digits = 0) {
  return isValid(v) ? Number(v).toFixed(digits) : null;
}

// ── 3.2 What this place is ─────────────────────────────────────────────────
// Chart legend says "Tree cover" (matches the mockup); the composed prose
// below still says "forest-dominated", since that's the natural-language word.
const COVER_FIELDS = [
  { key: 'lulc_forest_percent', label: 'Tree cover', word: 'Forest-dominated', color: FOREST_COLOR },
  { key: 'lulc_crop_percent', label: 'Cropland', word: 'Cropland-dominated', color: CROP_COLOR },
  { key: 'lulc_shrub_percent', label: 'Shrub', word: 'Shrub-dominated', color: SHRUB_COLOR },
];

export function WhatThisPlaceIs({ record }) {
  if (!record) return null;

  const coverValues = COVER_FIELDS.map((f) => ({ ...f, value: isValid(record[f.key]) ? Number(record[f.key]) : 0 }));
  const coverSum = coverValues.reduce((sum, f) => sum + f.value, 0);
  const hasCover = coverValues.some((f) => isValid(record[f.key]));
  const otherValue = hasCover ? Math.max(0, 100 - coverSum) : 0;
  const segments = hasCover ? [...coverValues, { label: 'Other', value: otherValue, color: OTHER_COLOR }] : [];

  const terrainLabel = findBin('terrainCluster_ID', record.terrainCluster_ID)?.label
    || record.lulc_slope_category || record.lulc_plain_category || null;

  return (
    <Card title="What this place is">
      <StackedBar segments={segments} />
      <div>
        <Row label="Terrain" value={terrainLabel || '--'} />
        {/* No confirmed band source for mean_elevation (relative_mean_elevation's
            bins are a different, smaller-range quantity) — shown as a plain value. */}
        <Row label="Mean elevation" value={isValid(record.mean_elevation) ? `${fmt(record.mean_elevation)} m` : '--'} />
        <Row label="Cropping intensity (2017–24)" value={isValid(record.cropping_intensity_avg) ? fmt(record.cropping_intensity_avg, 2) : '--'} />
      </div>
    </Card>
  );
}

// ── 3.3 Water ───────────────────────────────────────────────────────────────
export function WaterSection({ record }) {
  if (!record) return null;

  const rainfallCaption = bandCaption('avg_precipitation', record.avg_precipitation);
  const runoffCaption = bandCaption('avg_runoff', record.avg_runoff);

  const hasWaterBalance = isValid(record.mean_annual_delta_g_mm);
  const waterBalancePositive = hasWaterBalance && Number(record.mean_annual_delta_g_mm) >= 0;
  const waterBalance = hasWaterBalance
    ? `${waterBalancePositive ? '+' : ''}${fmt(record.mean_annual_delta_g_mm)} mm/yr`
    : '--';

  const sogeLabel = findBin('soge_class', record.soge_class)?.label || '--';
  const aquiferLabel = findBin('aquifer_class', record.aquifer_class)?.label || '--';
  const droughtLabel = findBin('drought_category', record.drought_category)?.label || '--';
  const sogeColor = severityColor('soge_class', record.soge_class);
  const droughtColor = severityColor('drought_category', record.drought_category);

  const hasSurfaceWater = [
    record.avg_kharif_surface_water_mws,
    record.avg_rabi_surface_water_mws,
    record.avg_zaid_surface_water_mws,
  ].some(isValid);

  return (
    <Card title="Water">
      <div className="flex gap-2">
        <Tile label="Rainfall" value={isValid(record.avg_precipitation) ? `${fmt(record.avg_precipitation)} mm` : '--'} band={rainfallCaption ? `${rainfallCaption} band` : null} />
        <Tile label="Runoff" value={isValid(record.avg_runoff) ? `${fmt(record.avg_runoff)} mm` : '--'} band={runoffCaption ? `${runoffCaption} band` : null} />
      </div>

      {hasSurfaceWater && (
        <div className="pt-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: colorMuted }}>
            Surface water held through year · 2017–24
          </div>
          <div className="space-y-2">
            <PercentBar label="Kharif" value={record.avg_kharif_surface_water_mws} />
            <PercentBar label="Rabi" value={record.avg_rabi_surface_water_mws} />
            <PercentBar label="Zaid" value={record.avg_zaid_surface_water_mws} />
          </div>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${colorBorderSoft}` }} />

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: colorMuted }}>
          Water balance (2017–24)
        </div>
        <div className="text-[18px] font-bold flex items-center gap-1.5" style={{ color: colorInk }}>
          {hasWaterBalance && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={waterBalancePositive ? FOREST_COLOR : colorDataWarm} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {waterBalancePositive ? <path d="M3 17l6-6 4 4 8-8M15 7h6v6" /> : <path d="M3 7l6 6 4-4 8 8M15 17h6v-6" />}
            </svg>
          )}
          {waterBalance}
        </div>
      </div>

      <div>
        <Row label="SOGE" value={sogeLabel} dotColor={sogeColor} />
        <Row label="Aquifer" value={aquiferLabel} />
        <Row label="Drought years since 2017" value={droughtLabel} dotColor={droughtColor} />
      </div>
    </Card>
  );
}

// ── 3.4 Soil ─────────────────────────────────────────────────────────────────
// Values shown as-is, straight off the record — no assumed scale or gauge,
// per direction: the bins (and so the band word) are real; a slider position
// would imply a min/max domain nothing here actually confirms.
const NUTRIENT_FIELDS = [
  { key: 'nitrogen_levels', label: 'Nitrogen', unit: 'kg/ha' },
  { key: 'phosphoros_levels', label: 'Phosphorus', unit: 'kg/ha' },
  { key: 'potassium_levels', label: 'Potassium', unit: 'kg/ha' },
  { key: 'organic_carbon', label: 'Organic carbon', unit: '%' },
];

export function SoilSection({ record }) {
  if (!record) return null;

  const nutrients = NUTRIENT_FIELDS.map((f) => ({
    ...f,
    value: isValid(record[f.key]) ? Number(record[f.key]) : null,
    band: bandWord(f.key, record[f.key]),
  }));
  const hasNutrients = nutrients.some((n) => n.value !== null);
  const bandsPresent = nutrients.filter((n) => n.band).map((n) => n.band);
  const uniformBand = bandsPresent.length === NUTRIENT_FIELDS.length && new Set(bandsPresent).size === 1
    ? bandsPresent[0]
    : null;

  const phBand = bandWord('soil_ph', record.soil_ph);
  const textureLabel = bandWord('soil_texture', record.soil_texture);
  const drainageLabel = bandWord('soil_drainage', record.soil_drainage);
  const hasPhLine = phBand || textureLabel || drainageLabel;

  if (!hasNutrients && !hasPhLine) return null;

  return (
    <Card title="Soil">
      {hasNutrients && (
        <div>
          {nutrients.map((n) => (
            <Row
              key={n.key}
              label={n.label}
              value={n.value !== null ? `${n.value} ${n.unit}${n.band ? ` · ${n.band.toLowerCase()}` : ''}` : '--'}
            />
          ))}
        </div>
      )}

      {hasPhLine && (
        <p className="text-[12px] pt-1.5" style={{ color: colorInk, borderTop: `1px solid ${colorBorderSoft}` }}>
          {isValid(record.soil_ph) && `pH ` }
          <span className='font-bold'>{fmt(record.soil_ph, 1)}</span>
          {` , ${phBand?.toLowerCase()} · `}
          <span className='font-bold'>{textureLabel?.toLowerCase()}</span>
          {` · `}
          <span className='font-bold'>{drainageLabel?.toLowerCase()}</span>
        </p>
      )}

      {uniformBand && (
        <p className="text-[11px]" style={{ color: colorMuted }}>
          All four nutrients sit in the {uniformBand.toLowerCase()} band.
        </p>
      )}
    </Card>
  );
}

// ── 3.5 Tree cover ───────────────────────────────────────────────────────────
export function TreeCoverSection({ record }) {
  if (!record) return null;

  const hasGainLoss = isValid(record.increase_in_tree_cover) || isValid(record.decrease_in_tree_cover);
  const fringeLoss = record.trees_in_forest_fringe_loss;
  const toFarms = record.forest_to_farm;
  const canopyReductionBand = bandWord('reduction_canopy_density_height', record.reduction_canopy_density_height);
  const hasRows = isValid(fringeLoss) || isValid(toFarms) || isValid(record.reduction_canopy_density_height);

  if (!hasGainLoss && !hasRows) return null;

  const gain = isValid(record.increase_in_tree_cover) ? Number(record.increase_in_tree_cover) : 0;
  const loss = isValid(record.decrease_in_tree_cover) ? Number(record.decrease_in_tree_cover) : 0;
  const gainLossMax = Math.max(gain, loss, 1);

  return (
    <Card title="Tree cover" suffix="2017–24">
      {hasGainLoss && (
        <div className="space-y-2">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[11px]" style={{ color: colorMuted }}>Gained</span>
              <span className="text-[11px] font-semibold" style={{ color: colorInk }}>{isValid(record.increase_in_tree_cover) ? `+${fmt(record.increase_in_tree_cover)} ha` : '--'}</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: colorBorderSoft }}>
              <div className="h-full rounded-full" style={{ width: `${(gain / gainLossMax) * 100}%`, background: colorDataCool }} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[11px]" style={{ color: colorMuted }}>Lost</span>
              <span className="text-[11px] font-semibold" style={{ color: colorInk }}>{isValid(record.decrease_in_tree_cover) ? `−${fmt(record.decrease_in_tree_cover)} ha` : '--'}</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: colorBorderSoft }}>
              <div className="h-full rounded-full" style={{ width: `${(loss / gainLossMax) * 100}%`, background: colorDataWarm }} />
            </div>
          </div>
        </div>
      )}

      {hasRows && (
        <div>
          <Row label="Tree cover reduction across forest fringes" value={isValid(fringeLoss) ? `${fmt(fringeLoss)} ha` : '--'} />
          <Row label="Tree cover degraded to farms" value={isValid(toFarms) ? `${fmt(toFarms)} ha` : '--'} />
          <Row
            label="Reduction in canopy density and height"
            value={isValid(record.reduction_canopy_density_height) ? `${fmt(record.reduction_canopy_density_height)}%${canopyReductionBand ? ` · ${canopyReductionBand.toLowerCase()}` : ''}` : '--'}
          />
        </div>
      )}
    </Card>
  );
}

// ── 3.6 Features & pressures ─────────────────────────────────────────────────
function Chip({ label, present }) {
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{
        background: present ? '#DCFCE7' : colorTrack,
        color: present ? '#166534' : colorMuted,
      }}
    >
      {label}
    </span>
  );
}

// present/absent each get their own copy (not one label + two chip styles) —
// "River present" is the one example the mockup confirms; the rest follow
// that same pattern until told otherwise.
const PRESSURE_FIELDS = [
  { key: 'river_available', kind: 'bool', present: 'River present', absent: 'No river' },
  { key: 'canal_available', kind: 'bool', present: 'Canal present', absent: 'No canal' },
  { key: 'mining', kind: 'count', present: 'Mining present', absent: 'No mining' },
  { key: 'lcw_conflict', kind: 'count', present: 'Land conflicts present', absent: 'No land conflicts' },
  { key: 'factory_csr', kind: 'count', present: 'Industry present', absent: 'No industry' },
  { key: 'green_credit', kind: 'count', present: 'Green credits present', absent: 'No green credits' },
];

export function FeaturesPressures({ record }) {
  if (!record) return null;

  const evaluated = PRESSURE_FIELDS
    .filter((f) => record[f.key] !== undefined && record[f.key] !== null)
    .map((f) => ({
      ...f,
      isPresent: f.kind === 'bool' ? Boolean(record[f.key]) : Number(record[f.key]) > 0,
    }));
  if (evaluated.length === 0) return null;

  return (
    <Card title="Features & pressures">
      <div className="flex flex-wrap gap-1.5">
        {evaluated.map((f) => (
          <Chip key={f.key} label={f.isPresent ? f.present : f.absent} present={f.isPresent} />
        ))}
      </div>
    </Card>
  );
}
