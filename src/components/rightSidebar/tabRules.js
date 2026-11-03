// Board order is Micro-watershed / Village / Farm / Waterbody — see
// kyl-sidebar-mws-village-plan.md §2 (the MWS-only mock that drops Village
// is stale; build from this list, not from either board).
export const TAB_ORDER = ['mws', 'village', 'farm', 'waterbody'];
export const TAB_LABELS = {
  mws: 'Micro‑watershed',
  village: 'Village',
  farm: 'Farm',
  waterbody: 'Waterbody',
};

// Plan and steward are cards inside the tab area, not tabs (see Decisions).
export function deriveTabs(hits) {
  return TAB_ORDER.filter((type) => hits?.[type] != null);
}

export function shouldShowTabStrip(tabs) {
  return tabs.length > 1;
}

// Keep the previously active tab when it still exists after a click; otherwise
// fall back to the micro-watershed tab, or the first available tab.
export function nextActiveTab(previousActive, tabs) {
  if (tabs.length === 0) return null;
  if (previousActive && tabs.includes(previousActive)) return previousActive;
  return tabs.includes('mws') ? 'mws' : tabs[0];
}

export function missingLayerTypes(tabs, layersOn) {
  return TAB_ORDER.filter((type) => !tabs.includes(type) && !layersOn?.[type]);
}

export const HIT_TYPES = ['mws', 'village', 'farm', 'waterbody', 'plan', 'steward'];

// clickId is a counter, not a hit; counting it would show the detail area on load.
export function hasAnyHit(hits) {
  return HIT_TYPES.some((type) => hits?.[type] != null);
}
