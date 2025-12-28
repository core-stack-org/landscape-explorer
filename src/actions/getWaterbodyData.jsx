import getVectorLayers from "./getVectorLayers";
import GeoJSON from "ol/format/GeoJSON";

export const getWaterbodyData = async ({
  district,
  block,
  map,
  waterbodyUID,
}) => {
  if (!district || !block || !map || !waterbodyUID) {
    console.warn("Missing params in getWaterbodyData");
    return null;
  }

  const dist = district.toLowerCase().replace(/\s+/g, "_");
  const blk = block.toLowerCase().replace(/\s+/g, "_");

  const wbLayerName = `surface_waterbodies_${dist}_${blk}`;

  const wbLayer = await getVectorLayers("swb", wbLayerName, false, true);
  map.addLayer(wbLayer);

  const wbSource = wbLayer.getSource();
  const view = map.getView();

  const extent = view.calculateExtent(map.getSize());
  wbSource.loadFeatures(extent, view.getResolution(), view.getProjection());

  const wbFeatures = await waitForFeatures(wbSource);

  const matchedWaterbody = wbFeatures.find((f) => {
    const uid = f.get("UID") || f.get("uid");
    return uid?.toString() === waterbodyUID.toString();
  });

  if (!matchedWaterbody) {
    console.warn("❌ No waterbody matched");
    return null;
  }

  const wbGeoJSON = new GeoJSON().writeFeatureObject(matchedWaterbody, {
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:4326",
  });


  const mwsLayerName = `deltaG_well_depth_${dist}_${blk}`;

  const mwsLayer = await getVectorLayers(
    "mws_layers",
    mwsLayerName,
    false,
    true
  );
  map.addLayer(mwsLayer);

  const mwsSource = mwsLayer.getSource();
  mwsSource.loadFeatures(extent, view.getResolution(), view.getProjection());

  const mwsFeatures = await waitForFeatures(mwsSource);

  const wbMwsUID =
    matchedWaterbody.get("MWS_UID") ||
    matchedWaterbody.get("mws_uid") ||
    matchedWaterbody.get("uid");

  let matchedMWS = null;

  if (wbMwsUID) {
    matchedMWS = mwsFeatures.find((f) => {
      const uid = f.get("uid") || f.get("UID");
      return uid?.toString() === wbMwsUID.toString();
    });
  }

  if (!matchedMWS) {
    console.warn("No MWS matched for WB");
  } else {
    console.log(" MATCHED MWS:", matchedMWS.getProperties());
  }

  const mwsGeoJSON = matchedMWS
    ? new GeoJSON().writeFeatureObject(matchedMWS, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      })
    : null;

  return {
    waterbody: {
      olFeature: matchedWaterbody,
      geojson: wbGeoJSON,
    },
    mws: matchedMWS
      ? {
          olFeature: matchedMWS,
          geojson: mwsGeoJSON,
        }
      : null,
  };
};

/* =====================================================
   HELPER
===================================================== */
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
