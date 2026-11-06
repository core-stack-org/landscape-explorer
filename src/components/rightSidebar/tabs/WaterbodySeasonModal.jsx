import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '../../farmDetails/icons';
import { SeasonGroupedBarChart, LegendChip } from './WaterbodyTab';
import {
  colorBorder, colorBorderSoft, colorSurface, colorPageBg, colorInk, colorMuted,
  colorSeasonKharif, colorSeasonRabi, colorSeasonZaid,
} from '../sidebarTokens';

export default function WaterbodySeasonModal({ open, onClose, rows, uid, zeroZaidYears }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(35,35,35,0.5)' }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="waterbody-season-title"
        tabIndex={-1}
        className="w-full max-w-[720px] max-h-[90vh] flex flex-col rounded-[18px] overflow-hidden outline-none"
        style={{ background: colorPageBg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ background: colorSurface, borderBottom: `1px solid ${colorBorder}` }}>
          <div className="min-w-0">
            <h2 id="waterbody-season-title" className="text-[20px] font-bold" style={{ color: colorInk }}>Seasonal water availability</h2>
            <p className="text-[12px] mt-0.5" style={{ color: colorMuted }}>Waterbody {uid || '--'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close seasonal water availability"
            className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0"
            style={{ color: colorMuted }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <section className="rounded-2xl p-4" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
            <p className="text-[12px] mb-2.5" style={{ color: colorMuted }}>
              Percentage of water availability · {rows[0]?.suffix.replace('-', '–')} to {rows[rows.length - 1]?.suffix.replace('-', '–')}
            </p>
            <div className="flex items-center gap-4 mb-2.5 flex-wrap">
              <LegendChip color={colorSeasonKharif} label="Kharif" />
              <LegendChip color={colorSeasonRabi} label="Kharif + Rabi" />
              <LegendChip color={colorSeasonZaid} label="Kharif + Rabi + Zaid" />
            </div>

            <SeasonGroupedBarChart rows={rows} />

            <p className="text-[11px] mt-2.5 pt-2.5 leading-snug" style={{ color: colorMuted, borderTop: `1px solid ${colorBorderSoft}` }}>
              Each bar is the share of water available through that season group, so Kharif + Rabi + Zaid can never exceed Kharif + Rabi.
              {zeroZaidYears.length > 0 && ` Held nothing through Zaid in ${zeroZaidYears.join(', ')}.`}
            </p>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
