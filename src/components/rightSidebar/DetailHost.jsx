import DetailHeader from './DetailHeader';
import TabStrip from './TabStrip';
import { deriveTabs, shouldShowTabStrip, nextActiveTab, missingLayerTypes, TAB_LABELS } from './tabRules';
import { colorPageBg, colorMuted, colorBorder, colorBorderSoft, colorSurface, colorInk, colorTrack, colorPrimaryHover } from './sidebarTokens';

const MISSING_ICON = { farm: '▦', waterbody: '≋', plan: '▤', steward: '☺' };
const MISSING_COPY = {
  farm: 'Turn on to see crop and water detail per field',
  waterbody: 'Turn on to see waterbodies here',
  plan: 'Turn on to see plans here',
  steward: 'Turn on to see stewards here',
};

// Renders the header, tab strip and the active tab body. Bodies are passed in
// as render functions keyed by tab type, so this shell stays identical across tabs.
export default function DetailHost({ hits, activeTab, onSelectTab, onBack, layersOn, onEnableLayer, renderBody, placeName, mwsId, cards }) {
  const tabs = deriveTabs(hits);
  const active = nextActiveTab(activeTab, tabs);
  const missing = missingLayerTypes(tabs, layersOn);

  return (
    <div className="flex flex-col rounded-xl overflow-hidden" style={{ background: colorPageBg, border: `1px solid ${colorBorder}` }}>
      <DetailHeader placeName={placeName} mwsId={mwsId} onBack={onBack} />

      {shouldShowTabStrip(tabs) && (
        <TabStrip tabs={tabs} active={active} onSelect={onSelectTab} />
      )}

      <div className="p-3.5 space-y-3.5">
        {active && renderBody(active)}

        {cards}

        {missing.length > 0 && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: colorMuted }}>More for this location</h3>
            <div className="rounded-xl overflow-hidden" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
              {missing.map((type, i) => (
                <div key={type} className="flex items-center gap-3 px-3.5 py-3" style={{ borderTop: i ? `1px solid ${colorBorderSoft}` : 'none' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: colorTrack }}>
                    <span className="text-[14px]" aria-hidden="true">{MISSING_ICON[type]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold" style={{ color: colorInk }}>{TAB_LABELS[type]} {type === 'farm' ? 'boundaries' : 'layer'} are off</div>
                    <div className="text-[11px]" style={{ color: colorMuted }}>{MISSING_COPY[type]}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEnableLayer(type)}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                    style={{ border: `1px solid ${colorPrimaryHover}`, color: colorPrimaryHover }}
                  >
                    Turn on
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
