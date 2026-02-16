import getVectorLayers from "./getVectorLayers";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Stroke } from "ol/style";

export const getWaterbodyData = async ({
  district,
  block,
  map,
  waterbodyUID = null,
}) => {

  if (!district?.label || !block?.label || !map) {
    console.warn("Missing district/block label in getWaterbodyData");
    return null;
  }

  const dist = district.label.toLowerCase().replace(/\s+/g, "_");
  const blk = block.label.toLowerCase().replace(/\s+/g, "_");

  const yellowWaterbodyStyle = new Style({
    stroke: new Stroke({
      color: "yellow",
      width: 1.5,
    }),
  });

  const extractMwsUidList = (mwsUidString) => {
    if (!mwsUidString) return [];
    return mwsUidString.split("_").reduce((acc, val, idx, arr) => {
      if (idx % 2 === 0 && arr[idx + 1]) {
        acc.push(`${val}_${arr[idx + 1]}`);
      }
      return acc;
    }, []);
  };

  // ===================== WATERBODY ======================

  const wbLayerName = `surface_waterbodies_${dist}_${blk}`;
  const wbLayer = await getVectorLayers("swb", wbLayerName, false, true);
  map.addLayer(wbLayer);

  wbLayer.setStyle(yellowWaterbodyStyle);

  const wbSource = wbLayer.getSource();
  const view = map.getView();
  const extent = view.calculateExtent(map.getSize());

  wbSource.loadFeatures(extent, view.getResolution(), view.getProjection());
  const wbFeatures = await waitForFeatures(wbSource);

  let matchedWaterbody = null;

  if (waterbodyUID) {
    matchedWaterbody = wbFeatures.find((f) => {
      const uid = f.get("UID") || f.get("uid");
      return uid?.toString() === waterbodyUID.toString();
    });
  }

  // ===================== MWS ======================

  const mwsLayerName = `deltaG_well_depth_${dist}_${blk}`;
  const mwsLayer = await getVectorLayers("mws_layers", mwsLayerName, false, true);
  map.addLayer(mwsLayer);

  const mwsSource = mwsLayer.getSource();
  mwsSource.loadFeatures(extent, view.getResolution(), view.getProjection());
  const mwsFeatures = await waitForFeatures(mwsSource);

  let matchedMWS = [];

  if (matchedWaterbody) {
    const wbMwsUID =
      matchedWaterbody.get("MWS_UID") ||
      matchedWaterbody.get("mws_uid");

    if (wbMwsUID) {
      const mwsUidList = extractMwsUidList(wbMwsUID.toString());

      matchedMWS = mwsFeatures.filter((f) => {
        const uid = (f.get("uid") || f.get("UID"))?.toString();
        return uid && mwsUidList.includes(uid.trim());
      });
    }
  }

  // ===================== ZOI ======================

  const zoiLayerName = `waterbodies_zoi_${dist}_${blk}`;

  const zoiLayer =
    (await getVectorLayers("swb", zoiLayerName, false, true)) ||
    (await getVectorLayers("zoi_layers", zoiLayerName, false, true)) ||
    null;

  let rawZoiFeatures = [];
  let matchedZOI = [];

  if (zoiLayer) {
    map.addLayer(zoiLayer);

    const zoiSource = zoiLayer.getSource();
    zoiSource.loadFeatures(extent, view.getResolution(), view.getProjection());

    rawZoiFeatures = await waitForFeatures(zoiSource);

    if (matchedWaterbody) {
      const wbUid =
        matchedWaterbody.get("UID")?.toString()?.trim() ||
        matchedWaterbody.get("uid")?.toString()?.trim();

      matchedZOI = rawZoiFeatures.filter((f) => {
        const zUid =
          f.get("UID")?.toString()?.trim() ||
          f.get("uid")?.toString()?.trim();
        return zUid === wbUid;
      });
    }
  }

  // ===================== FINAL RETURN ======================

  return {
    wbLayer,
    wbFeatures,

    waterbody: matchedWaterbody
      ? (() => {
          const geo = new GeoJSON().writeFeatureObject(matchedWaterbody, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:4326",
          });
          delete geo.properties;
          return {
            olFeature: matchedWaterbody,
            geojson: geo,
          };
        })()
      : null,

    mws: matchedMWS.length
      ? matchedMWS.map((f) => {
          const geo = new GeoJSON().writeFeatureObject(f, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:4326",
          });
          delete geo.properties;
          return {
            olFeature: f,
            geojson: geo,
          };
        })
      : [],

    zoi: matchedZOI.length
      ? matchedZOI.map((f) => {
          const geo = new GeoJSON().writeFeatureObject(f, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:4326",
          });
          delete geo.properties;
          return geo;
        })
      : [],
  };
};

// ===================== WAIT FUNCTION ======================

const waitForFeatures = (source) =>
  new Promise((resolve) => {
    const interval = setInterval(() => {
      const feats = source.getFeatures();
      if (feats.length > 0) {
        clearInterval(interval);
        resolve(feats);
      }
    }, 200);
  });
