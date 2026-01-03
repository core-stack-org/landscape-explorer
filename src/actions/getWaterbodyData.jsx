import getVectorLayers from "./getVectorLayers";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Fill, Stroke } from "ol/style";

export const getWaterbodyData = async ({
    district,
    block,
    map,
    waterbodyUID = null, 
  }) => {
    if (
      !district?.label ||
      !block?.label ||
      !map
    ) {
      console.warn("Missing district/block label in getWaterbodyData", {
        district,
        block,
      });
      return null;
    }
  console.log("hiiiiiiiiiiiiii",district,block)
  const dist = district.label
    .toLowerCase()
    .replace(/\s+/g, "_");
  
  const blk = block.label
    .toLowerCase()
    .replace(/\s+/g, "_");
  
    const yellowWaterbodyStyle = new Style({
      stroke: new Stroke({
        color: "yellow", 
        width: 1.5,
      }),
    });
  
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
  
      if (!matchedWaterbody) {
        console.warn(" No waterbody matched UID:", waterbodyUID);
      }
    }
  
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
  
  
    let matchedMWS = null;
  
    if (matchedWaterbody) {
      const wbMwsUID =
        matchedWaterbody.get("MWS_UID") ||
        matchedWaterbody.get("mws_uid");
  
      if (wbMwsUID) {
        matchedMWS = mwsFeatures.find((f) => {
          const uid = f.get("uid") || f.get("UID");
          return uid?.toString() === wbMwsUID.toString();
        });
      }
    }
  
    return {
      wbLayer,
      wbFeatures,
  
      waterbody: matchedWaterbody
        ? {
            olFeature: matchedWaterbody,
            geojson: new GeoJSON().writeFeatureObject(matchedWaterbody, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:4326",
            }),
          }
        : null,
  
      mws: matchedMWS
        ? {
            olFeature: matchedMWS,
            geojson: new GeoJSON().writeFeatureObject(matchedMWS, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:4326",
            }),
          }
        : null,
    };
  };
  
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
