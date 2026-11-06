import { useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import SearchableList from '../SearchableList';
import { WhatThisPlaceIs, WaterSection, SoilSection, TreeCoverSection, FeaturesPressures } from './mwsSections';
import {
  colorPrimaryHover, colorPrimaryLight, colorInk, colorMuted, colorBorder, colorBorderSoft,
  colorSurface, colorSelected, colorSelectedBorder, colorUnselected, colorUnselectedBorder,
} from '../sidebarTokens';

const COLLAPSE_SELECTED_ABOVE = 10;

function Swatch({ selected }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
      style={{
        background: selected ? colorSelected : colorUnselected,
        border: `1px solid ${selected ? colorSelectedBorder : colorUnselectedBorder}`,
      }}
    />
  );
}

function Section({ title, count, action, children }) {
  return (
    <section className="rounded-xl p-3.5" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colorMuted }}>
          {title}{count !== undefined && <span> · {count}</span>}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function ActionLink({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="text-[12px] font-semibold" style={{ color: colorPrimaryHover }}>
      {children}
    </button>
  );
}

// `record` is the matching dataJson entry for the highlighted MWS; all values
// are passed in so this tab does not read Recoil directly.
export default function MwsTab({
  uid,
  record,
  selectedMws,
  intersectingVillages,
  onRemoveMws,
  onClearSelection,
  onReport,
  onViewSelection,
  onViewTable,
  buildVillageReportUrl,
}) {
  const [showAllSelected, setShowAllSelected] = useState(false);
  const selectedCount = selectedMws.length;
  const collapse = selectedCount > COLLAPSE_SELECTED_ABOVE && !showAllSelected;
  const showOverview = selectedCount === 1;

  return (
    <div className="space-y-4">
      {showOverview && (
        <>
          <WhatThisPlaceIs record={record} />
          <WaterSection record={record} />
          <SoilSection record={record} />
          <TreeCoverSection record={record} />
          <FeaturesPressures record={record} />

          <button
            type="button"
            onClick={() => onReport(uid)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold"
            style={{ border: `1px solid ${colorBorder}`, color: colorPrimaryHover }}
          >
            <ExternalLink size={14} />
            View Micro-Watershed Profile
          </button>
        </>
      )}

      {selectedCount > 1 && (
        <Section
          title="Selected micro-watersheds"
          action={onViewSelection && <ActionLink onClick={onViewSelection}>View selection</ActionLink>}
        >
          {collapse ? (
            <div className="rounded-xl p-3 space-y-2" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
              <p className="text-[12px]" style={{ color: colorInk }}>{selectedCount} selected, shown green on the map</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAllSelected(true)} className="text-[11px] font-semibold px-2.5 py-1 rounded-md" style={{ border: `1px solid ${colorBorder}`, color: colorPrimaryHover }}>
                  Show the list
                </button>
                <button type="button" onClick={onClearSelection} className="text-[11px] font-semibold px-2.5 py-1 rounded-md" style={{ border: `1px solid ${colorBorder}`, color: colorInk }}>
                  Clear selection
                </button>
              </div>
            </div>
          ) : (
            <SearchableList
              items={selectedMws}
              total={selectedCount}
              getLabel={(id) => String(id)}
              itemKey={(id) => String(id)}
              maxHeight={200}
              searchPlaceholder={`Find among ${selectedCount} micro-watersheds`}
              emptyText="No micro-watersheds selected."
              renderRow={(id) => (
                <div className="flex items-center justify-between gap-2 py-1.5">
                  <span className="flex items-center gap-2 min-w-0">
                    <Swatch selected />
                    <span className="text-[12px] truncate" style={{ color: colorInk }}>{String(id)}</span>
                    {showOverview && String(id) === String(uid) && (
                      <span className="text-[10px] font-semibold uppercase px-1.5 rounded-full" style={{ background: colorPrimaryLight, color: colorPrimaryHover }}>Showing</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <button type="button" onClick={() => onReport(id)} className="text-[11px] font-semibold" style={{ color: colorPrimaryHover }}>Profile</button>
                    <button type="button" onClick={() => onRemoveMws(id)} aria-label={`Remove ${id}`} className="p-0.5" style={{ color: colorMuted }}>
                      <X size={12} />
                    </button>
                  </span>
                </div>
              )}
            />
          )}
        </Section>
      )}

      <Section
        title="Villages in selection"
        count={intersectingVillages.length}
        action={onViewTable && <ActionLink onClick={onViewTable}>View table</ActionLink>}
      >
        <SearchableList
          items={intersectingVillages}
          total={intersectingVillages.length}
          getLabel={(v) => v.villageName || 'Unknown'}
          itemKey={(v) => String(v.villageId)}
          maxHeight={296}
          searchPlaceholder={`Find among ${intersectingVillages.length} villages`}
          emptyText="No villages intersect the selection."
          renderRow={(v, segments) => (
            <a
              href={buildVillageReportUrl(v.villageId)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 py-1.5 text-[12px]"
              style={{ color: colorInk, borderBottom: `1px solid ${colorBorderSoft}` }}
            >
              <span className="truncate">
                {segments.map((s, i) => (
                  <span key={i} style={s.match ? { background: colorPrimaryLight, fontWeight: 700 } : undefined}>{s.text}</span>
                ))}
              </span>
              <ExternalLink size={12} style={{ color: colorMuted, flexShrink: 0 }} aria-hidden="true" />
            </a>
          )}
        />
        <p className="text-[11px] mt-2" style={{ color: colorMuted }}>
          Sorted A–Z, scrolls inside this card. Each opens its village report in a new tab.
        </p>
      </Section>
    </div>
  );
}
