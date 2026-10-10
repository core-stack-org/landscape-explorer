import { atom } from 'recoil';

// One atom for everything a click produced. Each key is null when no hit of
// that type sits under the click.
export const mapHitsAtom = atom({
  key: 'rightSidebar/mapHits',
  default: {
    clickId: 0,
    mws: null,
    farm: null,
    waterbody: null,
    plan: null,
    steward: null,
  },
});

export const activeTabAtom = atom({
  key: 'rightSidebar/activeTab',
  default: null,
});

export const farmTimeseriesAtom = atom({
  key: 'rightSidebar/farmTimeseries',
  default: { clickId: 0, annual: null, monthly: null, loading: false, error: null },
});
