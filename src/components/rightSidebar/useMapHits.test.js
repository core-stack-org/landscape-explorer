import { collectHits, applyClickToHits } from './useMapHits';

describe('applyClickToHits', () => {
  const empty = { clickId: 0, mws: null, village: null, farm: null, waterbody: null, plan: null, steward: null };

  it('clears the farm when the same farm is clicked again', () => {
    const prev = { ...empty, farm: { farmId: 'F1', properties: {} } };
    const next = applyClickToHits(prev, { ...empty, farm: { farmId: 'F1', properties: {} } });
    expect(next.farm).toBeNull();
    expect(next.clickId).toBe(1);
  });

  it('selects a different farm', () => {
    const prev = { ...empty, farm: { farmId: 'F1', properties: {} } };
    const next = applyClickToHits(prev, { ...empty, farm: { farmId: 'F2', properties: {} } });
    expect(next.farm.farmId).toBe('F2');
  });

  it('keeps other hits when the farm is deselected', () => {
    const prev = { ...empty, farm: { farmId: 'F1', properties: {} } };
    const next = applyClickToHits(prev, { ...empty, farm: { farmId: 'F1', properties: {} }, mws: { uid: 'M1', properties: {} } });
    expect(next.farm).toBeNull();
    expect(next.mws.uid).toBe('M1');
  });

  it('keeps the list-chosen village when a click leaves the mws unchanged', () => {
    const prev = { ...empty, mws: { uid: 'M1', properties: {} }, village: { id: 'V1', properties: {} } };
    // A background click that misses the mws entirely toggles nothing here
    // since prev.mws is M1 and the new hit has no mws at all — not a "same
    // mws clicked again" case, so mws clears... use the farm-hit path
    // instead, where farmsOn keeps the exact same mws selected.
    const next = applyClickToHits(prev, {
      ...empty,
      farmsOn: true,
      farm: { farmId: 'F1', properties: {} },
      mws: { uid: 'M1', properties: {} },
    });
    expect(next.mws.uid).toBe('M1');
    expect(next.village.id).toBe('V1');
  });

  it('clears the list-chosen village when the resolved mws switches to a different one', () => {
    const prev = { ...empty, mws: { uid: 'M1', properties: {} }, village: { id: 'V1', properties: {} } };
    const next = applyClickToHits(prev, {
      ...empty,
      farmsOn: true,
      farm: { farmId: 'F1', properties: {} },
      mws: { uid: 'M2', properties: {} },
    });
    expect(next.mws.uid).toBe('M2');
    expect(next.village).toBeNull();
  });

  it('clears the list-chosen village when the mws is deselected entirely', () => {
    const prev = { ...empty, mws: { uid: 'M1', properties: {} }, village: { id: 'V1', properties: {} } };
    const next = applyClickToHits(prev, { ...empty, mws: { uid: 'M1', properties: {} } });
    expect(next.mws).toBeNull();
    expect(next.village).toBeNull();
  });

  it('clears the mws when the same mws is clicked again (farm layer off)', () => {
    const prev = { ...empty, mws: { uid: 'M1', properties: {} } };
    const next = applyClickToHits(prev, { ...empty, farmsOn: false, mws: { uid: 'M1', properties: {} } });
    expect(next.mws).toBeNull();
  });

  it('clears the mws when the same mws is clicked again and the farm layer is on but missed', () => {
    const prev = { ...empty, mws: { uid: 'M1', properties: {} } };
    const next = applyClickToHits(prev, { ...empty, farmsOn: true, farm: null, mws: { uid: 'M1', properties: {} } });
    expect(next.mws).toBeNull();
  });

  it('selects the mws the farm sits in, even when different from the current selection', () => {
    const prev = { ...empty, mws: { uid: 'M1', properties: {} } };
    const next = applyClickToHits(prev, {
      ...empty,
      farmsOn: true,
      farm: { farmId: 'F1', properties: {} },
      mws: { uid: 'M2', properties: {} },
    });
    expect(next.farm.farmId).toBe('F1');
    expect(next.mws.uid).toBe('M2');
  });

  it('still toggles the farm off on a repeat click while the farm layer is on, without clearing its mws', () => {
    const prev = { ...empty, farm: { farmId: 'F1', properties: {} }, mws: { uid: 'M1', properties: {} } };
    const next = applyClickToHits(prev, {
      ...empty,
      farmsOn: true,
      farm: { farmId: 'F1', properties: {} },
      mws: { uid: 'M1', properties: {} },
    });
    expect(next.farm).toBeNull();
    expect(next.mws.uid).toBe('M1');
  });
});

function feature(props) {
  return { get: (k) => props[k], getProperties: () => props };
}

function makeMap({ onMap, featuresByLayer = new Map(), mwsFeature = null }) {
  const calls = [];
  const map = {
    getLayers: () => ({ getArray: () => onMap }),
    forEachFeatureAtPixel: (pixel, cb, opts) => {
      calls.push(opts);
      for (const [layer, feats] of featuresByLayer) {
        if (opts.layerFilter(layer)) feats.forEach((f) => cb(f, layer));
      }
    },
    calls,
  };
  return { map, mwsLayer: { getSource: () => ({ getFeaturesAtCoordinate: () => (mwsFeature ? [mwsFeature] : []) }) } };
}

function registry(layers) {
  return { get: (type) => layers[type] ?? null };
}

const evt = { pixel: [10, 10], coordinate: [0, 0] };

describe('collectHits', () => {
  it('returns no hits when no layer is switched on', () => {
    const farm = { id: 'farm' };
    const { map } = makeMap({ onMap: [] });
    const hits = collectHits(map, evt, registry({ farm }));
    expect(hits.farm).toBeNull();
  });

  it('collects one hit per switched-on layer under the pixel', () => {
    const farm = { id: 'farm' };
    const plan = { id: 'plan' };
    const mws = { id: 'mws' };
    const { map, mwsLayer } = makeMap({
      onMap: [farm, plan, mws],
      featuresByLayer: new Map([
        [farm, [feature({ farm_id: 'F1' })]],
        [plan, [feature({ planDetails: { id: 7, plan: 'P' } })]],
      ]),
      mwsFeature: feature({ uid: 'M1' }),
    });
    const hits = collectHits(map, evt, registry({ farm, plan, mws: mwsLayer }));
    expect(hits.farm.farmId).toBe('F1');
    expect(hits.plan.id).toBe(7);
    expect(hits.mws.uid).toBe('M1');
    expect(hits.steward).toBeNull();
  });

  it('applies the 8px tolerance to waterbodies only', () => {
    const wb = { id: 'wb' };
    const farm = { id: 'farm' };
    const { map } = makeMap({
      onMap: [wb, farm],
      featuresByLayer: new Map([[wb, [feature({ UID: 42 })]]]),
    });
    const hits = collectHits(map, evt, registry({ waterbody: wb, farm }));
    expect(hits.waterbody.id).toBe(42);
    const tolerances = map.calls.map((c) => c.hitTolerance);
    expect(tolerances).toEqual([0, 8]);
  });

  it('ignores a waterbody with no usable id', () => {
    const wb = { id: 'wb' };
    const { map } = makeMap({
      onMap: [wb],
      featuresByLayer: new Map([[wb, [feature({ name: 'no id' })]]]),
    });
    expect(collectHits(map, evt, registry({ waterbody: wb })).waterbody).toBeNull();
  });

  it('never queries the village layer — village has no click interaction', () => {
    const hits = collectHits({ getLayers: () => ({ getArray: () => [] }) }, evt, registry({}));
    expect('village' in hits).toBe(false);
  });
});
