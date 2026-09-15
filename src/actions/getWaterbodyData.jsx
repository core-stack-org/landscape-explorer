// import getVectorLayers from "./getVectorLayers";
import getWebglVectorLayers from "./getWebGlVectorLayers";
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
    console.log("getWaterbodyData", { district, block, waterbodyUID });

    const transformName = (name) => {
      if (!name) return "";
    
      // Extract base + alias from parentheses
      const match = name.match(/^(.+?)\s*\((.+?)\)$/);
    
      let parts = [];
    
      if (match) {
        const main = match[1];
        const alias = match[2];
    
        parts = [main, alias];
      } else {
        // no parentheses → repeat twice
        parts = [name];
      }
    
      return parts
        .map((p) =>
          p
            .replace(/[^\w\s-]/g, "") // remove special chars
            .replace(/\s+/g, "_")     // Space
            .replace(/_+/g, "_")      // collapse _
            .replace(/^_|_$/g, "")    // trim _
            .toLowerCase()
        )
        .join("_");
    };

  const dist = transformName(district.label);
  
  const blk = transformName(block.label);
  
    const yellowWaterbodyStyle = new Style({
      stroke: new Stroke({
        color: "yellow", 
        width: 1.5,
      }),
    });

const extractMwsUidList = (mwsUidString) => {
  if (!mwsUidString) return [];

  const value = String(mwsUidString).trim();

  // NEW FORMAT
  // Example: "12_355341|12_359307|12_355643"
  if (value.includes("|")) {
    return value
      .split("|")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  // OLD FORMAT
  // Example: "12_355341_12_359307_12_355643"
  return value
    .split("_")
    .reduce((acc, val, idx, arr) => {
      if (idx % 2 === 0 && arr[idx + 1]) {
        acc.push(`${val}_${arr[idx + 1]}`);
      }
      return acc;
    }, []);
};
  
    const wbLayerName = `surface_waterbodies_${dist}_${blk}`;
    const wbLayer = await getWebglVectorLayers("swb", wbLayerName, false, true);
    // map.addLayer(wbLayer);
  
    // wbLayer.setStyle(yellowWaterbodyStyle);
   console.log("wbLayer", wbLayer);
   console.log("wbLayerName", wbLayerName);
   console.log("dist", dist);
    console.log("blk", blk);
  
    const wbSource = wbLayer.getSource();
    const view = map.getView();
    const extent = view.calculateExtent(map.getSize());
  
    wbSource.loadFeatures(extent, view.getResolution(), view.getProjection());
    const wbFeatures = await waitForFeatures(wbSource);
  
    let matchedWaterbody = null;
  
    if (waterbodyUID) {
      const requestedWaterbodyId = waterbodyUID.toString().trim();

      matchedWaterbody = wbFeatures.find((f) => {
        const featureUid =
          f.get("UID") ??
          f.get("uid");

        const featureWbId =
          f.get("wb_id") ??
          f.get("WB_ID") ??
          f.get("waterbody_id") ??
          f.get("waterbodyId");

        const uidMatches =
          featureUid?.toString().trim() === requestedWaterbodyId;

        const wbIdMatches =
          featureWbId?.toString().trim() === requestedWaterbodyId;

        return uidMatches || wbIdMatches;
      });

      if (!matchedWaterbody) {
        console.warn("No waterbody matched UID or wb_id:", waterbodyUID);
      }
    }
  
    const mwsLayerName = `deltaG_well_depth_${dist}_${blk}`;
    const mwsLayer = await getWebglVectorLayers(
      "mws_layers",
      mwsLayerName,
      false,
      true
    );
    // map.addLayer(mwsLayer);
  
    const mwsSource = mwsLayer.getSource();
    mwsSource.loadFeatures(extent, view.getResolution(), view.getProjection());
    const mwsFeatures = await waitForFeatures(mwsSource);
  
  
    let matchedMWS = [];
    
    if (matchedWaterbody) {
      const wbMwsUID =
        matchedWaterbody.get("MWS_UID") ||
        matchedWaterbody.get("mws_uid") ||
        matchedWaterbody.get("mws_uid_list");

      if (wbMwsUID) {
        // extract list like ["12_308838","12_311076","12_316294"]
        const mwsUidList = extractMwsUidList(wbMwsUID.toString());
   
    
        matchedMWS = mwsFeatures.filter((f) => {
          const uid = (f.get("uid") || f.get("UID"))?.toString();
          return uid && mwsUidList.includes(uid.trim());
        });
      }
    }

// ===================== ZOI FETCH ======================
const zoiLayerName = `waterbodies_zoi_${dist}_${blk}`;

// Try multiple namespaces — some servers store ZOI differently
const zoiLayer =
  (await getWebglVectorLayers("swb", zoiLayerName, false, true)) ||
  (await getWebglVectorLayers("zoi_layers", zoiLayerName, false, true)) ||
  null;
  

let rawZoiFeatures = [];
let matchedZOI = [];

if (zoiLayer) {
  // map.addLayer(zoiLayer);

  const zoiSource = zoiLayer.getSource();
  zoiSource.loadFeatures(extent, view.getResolution(), view.getProjection());

  rawZoiFeatures = await waitForFeatures(zoiSource);
  console.log(
  "ZOI layer name:",
  zoiLayerName
);

console.log(
  "Total raw ZOI features:",
  rawZoiFeatures.length
);

console.log(
  "First ZOI properties:",
  rawZoiFeatures[0]?.getProperties()
);

  // Match only for selected WB
if (matchedWaterbody) {
  const waterbodyIds = [
    matchedWaterbody.get("UID"),
    matchedWaterbody.get("uid"),
    matchedWaterbody.get("wb_id"),
    matchedWaterbody.get("WB_ID"),
    matchedWaterbody.get("waterbody_id"),
    matchedWaterbody.get("waterbodyId"),
    matchedWaterbody.get("id"),
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => value.toString().trim());

  matchedZOI = rawZoiFeatures.filter((feature) => {
    const zoiIds = [
      feature.get("UID"),
      feature.get("uid"),
      feature.get("wb_id"),
      feature.get("WB_ID"),
      feature.get("waterbody_id"),
      feature.get("waterbodyId"),
      feature.get("id"),
    ]
      .filter((value) => value !== undefined && value !== null)
      .map((value) => value.toString().trim());

    return zoiIds.some((id) => waterbodyIds.includes(id));
  });

  console.log("ZOI matched count:", matchedZOI.length);
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
        
  
        mws: matchedMWS.length
        ? matchedMWS.map(f => ({
            olFeature: f,
            geojson: new GeoJSON().writeFeatureObject(f, {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:4326",
            })
          }))
        : [],

        zoi: matchedZOI.length
    ? matchedZOI.map(f =>
        new GeoJSON().writeFeatureObject(f, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:4326",
        })
      )
    : [],
        
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
