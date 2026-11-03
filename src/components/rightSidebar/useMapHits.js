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

export function collectHits(map, evt, registry = layerRegistry) {
  const hits = { mws: null, village: null, farm: null, waterbody: null, plan: null, steward: null };

  const mwsLayer = registry.get('mws');
  if (isOnMap(map, mwsLayer)) {
    const feature = mwsLayer.getSource()?.getFeaturesAtCoordinate(evt.coordinate)?.[0];
    if (feature) hits.mws = { uid: feature.get('uid'), properties: feature.getProperties() };
  }

  // Same WebGL-polygon source shape as mws (both built by getWebGlPolygonLayers),
  // so the same getFeaturesAtCoordinate lookup applies.
  const villageLayer = registry.get('village');
  if (isOnMap(map, villageLayer)) {
    const feature = villageLayer.getSource()?.getFeaturesAtCoordinate(evt.coordinate)?.[0];
    if (feature) {
      const properties = feature.getProperties();
      const id = properties?.vill_ID ?? properties?.village_id;
      if (id != null) hits.village = { id, properties };
    }
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

// Clicking the farm (or village) that is already selected deselects it; the
// other hits from that click still apply.
export function applyClickToHits(prev, hits) {
  const repeatedFarm = hits.farm && prev.farm && String(prev.farm.farmId) === String(hits.farm.farmId);
  const repeatedVillage = hits.village && prev.village && String(prev.village.id) === String(hits.village.id);
  return {
    ...prev,
    ...hits,
    farm: repeatedFarm ? null : hits.farm,
    village: repeatedVillage ? null : hits.village,
    clickId: prev.clickId + 1,
  };
}

// Mount once where the map exists. Writes mapHitsAtom on every single click.
export default function useMapHits(mapRef) {
  const setHits = useSetRecoilState(mapHitsAtom);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const onSingleClick = (evt) => {
      const hits = collectHits(map, evt);
      setHits((prev) => applyClickToHits(prev, hits));
    };

    map.on('singleclick', onSingleClick);
    return () => map.un('singleclick', onSingleClick);
  }, [mapRef.current, setHits]);
}
