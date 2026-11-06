import { ChevronRight } from 'lucide-react';
import SearchableList from '../SearchableList';
import {
  colorBorder, colorBorderSoft, colorSurface, colorInk, colorMuted, colorPrimaryLight,
} from '../sidebarTokens';

// Shown in the Village tab whenever an MWS is selected but no specific
// village has been picked yet — village has no click interaction of its own
// any more, so this list (not the map) is how a village gets chosen. Covers
// every currently-selected MWS, not just the most recently clicked one, so
// the count/copy adapts to a single vs. a multi-MWS selection.
export default function VillageListPanel({ villages = [], onSelectVillage, selectedMwsCount = 0, mwsUid }) {
  const heading = selectedMwsCount > 1
    ? `Villages across ${selectedMwsCount} selected micro-watersheds`
    : 'Villages in this micro-watershed';
  const subtitle = selectedMwsCount > 1
    ? 'Pick a village below to see its data.'
    : `Pick a village below to see its data${mwsUid ? ` for ${mwsUid}` : ''}.`;

  return (
    <section className="rounded-xl p-3.5" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: colorMuted }}>
        {heading}{villages.length > 0 ? ` · ${villages.length}` : ''}
      </h3>
      <p className="text-[12px] mb-2.5" style={{ color: colorMuted }}>
        {subtitle}
      </p>

      <SearchableList
        items={villages}
        total={villages.length}
        getLabel={(v) => v.villageName || 'Unknown'}
        itemKey={(v) => String(v.villageId)}
        maxHeight={360}
        searchPlaceholder={`Find among ${villages.length} villages`}
        emptyText="No villages intersect the selected micro-watershed(s)."
        renderRow={(v, segments) => (
          <button
            type="button"
            onClick={() => onSelectVillage?.(v.villageId)}
            className="w-full flex items-center justify-between gap-2 py-1.5 text-[12px] text-left hover:bg-gray-50"
            style={{ color: colorInk, borderBottom: `1px solid ${colorBorderSoft}` }}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="truncate">
                {segments.map((s, i) => (
                  <span key={i} style={s.match ? { background: colorPrimaryLight, fontWeight: 700 } : undefined}>{s.text}</span>
                ))}
              </span>
              <span className="text-[10px] flex-shrink-0" style={{ color: colorMuted }}>{v.villageId}</span>
            </span>
            <ChevronRight size={14} style={{ color: colorMuted, flexShrink: 0 }} aria-hidden="true" />
          </button>
        )}
      />
    </section>
  );
}
