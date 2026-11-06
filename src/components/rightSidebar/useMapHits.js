import { useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { mapHitsAtom } from './atoms';
import { layerRegistry } from './layerRegistry';

// Collector, not resolver: every switched-on layer with a feature under the
// click contributes one hit. Nothing is ranked.
const WATERBODY_TOLERANCE_PX = 8;

function isOnMap(map, layer) {
  return !!layer && map.getLayers().getArray().includes(layer);
}

function firstFeatureOn(map, layer, tolerance = 0, pixel) {
  let found = null;
  map.forEachFeatureAtPixel(
    pixel,
    (feature) => {
      if (!found) found = feature;
      return undefined;
    },
    { layerFilter: (l) => l === layer, hitTolerance: tolerance },
  );
  return found;
}

// Village has no click interaction any more — it's chosen from the list of
// villages intersecting the clicked MWS (inside the Village tab), never by
// clicking the village boundary on the map. That boundary keeps only its
// hover tooltip (handled separately in kyl_dashboard.jsx), so collectHits
// doesn't even query the village layer, and applyClickToHits never touches
// mapHitsAtom.village — a click can never clobber the list-chosen village.
export function collectHits(map, evt, registry = layerRegistry) {
  const hits = { mws: null, farm: null, waterbody: null, plan: null, steward: null };

  // Whether the farm layer is even on the map right now — not just whether a
  // farm was hit. Drives whether a farm click should protect the MWS
  // selection (see applyClickToHits).
  hits.farmsOn = isOnMap(map, registry.get('farm'));

  const mwsLayer = registry.get('mws');
  if (isOnMap(map, mwsLayer)) {
    const feature = mwsLayer.getSource()?.getFeaturesAtCoordinate(evt.coordinate)?.[0];
    if (feature) hits.mws = { uid: feature.get('uid'), properties: feature.getProperties() };
  }

  const farmLayer = registry.get('farm');
  if (isOnMap(map, farmLayer)) {
    const feature = firstFeatureOn(map, farmLayer, 0, evt.pixel);
    if (feature) {
      const properties = feature.getProperties();
      hits.farm = { farmId: properties.farm_id, properties };
    }
  }

  const wbLayer = registry.get('waterbody');
  if (isOnMap(map, wbLayer)) {
    const feature = firstFeatureOn(map, wbLayer, WATERBODY_TOLERANCE_PX, evt.pixel);
    if (feature) {
      const properties = feature.getProperties();
      const id = properties?.UID ?? properties?.id ?? properties?.wb_id;
      if (id) hits.waterbody = { id, properties };
    }
  }

  const planLayer = registry.get('plan');
  if (isOnMap(map, planLayer)) {
    const feature = firstFeatureOn(map, planLayer, 0, evt.pixel);
    const data = feature?.get('planDetails');
    if (data) hits.plan = { id: data.id, data };
  }

  const stewardLayer = registry.get('steward');
  if (isOnMap(map, stewardLayer)) {
    const feature = firstFeatureOn(map, stewardLayer, 0, evt.pixel);
    const data = feature?.get('stewardDetails');
    if (data) hits.steward = { id: data.id, data };
  }

  return hits;
}

// Clicking the farm or MWS that is already selected deselects it — except a
// farm click always selects (never deselects) the MWS the farm sits in,
// below. `village` is never part of `hits`/`rest` (see collectHits), so
// `...rest` can never overwrite mapHitsAtom.village directly — it only ever
// changes through the Village tab's own village-list selection. It is,
// though, cleared whenever the resolved MWS changes (selected, deselected or
// switched to a different one), so the Village tab doesn't keep showing a
// village that belonged to a now-gone MWS — it falls back to that (new)
// MWS's own village list instead.
//
// When the farm layer is on and the click actually lands on a farm, the MWS
// under that same click is selected to match it (not toggled off even on a
// repeat click of the same farm) — only the farm hit itself keeps its
// repeat-to-deselect toggle. Any other click — farm layer off, or farm layer
// on but the click missed every farm — behaves like the farm layer isn't
// there at all: MWS toggles off on a repeat click of the same one, or
// switches to whatever (if anything) is under the new click.
export function applyClickToHits(prev, hits) {
  const { farmsOn, ...rest } = hits;
  const repeatedFarm = rest.farm && prev.farm && String(prev.farm.farmId) === String(rest.farm.farmId);
  const farmHitValue = repeatedFarm ? null : rest.farm;

  let nextMws;
  if (farmsOn && rest.farm) {
    nextMws = rest.mws;
  } else {
    const repeatedMws = rest.mws && prev.mws && String(prev.mws.uid) === String(rest.mws.uid);
    nextMws = repeatedMws ? null : rest.mws;
  }

  const mwsChanged = String(prev.mws?.uid) !== String(nextMws?.uid);

  return {
    ...prev,
    ...rest,
    farm: farmHitValue,
    mws: nextMws,
    village: mwsChanged ? null : prev.village,
    clickId: prev.clickId + 1,
  };
}

// Mount once where the map exists. Writes mapHitsAtom on every click.
//
// Deliberately 'click', not 'singleclick': kyl_dashboard's own MWS/waterbody
// click handlers (the ones that drive the actual map styling — green MWS
// fill, etc.) listen on 'click', which fires immediately and unconditionally.
// 'singleclick' is OL's double-click-disambiguated event — it can be
// cancelled/delayed when clicks land close together in time, which let this
// collector's mapHitsAtom (and therefore the sidebar panel) silently fall out
// of sync with what the map was actually showing as selected. Matching
// 'click' here keeps both systems reacting to the exact same physical clicks.
export default function useMapHits(mapRef) {
  const setHits = useSetRecoilState(mapHitsAtom);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const onClick = (evt) => {
      const hits = collectHits(map, evt);
      setHits((prev) => applyClickToHits(prev, hits));
    };

    map.on('click', onClick);
    return () => map.un('click', onClick);
  }, [mapRef.current, setHits]);
}
