import { ExternalLink } from 'lucide-react';
import { colorBorder, colorBorderSoft, colorSurface, colorInk, colorMuted, colorPageBg, colorPrimary, colorPrimaryHover } from '../sidebarTokens';

// Field names come from the live waterbody feature properties (kyl_waterbodypanel.jsx).
function Tile({ label, value }) {
  return (
    <div className="rounded-xl px-3 py-2.5 flex-1" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <div className="text-[11px]" style={{ color: colorMuted }}>{label}</div>
      <div className="text-[15px] font-bold mt-0.5" style={{ color: colorInk }}>{value}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
      <span className="text-[12px]" style={{ color: colorMuted }}>{label}</span>
      <span className="text-[12px] font-semibold text-right" style={{ color: colorInk }}>{value}</span>
    </div>
  );
}

export default function WaterbodyTab({ waterbody }) {
  const p = waterbody?.properties ?? {};
  const extent = Number(p.area_ored);
  const order = p.max_stream_order;
  const onLine = p.on_drainage_line === 1 ? 'On drainage line' : 'Off drainage line';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#E0F3F8' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1769A8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold" style={{ color: colorInk }}>Waterbody</div>
          <div className="text-[11px] truncate break-words" style={{ color: colorMuted }}>{waterbody?.id || '--'}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Tile label="Extent" value={Number.isFinite(extent) ? `${extent.toFixed(2)} ha` : '--'} />
        <Tile label="Stream order" value={order ?? '--'} />
      </div>

      <div className="rounded-xl px-3" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
        <Row label="River" value={p.waterbody_type === 'river' ? (p.waterbody_type_name || '--') : '--'} />
        <Row label="Position" value={onLine} />
      </div>

      <p className="text-[12px] leading-snug rounded-xl px-3 py-2.5" style={{ color: colorMuted, background: colorPageBg }}>
        Stream order describes how large a stream is — a higher number means more tributaries feed into it.
      </p>

      {waterbody?.dashboardUrl && (
        <button
          type="button"
          onClick={() => window.open(waterbody.dashboardUrl, '_blank')}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold"
          style={{ border: `1px solid ${colorBorder}`, color: colorPrimaryHover }}
        >
          <ExternalLink size={14} />
          View Waterbody Profile
        </button>
      )}
    </div>
  );
}
