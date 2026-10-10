import { ChevronIcon } from '../farmDetails/icons';
import { colorSelected, colorSelectedBorder, colorInk, colorMuted, colorBorder, colorSurface } from './sidebarTokens';

// The header names the place, not the type, so it does not change between tabs.
export default function DetailHeader({ placeName, mwsId, onBack }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-3" style={{ background: colorSurface, borderBottom: `1px solid ${colorBorder}` }}>
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to location and layers"
        className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-gray-50"
        style={{ border: `1px solid ${colorBorder}`, color: colorInk }}
      >
        <ChevronIcon size={14} direction="left" stroke={colorInk} strokeWidth={2.2} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold leading-tight truncate" style={{ color: colorInk }}>{placeName}</div>
        <div className="flex items-center gap-1.5 text-[11px] mt-0.5" style={{ color: colorMuted }}>
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ background: colorSelected, border: `1px solid ${colorSelectedBorder}` }}
            aria-hidden="true"
          />
          {mwsId ? <span className="truncate">{mwsId}</span> : null}
          <span>· selected on map</span>
        </div>
      </div>
    </div>
  );
}
