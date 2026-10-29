import { deriveTabs, shouldShowTabStrip, nextActiveTab, missingLayerTypes, hasAnyHit } from './tabRules';

describe('deriveTabs', () => {
  it('keeps the fixed order regardless of object key order', () => {
    expect(deriveTabs({ waterbody: {}, mws: {}, farm: {} })).toEqual(['mws', 'farm', 'waterbody']);
  });
  it('ignores null hits', () => {
    expect(deriveTabs({ mws: {}, farm: null })).toEqual(['mws']);
  });
  it('places village between mws and farm', () => {
    expect(deriveTabs({ farm: {}, village: {}, mws: {} })).toEqual(['mws', 'village', 'farm']);
  });
});

describe('shouldShowTabStrip', () => {
  it('hides the strip at exactly one hit', () => {
    expect(shouldShowTabStrip(['mws'])).toBe(false);
    expect(shouldShowTabStrip(['mws', 'farm'])).toBe(true);
  });
});

describe('nextActiveTab', () => {
  it('keeps the previous tab when it is still present', () => {
    expect(nextActiveTab('farm', ['mws', 'farm'])).toBe('farm');
  });
  it('falls back to mws when the previous tab is gone', () => {
    expect(nextActiveTab('waterbody', ['mws', 'farm'])).toBe('mws');
  });
  it('falls back to the first tab when mws is absent', () => {
    expect(nextActiveTab('farm', ['farm', 'waterbody'])).toBe('farm');
  });
  it('returns null when there are no tabs', () => {
    expect(nextActiveTab('mws', [])).toBeNull();
  });
});

describe('missingLayerTypes', () => {
  it('lists only off layers that have no hit', () => {
    expect(missingLayerTypes(['mws'], { farm: false, waterbody: true })).toEqual(['farm']);
  });
});

describe('hasAnyHit', () => {
  it('is false on load, when clickId is 0 and every hit is null', () => {
    expect(hasAnyHit({ clickId: 0, mws: null, farm: null, waterbody: null, plan: null, steward: null })).toBe(false);
  });
  it('is true when any hit exists', () => {
    expect(hasAnyHit({ clickId: 3, mws: null, farm: { farmId: 'F1' } })).toBe(true);
  });
});
