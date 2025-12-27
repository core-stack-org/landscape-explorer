// DashboardBasemap.jsx
import React, { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Stroke, Icon } from "ol/style";
import Point from "ol/geom/Point";
import Crop from "ol-ext/filter/Crop";
import getImageLayer from "../actions/getImageLayers";
import getVectorLayers from "../actions/getVectorLayers";
import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import PinchZoom from "ol/interaction/PinchZoom";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";
import Feature from "ol/Feature";
import MultiPolygon from "ol/geom/MultiPolygon";
import Overlay from "ol/Overlay";
import Polygon from "ol/geom/Polygon";
import waterbodyIcon from "../assets/waterbodies_proposed.svg";

const DashboardBasemap = ({
  id,
  type,
  mode = "waterbody",
  geoData,
  zoiFeatures,
  mwsData,
  plantationGeodata,
  selectedWaterbody,
  selectedFeature,
  selectedPlantation, 
  onSelectPlantation, 
  lulcYear,
  projectName,
  projectId,
  district,
  block,
  onSelectWaterbody,
  onZoiArea,
  organizationLabel,
  styleHeight = "800px",
}) => {
  const mapRef = useRef(null);
  const mapElement = useRef(null);
  const popupRef = useRef(null);
  const pendingPlantationRef = useRef(null);
  const geojsonReaderRef = useRef(new GeoJSON());
  const lulcLoadedRef = useRef(false);

  console.log(plantationGeodata)
  const read4326 = (data) => {
    if (!data) return [];
  
    // Case 1: already OL features
    if (
      Array.isArray(data) &&
      data.length &&
      typeof data[0]?.getGeometry === "function"
    ) {
      return data;
    }
  
    // Case 2: GeoJSON FeatureCollection
    if (data.type === "FeatureCollection") {
      const safeData = filteredGeoJSON(data);
  
      return geojsonReaderRef.current.readFeatures(safeData, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      });
    }
  
    console.warn("Invalid data passed to read4326:", data);
    return [];
  };
  

  const filteredGeoJSON = (geojson) => {
    if (!geojson || geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
      return { type: "FeatureCollection", features: [] };
    }
  
    const safeFeatures = geojson.features
      .filter(
        (f) =>
          f &&
          f.geometry &&
          Array.isArray(f.geometry.coordinates) &&
          f.geometry.coordinates.length > 0
      )
      .map((feature) => {
        const geom = feature.geometry;
  
        // Polygon → MultiPolygon
        if (geom.type === "Polygon") {
          return {
            ...feature,
            geometry: {
              type: "MultiPolygon",
              coordinates: [geom.coordinates],
            },
          };
        }
  
        // Clean MultiPolygon rings
        if (geom.type === "MultiPolygon") {
          const cleanCoords = geom.coordinates
            .filter((poly) => Array.isArray(poly) && poly.length > 0)
            .map((poly) => (Array.isArray(poly[0][0]) ? poly : [poly]));
  
          return {
            ...feature,
            geometry: {
              ...geom,
              coordinates: cleanCoords,
            },
          };
        }
  
        return feature;
      });
  
    return { type: "FeatureCollection", features: safeFeatures };
  };
  
  
  


  const getZoiOlFeatures = () => {
    if (!zoiFeatures) return [];
    if (
      Array.isArray(zoiFeatures) &&
      zoiFeatures.length &&
      typeof zoiFeatures[0].getGeometry === "function"
    ) {
      return zoiFeatures;
    }
    if (
      zoiFeatures?.type === "FeatureCollection" ||
      Array.isArray(zoiFeatures)
    ) {
      const fc =
        zoiFeatures.type === "FeatureCollection"
          ? zoiFeatures
          : { type: "FeatureCollection", features: zoiFeatures };
      return read4326(fc);
    }
    return [];
  };

  const waterBodyStyle = (feature) => {
    const styles = [
      new Style({
        stroke: new Stroke({
          color: "blue",
          width: 3,
        }),
      }),
    ];

    const geometry = feature.getGeometry?.();
    if (geometry) {
      let center;
      try {
        const gType = geometry.getType();
        if (gType === "Polygon")
          center = geometry.getInteriorPoint().getCoordinates();
        else if (gType === "MultiPolygon")
          center = geometry.getInteriorPoints().getFirstCoordinate();
        else {
          const ex = geometry.getExtent();
          center = [(ex[0] + ex[2]) / 2, (ex[1] + ex[3]) / 2];
        }
      } catch {
        const ex = geometry.getExtent();
        center = [(ex[0] + ex[2]) / 2, (ex[1] + ex[3]) / 2];
      }

      styles.push(
        new Style({
          geometry: new Point(center),
          image: new Icon({
            src: waterbodyIcon,
            anchor: [0.5, 1],
            scale: 1,
          }),
        })
      );
    }
    return styles;
  };

  const waterbodyPointStyle = new Style({
    image: new Icon({
      src: waterbodyIcon,
      scale: 1.1,
      anchor: [0.5, 1],
    }),
  });
  

  const removeLayersById = (ids = []) => {
    const m = mapRef.current;
    if (!m) return;
    const layers = m.getLayers().getArray().slice();
    layers.forEach((layer) => {
      const lid = layer.get("id");
      if (lid && ids.includes(lid)) {
        try {
          m.removeLayer(layer);
        } catch {
          /* ignore */
        }
      }
    });
  };

  const removeLayersBySourceParam = (needle) => {
    const m = mapRef.current;
    if (!m) return;
    const layers = m.getLayers().getArray().slice();
    layers.forEach((layer) => {
      try {
        if (layer.getSource && layer.getSource()?.getParams) {
          const params = layer.getSource().getParams();
          if (params?.LAYERS && params.LAYERS.includes(needle)) {
            m.removeLayer(layer);
          }
        }
      } catch {
        /* ignore */
      }
    });
  };

  const removeLulcLayers = () => {
    const map = mapRef.current;
    if (!map) return;

    const layers = map.getLayers().getArray().slice();

    layers.forEach((layer) => {
      const id = layer.get("id");
      if (
        id === "lulc_waterbody_layer" ||
        id === "lulc_zoi_layer" ||
        id === "lulc_zoi_excluded_layer"
      ) {
        map.removeLayer(layer);
      }

      try {
        const params = layer.getSource?.().getParams?.();
        if (params?.LAYERS && params.includes("LULC")) {
          map.removeLayer(layer);
        }
      } catch {
        /* ignore */
      }

      const src = layer.getSource?.();
      if (src?.urls && src?.urls[0]?.includes("LULC")) {
        map.removeLayer(layer);
      }
    });
  };

  // INITIAL MAP SETUP
//   useEffect(() => {
//     if (!mapElement.current) return;

//     const baseLayer = new TileLayer({
//       source: new XYZ({
//         url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
//       }),
//       zIndex: 0,
//     });

//     const view = new View({
//       projection: "EPSG:4326",
//       center: [80, 23.5],
//       zoom: 6,
//     });

//     const map = new Map({
//       target: mapElement.current,
//       view,
//       layers: [baseLayer],
//     });

//     mapRef.current = map;

//     map.isReady = false;
//     map.once("postrender", () => {
//       map.isReady = true;
//     });

//     const overlay = new Overlay({
//       element: popupRef.current,
//       positioning: "bottom-center",
//       offset: [0, -15],
//       stopEvent: false,
//     });
//     map.addOverlay(overlay);
//     map.overlayRef = overlay;

//     // CLICK HANDLER (returns pure GeoJSON geometry)
//     map.on("singleclick", (event) => {
//       const m = mapRef.current;
//       if (!m) return;

//       // const feature = m.forEachFeatureAtPixel(
//       //   event.pixel,
//       //   (feat) => {
//       //     const type = feat.getGeometry()?.getType();
//       //     if (type === "Point") return null;
//       //     return feat;
//       //   },
//       //   { hitTolerance: 6 }
//       // );
//       const feature = m.forEachFeatureAtPixel(
//         event.pixel,
//         (feat) => feat,
//         { hitTolerance: 6 }
//       );
      
//       const popupEl = popupRef.current;
//       if (!popupEl) return;

//       if (!feature) {
//         popupEl.style.display = "none";
//         return;
//       }

//       // ================= PLANTATION POPUP =================
// if (layerType === "plantation") {
//   const area =
//     props.area_ha ||
//     props.area ||
//     props.AREA_HA ||
//     "NA";

//   const suitability =
//     props.patch_suitability ||
//     props.suitability ||
//     "NA";

//   popupEl.innerHTML = `
//     <div style="min-width:160px">
//       <strong>Plantation Site</strong><br/>
//       Area: ${Number(area).toFixed?.(2) ?? area} ha<br/>
//       Suitability: ${suitability}
//     </div>
//   `;

//   popupEl.style.display = "block";
//   m.overlayRef.setPosition(event.coordinate);
//   return; // ⛔ STOP HERE
// }


//       const props = feature.getProperties?.() || {};
//       const layerType = feature.get("layerType");
//       const uid =
//         props?.UID ||
//         props?.uid ||
//         feature.get("UID") ||
//         feature.get("uid");

//       const name =
//         props.waterbody_name ||
//         props.name ||
//         feature.get("waterbody_name") ||
//         feature.get("name") ||
//         (uid ? `Waterbody ${uid}` : "Feature");

//       const olGeom = feature.getGeometry();
//       let geometryJSON = null;

//       if (olGeom) {
//         geometryJSON = geojsonReaderRef.current.writeGeometryObject(olGeom, {
//           dataProjection: "EPSG:4326",
//           featureProjection: "EPSG:4326",
//         });
//       }

//       if (onSelectWaterbody && uid) {
//         onSelectWaterbody({
//           ...props,
//           UID: uid,
//           waterbody_name: name,
//           geometry: geometryJSON,
//           pixel:event.pixel
//         });
//       }

//       popupEl.style.display = "block";
//       m.overlayRef.setPosition(event.coordinate);
//     });

//     map.getInteractions().forEach((interaction) => {
//       if (
//         interaction instanceof MouseWheelZoom ||
//         interaction instanceof PinchZoom ||
//         interaction instanceof DoubleClickZoom
//       ) {
//         interaction.setActive(false);
//       }
//     });

//     return () => {
//       try {
//         map.setTarget(null);
//       } catch {
//         /* ignore */
//       }
//     };
//   }, []);

useEffect(() => {
  if (!mapElement.current) return;

  const baseLayer = new TileLayer({
    source: new XYZ({
      url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    }),
    zIndex: 0,
  });

  const view = new View({
    projection: "EPSG:4326",
    center: [80, 23.5],
    zoom: 6,
  });

  const map = new Map({
    target: mapElement.current,
    view,
    layers: [baseLayer],
  });

  mapRef.current = map;

  map.isReady = false;
  map.once("postrender", () => {
    map.isReady = true;
  });

  const overlay = new Overlay({
    element: popupRef.current,
    positioning: "bottom-center",
    offset: [0, -15],
    stopEvent: false,
  });
  map.addOverlay(overlay);
  map.overlayRef = overlay;

  // CLICK HANDLER
  map.on("singleclick", (event) => {
    const m = mapRef.current;
    if (!m) return;

    const feature = m.forEachFeatureAtPixel(
      event.pixel,
      (feat) => feat,
      { hitTolerance: 6 }
    );

    const popupEl = popupRef.current;
    if (!popupEl) return;

    if (!feature) {
      popupEl.style.display = "none";
      return;
    }

    // ✅ FIX: DEFINE THESE FIRST
    const props = feature.getProperties?.() || {};
    const layerType = feature.get("layerType");

// ================= PLANTATION POPUP =================
// ================= PLANTATION POPUP =================
if (layerType === "plantation") {

  // 🔑 FIX: define geometryJSON FIRST
  const olGeom = feature.getGeometry();
  let geometryJSON = null;

  if (olGeom) {
    geometryJSON = geojsonReaderRef.current.writeGeometryObject(olGeom, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:4326",
    });
  }

  const FarmerName =
    props.Name?.replace(/\s*\(.*?\)\s*/g, "").trim() || "NA";

  const area =
    props.area_ha ||
    props.area ||
    props.AREA_HA ||
    "NA";

  const suitability =
    props.patch_suitability ||
    props.suitability ||
    "NA";

  popupEl.innerHTML = `
    <div style="min-width:200px; cursor:pointer">
      <strong>Farmer's name:</strong> ${FarmerName}<br/>
      <strong>Area:</strong> ${Number(area).toFixed?.(2) ?? area} ha<br/>
      <strong>Suitability:</strong> ${suitability}<br/>
      <em style="color:#2563eb">Click to zoom</em>
    </div>
  `;

  // ✅ store data ONLY
  pendingPlantationRef.current = {
    ...props,
    geometry: geometryJSON,
  };

  popupEl.style.display = "block";
  m.overlayRef.setPosition(event.coordinate);

  // ✅ zoom ONLY on popup click
  popupEl.onclick = (e) => {
    e.stopPropagation(); 

    if (onSelectPlantation && pendingPlantationRef.current) {
      onSelectPlantation(pendingPlantationRef.current);
      pendingPlantationRef.current = null;
    }
  };

  return;
}


    // ================= WATERBODY / OTHERS =================
    const uid =
      props?.UID ||
      props?.uid ||
      feature.get("UID") ||
      feature.get("uid");

    const name =
      props.waterbody_name ||
      props.name ||
      feature.get("waterbody_name") ||
      feature.get("name") ||
      (uid ? `Waterbody ${uid}` : "Feature");

    const olGeom = feature.getGeometry();
    let geometryJSON = null;

    if (olGeom) {
      geometryJSON = geojsonReaderRef.current.writeGeometryObject(olGeom, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      });
    }

    if (onSelectWaterbody && uid) {
      onSelectWaterbody({
        ...props,
        UID: uid,
        waterbody_name: name,
        geometry: geometryJSON,
        pixel: event.pixel,
      });
    }

    popupEl.style.display = "block";
    m.overlayRef.setPosition(event.coordinate);
  });

  map.getInteractions().forEach((interaction) => {
    if (
      interaction instanceof MouseWheelZoom ||
      interaction instanceof PinchZoom ||
      interaction instanceof DoubleClickZoom
    ) {
      interaction.setActive(false);
    }
  });

  return () => {
    try {
      map.setTarget(null);
    } catch {
      /* ignore */
    }
  };
}, []);


  // MODE HANDLER + LULC
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (mode === "waterbody" && !geoData) return;
    if (mode === "zoi" && !zoiFeatures) return;
    if (mode === "mws" && !mwsData) return;
    if ((mode === "zoi" || mode === "mws") && !selectedWaterbody) return;

    // NORMALIZE selectedWaterbody (tehsil OL feature → plain object)
    let normalizedWaterbody = selectedWaterbody;
    if (
      normalizedWaterbody &&
      typeof normalizedWaterbody.get === "function" &&
      normalizedWaterbody.get("UID")
    ) {
      normalizedWaterbody = {
        UID: normalizedWaterbody.get("UID"),
        MWS_ID:
          normalizedWaterbody.get("MWS_ID") ||
          normalizedWaterbody.get("mwsid") ||
          normalizedWaterbody.get("mws_id"),
        name:
          normalizedWaterbody.get("waterbody_name") ||
          normalizedWaterbody.get("name"),
        Village: normalizedWaterbody.get("Village"),
        Taluka: normalizedWaterbody.get("Taluka"),
        District: normalizedWaterbody.get("District"),
        State: normalizedWaterbody.get("State"),
      };
    }

      // ---------- PLANTATION ZOOM ----------
if (mode === "plantation" && selectedPlantation?.geometry) {
  const olGeom = geojsonReaderRef.current.readGeometry(
    selectedPlantation.geometry,
    {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:4326",
    }
  );

  map.getView().fit(olGeom.getExtent(), {
    padding: [40, 40, 40, 40],
    maxZoom: 18,
    duration: 400,
  });
}

    lulcLoadedRef.current = false;
    removeLayersById([
      "wb_all_layer",
      "zoi_border_layer",
      "wb_single_layer",
      "mws_boundary_layer",
      "terrain_layer",
      "drainage_layer",
      "wb_top_layer",
      "zoi_top_layer",
      "selected_waterbody_layer",
      "lulc_waterbody_layer",
      "lulc_zoi_layer",
      "lulc_zoi_excluded_layer",
      "wb_top_layer_mws",
    ]);
    removeLayersBySourceParam("clipped_lulc_filtered_mws");
    removeLayersBySourceParam("clipped_lulc_filtered_rwb");

    const view = map.getView();

    removeLulcLayers();

    // Helper: add LULC
    const addLulcLayer = async (
      styleName,
      idName,
      targetFeature = null,
      isInnerCrop = false
    ) => {
      if (!lulcYear) return null;

      let workspace = "LULC_level_3";
      let layerName = null;

      if (projectName && projectId) {
        layerName = `LULC_${lulcYear}_${projectName.toLowerCase()}_${projectId}__level_3`;
      }
      if (!projectName && !projectId && district && block) {
        layerName = `LULC_${lulcYear}_${district.toLowerCase()}_${block.toLowerCase()}_level_3`;
      }

      try {
        const lulcLayer = await getImageLayer(
          workspace,
          layerName,
          true,
          styleName
        );

        if (!lulcLayer) {
          console.error("LULC NOT FOUND:", layerName);
          return null;
        }

        lulcLayer.setZIndex(1);
        lulcLayer.set("id", idName);

        if (targetFeature && typeof lulcLayer.addFilter === "function") {
          lulcLayer.addFilter(
            new Crop({
              feature: targetFeature,
              wrapX: true,
              inner: isInnerCrop,
            })
          );
        }

        map.addLayer(lulcLayer);
        lulcLoadedRef.current = true;

        return lulcLayer;
      } catch (err) {
        console.error("LULC load failed:", err);
        return null;
      }
    };

    const showAllWaterbodies = () => {
      if (!geoData) return;
    
      const allWB = read4326(geoData);
      if (!allWB.length) return;
    
      // Remove previous ALL WB layer
      map.getLayers().forEach(layer => {
        if (layer.get("id") === "wb_all_layer") map.removeLayer(layer);
      });
    
      const wbLayer = new VectorLayer({
        source: new VectorSource({ features: allWB }),
        style: waterBodyStyle,
      });
    
      wbLayer.set("id", "wb_all_layer");
      wbLayer.setZIndex(5);
      map.addLayer(wbLayer);
    
      // ⭐ FIT MAP TO ALL WATERBODIES
      let fullExtent = allWB[0].getGeometry().getExtent().slice();
    
      allWB.forEach(f => {
        const ex = f.getGeometry().getExtent();
        fullExtent[0] = Math.min(fullExtent[0], ex[0]);
        fullExtent[1] = Math.min(fullExtent[1], ex[1]);
        fullExtent[2] = Math.max(fullExtent[2], ex[2]);
        fullExtent[3] = Math.max(fullExtent[3], ex[3]);
      });
    
      view.fit(fullExtent, {
        padding: [50, 50, 50, 50],
        duration: 400,
        maxZoom: 13, //  prevent zooming in too much
      });
    };
    const getZoomForAreaHa = (ha) => {
      if (!ha) return 18; // default closer
      if (ha < 0.05) return 20.5; 
      if (ha < 0.5) return 20;     // tiny ponds
      if (ha < 1) return 19;       // < 1 ha
      if (ha < 2) return 18.5;     // your case: 1.7 ha → zoom 18.5
      if (ha < 5) return 18;
      if (ha < 15) return 17;
      if (ha < 40) return 16;
      if (ha < 100) return 15;
    
      return 14; // big waterbodies
    };
    
    

    // ───── WATERBODY MODE ─────
    const addWaterbody = async () => {
      const isTehsil = !projectName && !projectId;

// PROJECT MODE — show ONLY selected
if (!isTehsil) {

  const allWB = read4326(geoData);
  const selectedFeatureOl = allWB.find(
    f => f.get("UID")?.toString() === normalizedWaterbody?.UID?.toString()
  );

  if (!selectedFeatureOl) {
    console.warn("Selected WB not found — falling back to ALL WBs");
    showAllWaterbodies();
    return;
  }

  // REMOVE ALL LAYERS BEFORE ADDING SELECTED
  map.getLayers().forEach(layer => {
    if (["wb_all_layer", "wb_selected_layer", "lulc_waterbody_layer"].includes(layer.get("id"))) {
      map.removeLayer(layer);
    }
  });
console.log(normalizedWaterbody)
  const areaHa =
  normalizedWaterbody?.areaOred ||
  normalizedWaterbody?.area_ha ||
  normalizedWaterbody?.AREA_HA ||
  normalizedWaterbody?.area ||
  null;

const targetZoom = getZoomForAreaHa(Number(areaHa));

view.fit(selectedFeatureOl.getGeometry().getExtent(), {
  padding: [20, 20, 20, 20],
  maxZoom: targetZoom,
  duration: 400,
});

  // FIT MAP TO SELECTED WB
  // view.fit(selectedFeatureOl.getGeometry().getExtent(), {
  //   padding: [20, 20, 20, 20],
  //   maxZoom: 16,
  //   duration: 350,
  // });

  // ADD ONLY SELECTED WB
  const wbSelected = new VectorLayer({
    source: new VectorSource({ features: [selectedFeatureOl] }),
    style: new Style({
      stroke: new Stroke({ color: "blue", width: 3 }),
    }),
  });

  wbSelected.set("id", "wb_selected_layer");
  wbSelected.setZIndex(10);
  map.addLayer(wbSelected);

  // LOAD LULC FOR SELECTED WB
  removeLulcLayers();
  await addLulcLayer("lulc_RWB", "lulc_waterbody_layer", selectedFeatureOl, false);

  return;
}

    // TEHSIL MODE — FINAL PATCH
if (isTehsil) {
  let wbGeometry = selectedWaterbody?.geometry || null;

  // fallback from geoData
  if (!wbGeometry && geoData?.type === "FeatureCollection") {
    const feats = geoData.features || [];
    let f = feats[0];

    if (normalizedWaterbody?.UID) {
      const match = feats.find(
        feat => feat?.properties?.UID?.toString() === normalizedWaterbody.UID?.toString()
      );
      if (match) f = match;
    }

    if (f?.geometry) wbGeometry = f.geometry;
  }

  if (!wbGeometry) {
    console.warn("No tehsil WB geometry found.");
    return;
  }

  // Convert geometry → OL geometry
  let realGeom = null;

  if (typeof wbGeometry.getExtent === "function") {
    realGeom = wbGeometry;
  }
  else if (wbGeometry.type === "Polygon" || wbGeometry.type === "MultiPolygon") {
    realGeom = geojsonReaderRef.current.readGeometry(wbGeometry, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:4326",
    });
  }
  else if (wbGeometry.flatCoordinates) {
    const flat = wbGeometry.flatCoordinates;
    const stride = wbGeometry.stride || 2;
    const ring = [];
    for (let i = 0; i < flat.length; i += stride) {
      ring.push([flat[i], flat[i + 1]]);
    }
    realGeom = new Polygon([ring]);
  }

  if (!realGeom) {
    console.error("Could not rebuild tehsil geometry");
    return;
  }

  // SAFE Feature creation
  const tehsilFeature = new Feature();
  tehsilFeature.setGeometry(realGeom);

  // copy only safe primitive properties (avoid OL objects)
  if (selectedWaterbody) {
    Object.entries(selectedWaterbody).forEach(([k, v]) => {
      if (k !== "geometry" &&
         (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v == null)
      ) {
        tehsilFeature.set(k, v);
      }
    });
  }
  console.log(selectedWaterbody)

  // Extract area (from tehsil WB)
const areaHa =
selectedWaterbody?.properties.areaOred ||
selectedWaterbody?.properties.area_ha ||
selectedWaterbody?.properties.AREA_HA ||
selectedWaterbody?.properties.area_ored ||
normalizedWaterbody?.areaOred ||
normalizedWaterbody?.area_ha ||
normalizedWaterbody?.AREA_HA ||
normalizedWaterbody?.area ||
null;

// Compute zoom based on WB area
const targetZoom = getZoomForAreaHa(Number(areaHa));


  const geom = tehsilFeature.getGeometry();
  view.fit(geom.getExtent(), {
    padding: [20, 20, 20, 20],
    maxZoom: targetZoom,
    duration: 300,
  });

  const wbLayer = new VectorLayer({
    source: new VectorSource({ features: [tehsilFeature] }),
    style: new Style({ stroke: new Stroke({ color: "blue", width: 3 }) }),
  });

  wbLayer.set("id", "wb_single_layer");
  wbLayer.setZIndex(10);
  map.addLayer(wbLayer);

  removeLulcLayers();
  await addLulcLayer("lulc_RWB", "lulc_waterbody_layer", tehsilFeature, false);

  return;
}

    };

    // =========================
// SAFE ZOI MATCHER (Tehsil + Project)
// =========================
const matchZoiFeature = (zoiList, selectedWB) => {
  if (!zoiList || !selectedWB) return null;

  // Determine UID from all possible positions
  let uid =
    selectedWB.UID ||
    selectedWB.uid ||
    selectedWB.waterbody_uid ||
    selectedWB.properties?.UID ||
    selectedWB.properties?.uid ||
    null;

  if (!uid) return null;
  uid = uid.toString().trim();

  return zoiList.find((f) => {
    const fu =
      f.get("UID") ||
      f.get("uid") ||
      f.get("waterbody_uid");

    return fu?.toString().trim() === uid;
  });
};
// ───── ZOI MODE ─────
const addZoi = async () => {
  if (!normalizedWaterbody) return;

  const map = mapRef.current;

  // 1) Read ZOI Features safely
  const zoiOl = getZoiOlFeatures();
  if (!zoiOl?.length) {
    console.warn("ZOI list empty in basemap");
    return;
  }

  // 2) Match correct ZOI (works for both project + tehsil)
  const selectedZoi = matchZoiFeature(zoiOl, normalizedWaterbody);
  if (!selectedZoi) {
    console.warn("No ZOI matched");
    return;
  }

  // 3) Pass ZOI area
  if (onZoiArea) {
    const rawArea =
      selectedZoi.get("zoi_area") ||
      selectedZoi.get("ZOI_AREA") ||
      selectedZoi.get("area_ha") ||
      selectedZoi.get("AREA_HA") ||
      null;

    onZoiArea(rawArea ? Number(rawArea) : null);
  }

  // 4) Clone geometry
  const zoiFeature = new Feature(selectedZoi.getGeometry().clone());
  const geom = zoiFeature.getGeometry();

  // 5) Zoom — increased
  if (geom) {
    map.getView().fit(geom.getExtent(), {
      padding: [30, 30, 30, 30],
      maxZoom: 19.5,
      duration: 450,
    });
  }

  // 6) Add ZOI border
  const zoiLayer = new VectorLayer({
    source: new VectorSource({ features: [zoiFeature] }),
    style: new Style({
      stroke: new Stroke({ color: "yellow", width: 3 }),
    }),
  });
  zoiLayer.set("id", "zoi_border_layer");
  map.addLayer(zoiLayer);

  // 7) Add LULC clipped to ZOI (allowed)
  removeLulcLayers();
  await addLulcLayer("waterrej_lulc", "lulc_zoi_layer", zoiFeature, false);

  // ----------------------------------------------------------------------
  // ⭐ PROJECT MODE — UNTOUCHED (same as your original working logic)
  // ----------------------------------------------------------------------
  if (projectName && projectId && geoData) {
    const allWB = read4326(geoData);
    const matchedWB = allWB.find(
      (f) => f.get("UID")?.toString() === normalizedWaterbody.UID?.toString()
    );

    if (matchedWB) {
      const wbFeature = new Feature(matchedWB.getGeometry().clone());

      const wbLayer = new VectorLayer({
        source: new VectorSource({ features: [wbFeature] }),
        style: new Style({
          stroke: new Stroke({ color: "blue", width: 3 }),
        }),
      });

      wbLayer.set("id", "wb_single_layer");
      wbLayer.setZIndex(99999);
      map.addLayer(wbLayer);

      const lulcLayer = map
        .getLayers()
        .getArray()
        .find((l) => l.get("id") === "lulc_zoi_layer");

      if (lulcLayer) {
        lulcLayer.addFilter(
          new Crop({
            feature: wbFeature,
            wrapX: true,
            inner: true,
          })
        );
      }
    }
  }

// TEHSIL MODE — FINAL FIX (WB ALWAYS BLUE + ALWAYS VISIBLE)
if (!projectName && !projectId) {

  let wbGeom = selectedWaterbody?.geometry;

  if (!wbGeom) {
    console.warn("Tehsil ZOI → No WB geometry found, cannot draw waterbody");
    return;
  }

  // Convert GeoJSON → OL Feature
  const wbFeatureOl = geojsonReaderRef.current.readFeature(
    {
      type: "Feature",
      geometry: wbGeom,
      properties: {
        UID: selectedWaterbody?.UID,
        name: selectedWaterbody?.waterbody_name,
      },
    },
    {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:4326",
    }
  );

  const wbGeometry = wbFeatureOl.getGeometry();

  // --- HARD FIX: if geometry failed to load ---
  if (!wbGeometry) {
    console.error(" Waterbody Geometry is NULL — cannot draw");
    return;
  }

  // Force MultiPolygon handling  
  if (wbGeometry.getType() === "Polygon") {
    wbGeometry.translate(0, 0); // forces OL to "wake up" polygon
  }

  // ADD WB HIGHLIGHT LAYER
  const wbLayer = new VectorLayer({
    source: new VectorSource({ features: [wbFeatureOl] }),
    style: new Style({
      stroke: new Stroke({
        color: "blue",
        width: 4,        // THICKER to guarantee visibility
      }),
    }),
  });

  wbLayer.set("id", "wb_single_layer");
  wbLayer.setZIndex(99999999);
  map.addLayer(wbLayer);
       const lulcLayer = map
        .getLayers()
        .getArray()
        .find((l) => l.get("id") === "lulc_zoi_layer");

      if (lulcLayer) {
        lulcLayer.addFilter(
          new Crop({
            feature: wbFeatureOl,
            wrapX: true,
            inner: true,
          })
        );
      }
}


  // 9) Top ZOI highlight
  const zoiTop = new VectorLayer({
    source: new VectorSource({ features: [zoiFeature] }),
    style: new Style({
      stroke: new Stroke({ color: "yellow", width: 3 }),
    }),
  });
  zoiTop.set("id", "zoi_top_layer");
  zoiTop.setZIndex(1000000);
  map.addLayer(zoiTop);
};

const buildRealGeom = (wbGeom) => {
  if (!wbGeom) return null;

  // Case 1: already OL geometry
  if (typeof wbGeom.getExtent === "function") {
    return wbGeom;
  }

  // Case 2: proper GeoJSON Polygon / MultiPolygon
  if (wbGeom.type === "Polygon" || wbGeom.type === "MultiPolygon") {
    return geojsonReaderRef.current.readGeometry(wbGeom, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:4326",
    });
  }

  // Case 3: OpenLayers raw geometry (flatCoordinates)
  if (wbGeom.flatCoordinates) {
    const flat = wbGeom.flatCoordinates;
    const stride = wbGeom.stride || 2;
    const ring = [];

    for (let i = 0; i < flat.length; i += stride) {
      ring.push([flat[i], flat[i + 1]]);
    }
    return new Polygon([ring]);
  }

  console.warn("Unknown geometry format:", wbGeom);
  return null;
};


const addMws = async () => {
  if (!normalizedWaterbody || !selectedWaterbody) {
    console.warn("normalizedWaterbody OR selectedWaterbody missing");
    return;
  }

  const map = mapRef.current;

  // Wait until OL map is fully initialized
  if (!map?.isReady) {
    await new Promise((resolve) => {
      const check = () => (map?.isReady ? resolve() : setTimeout(check, 40));
      check();
    });
  }

  const view = map.getView();
  const isProject = projectName && projectId;
  const isTehsil = !isProject;

  // ---------------------------------------------------
  // 1) FETCH / SELECT MWS FEATURE
  // ---------------------------------------------------
  let selectedMws = null;
  let mwsUid = null;

  // ---------- PROJECT MODE (unchanged) ----------
  if (isProject) {
    mwsUid =
      normalizedWaterbody?.MWS_UID?.toString() ||
      normalizedWaterbody?.MWS_ID?.toString();

    if (!mwsUid) {
      console.warn("Project mode → missing MWS UID");
      return;
    }

    const allMws = geojsonReaderRef.current.readFeatures(mwsData || []);
    selectedMws = allMws.find((f) => {
      const fu = f.get("uid") || f.get("UID") || f.get("MWS_UID");
      return fu?.toString() === mwsUid;
    });

    if (!selectedMws) {
      console.warn("Project → No matching MWS for", mwsUid);
      return;
    }
  }

  // ---------- TEHSIL MODE (fix: match by UID) ----------
  if (isTehsil) {
    let allMws = [];

    // mwsData already OL features?
    if (
      Array.isArray(mwsData) &&
      mwsData.length &&
      typeof mwsData[0].getGeometry === "function"
    ) {
      allMws = mwsData;
    }
    // or a GeoJSON FeatureCollection?
    else if (mwsData?.type === "FeatureCollection") {
      allMws = read4326(mwsData);
    }

    const wbUid =
      normalizedWaterbody?.UID?.toString() ||
      normalizedWaterbody?.uid?.toString() ||
      null;

    if (allMws.length && wbUid) {
      // 🔑 MAIN LOGIC: match tehsil MWS by UID of waterbody
      selectedMws = allMws.find((f) => {
        const fu =
          f.get("UID") ||
          f.get("uid") ||
          f.get("MWS_UID") ||
          f.get("waterbody_uid");
        return fu?.toString() === wbUid;
      });

      if (!selectedMws) {
        console.warn("Tehsil → No MWS matched for WB UID:", wbUid);
        return;
      }
    } else {
      // Fallback: old raw-geometry path (if you still ever send it like that)
      const rawGeom = mwsData?.values_?.geometry;
      if (!rawGeom) {
        console.error("Tehsil → No MWS geometry found");
        return;
      }

      const flat = rawGeom.flatCoordinates;
      const stride = rawGeom.stride || 2;
      const ring = [];
      for (let i = 0; i < flat.length; i += stride) {
        ring.push([flat[i], flat[i + 1]]);
      }

      selectedMws = new Feature({
        geometry: new Polygon([ring]),
        UID: mwsData?.uid,
      });
    }
  }

  if (!selectedMws) {
    console.warn("No MWS found for any mode.");
    return;
  }

  // ---------------------------------------------------
  // 2) MultiPolygon for cropping
  // ---------------------------------------------------
  let multiPoly = null;
  const g = selectedMws.getGeometry();
  if (g) {
    multiPoly = g.getType() === "Polygon"
      ? new MultiPolygon([g.getCoordinates()])
      : g;
  }

  // ---------------------------------------------------
  // 3) Load Terrain & Drainage Layers
  // ---------------------------------------------------
  const terrainKey = isProject
    ? `${projectName.toLowerCase()}_${projectId}_terrain_raster`
    : `${district.toLowerCase()}_${block.toLowerCase()}_terrain_raster`;

  const drainageKey = isProject
    ? `${projectName.toLowerCase()}_${projectId}`
    : `${district.toLowerCase()}_${block.toLowerCase()}`;

  const [terrainLayer, drainageLayer] = await Promise.all([
    getImageLayer("terrain", terrainKey, true, "Terrain_Style_11_Classes").catch(
      (err) => {
        console.error("Terrain load failed:", err);
        return null;
      }
    ),
    getVectorLayers("drainage", drainageKey, true, "drainage").catch((err) => {
      console.error("Drainage load failed:", err);
      return null;
    }),
  ]);

  // --- TERRAIN (bottom) ---
  if (terrainLayer) {
    terrainLayer.setOpacity(0.7);
    terrainLayer.set("id", "terrain_layer");
    terrainLayer.setZIndex(1);

    if (multiPoly && terrainLayer.addFilter) {
      terrainLayer.addFilter(
        new Crop({
          feature: new Feature(multiPoly),
          wrapX: false,
          inner: false,
        })
      );
    }

    map.addLayer(terrainLayer);
  }

  // --- DRAINAGE (above terrain) ---
  if (drainageLayer) {
    const colors = [
      "#03045E",
      "#023E8A",
      "#0077B6",
      "#0096C7",
      "#00B4D8",
      "#48CAE4",
      "#90E0EF",
      "#ADE8F4",
      "#CAF0F8",
    ];

    drainageLayer.setStyle((feature) => {
      const o = feature.get("ORDER") || 1;
      return new Style({
        stroke: new Stroke({
          color: colors[o - 1] || colors[0],
          width: 2,
        }),
      });
    });

    drainageLayer.set("id", "drainage_layer");
    drainageLayer.setZIndex(2);

    if (multiPoly && drainageLayer.addFilter) {
      drainageLayer.addFilter(
        new Crop({
          feature: new Feature(multiPoly),
          wrapX: false,
          inner: false,
        })
      );
    }

    map.addLayer(drainageLayer);
  }

  // ---------------------------------------------------
  // 4) Draw MWS boundary
  // ---------------------------------------------------
  const boundaryLayer = new VectorLayer({
    source: new VectorSource({ features: [selectedMws] }),
    style: new Style({
      stroke: new Stroke({ color: "black", width: 3 }),
    }),
  });

  boundaryLayer.set("id", "mws_boundary_layer");
  boundaryLayer.setZIndex(3);
  map.addLayer(boundaryLayer);

  const mwsGeom = selectedMws.getGeometry();
  if (mwsGeom) {
    view.fit(mwsGeom.getExtent(), {
      padding: [60, 60, 60, 60],
      maxZoom: 17,
    });
  }

  // ---------------------------------------------------
  // 5) UNIVERSAL WATERBODY DRAWING (PROJECT + TEHSIL)
  // ---------------------------------------------------
  let wbFeatureObj = null;

  // PROJECT MODE → from geoData by UID
  if (isProject && geoData?.type === "FeatureCollection") {
    const allWB = read4326(geoData);
    wbFeatureObj = allWB.find(
      (f) =>
        f.get("UID")?.toString() === normalizedWaterbody.UID?.toString()
    );
  }

  // TEHSIL (or fallback) → from selectedWaterbody.geometry
  if (!wbFeatureObj && selectedWaterbody?.geometry) {
    const wbGeom = buildRealGeom(selectedWaterbody.geometry);
    if (!wbGeom) {
      console.error("Failed to rebuild WB geometry");
      return;
    }
    wbFeatureObj = new Feature({ geometry: wbGeom });
  }

  if (!wbFeatureObj) {
    console.warn("No WB geometry found for project/tehsil");
    return;
  }

  // WB base layer
  const wbLayer = new VectorLayer({
    source: new VectorSource({ features: [wbFeatureObj] }),
    style: new Style({
      stroke: new Stroke({ color: "blue", width: 3 }),
    }),
  });
  wbLayer.set("id", "selected_waterbody_layer");
  wbLayer.setZIndex(50);
  map.addLayer(wbLayer);

  // WB top highlight
  const wbTop = new VectorLayer({
    source: new VectorSource({ features: [wbFeatureObj] }),
    style: new Style({
      stroke: new Stroke({ color: "blue", width: 3 }),
    }),
  });
  wbTop.set("id", "wb_top_layer_mws");
  wbTop.setZIndex(999);
  map.addLayer(wbTop);

// ---------------------------------------------
//  ADD WATERBODY ICON (centroid marker)
// ---------------------------------------------
try {
  const geom = wbFeatureObj.getGeometry();
  let center = null;

  if (geom.getType() === "Polygon") {
    center = geom.getInteriorPoint().getCoordinates();
  } else if (geom.getType() === "MultiPolygon") {
    center = geom.getInteriorPoints().getFirstCoordinate();
  }

  if (center) {
    const iconFeature = new Feature({
      geometry: new Point(center),
    });

    const iconLayer = new VectorLayer({
      source: new VectorSource({ features: [iconFeature] }),
      style: waterbodyPointStyle,
    });

    iconLayer.set("id", "wb_icon_layer_mws");
    iconLayer.setZIndex(2000); // always visible above everything
    map.addLayer(iconLayer);
  }
} catch (e) {
  console.error("Failed to add WB icon:", e);
}

  map.renderSync();
};

const addPlantations = () => {
  const map = mapRef.current;
  if (!map) return;

  if (
    !plantationGeodata ||
    plantationGeodata.type !== "FeatureCollection" ||
    !Array.isArray(plantationGeodata.features) ||
    plantationGeodata.features.length === 0
  ) {
    console.warn("Invalid or empty plantationGeodata:", plantationGeodata);
    return;
  }
  const safePlantationData = filteredGeoJSON(plantationGeodata);
  const features = read4326(safePlantationData);
  
  if (!features || !features.length) return;

  // remove old plantation layer
  removeLayersById(["plantation_layer"]);
  const plantationStyle = new Style({
    stroke: new Stroke({
      color: "yellow", 
      width: 3,
    }),
  });

  const plantationLayer = new VectorLayer({
    source: new VectorSource({ features }),
    style: plantationStyle,
  });

  plantationLayer.set("id", "plantation_layer");
  plantationLayer.setZIndex(10);
  map.addLayer(plantationLayer);

  let extent = features[0].getGeometry().getExtent().slice();

  features.forEach((f) => {
    const ex = f.getGeometry().getExtent();
    extent[0] = Math.min(extent[0], ex[0]);
    extent[1] = Math.min(extent[1], ex[1]);
    extent[2] = Math.max(extent[2], ex[2]);
    extent[3] = Math.max(extent[3], ex[3]);
  });

  map.getView().fit(extent, {
    padding: [40, 40, 40, 40],
    maxZoom: 17,
    duration: 400,
  });

  features.forEach((f) => {
    f.set("layerType", "plantation");
  });


  
};

const showOnlySelectedPlantation = () => {
  const map = mapRef.current;
  if (!map || !selectedPlantation?.geometry) return;

  removeLayersById(["plantation_layer", "plantation_selected_layer"]);

  // Convert GeoJSON → OL geometry
  const geom = geojsonReaderRef.current.readGeometry(
    selectedPlantation.geometry,
    {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:4326",
    }
  );

  const feature = new Feature({ geometry: geom });
  feature.set("layerType", "plantation");

  const selectedLayer = new VectorLayer({
    source: new VectorSource({ features: [feature] }),
    style: new Style({
      stroke: new Stroke({
        color: "yellow",
        width: 4,
      }),
    }),
  });

  selectedLayer.set("id", "plantation_selected_layer");
  selectedLayer.setZIndex(20);

  map.addLayer(selectedLayer);
};

    (async () => {
      try {
        if (mode === "waterbody") await addWaterbody();
        else if (mode === "zoi") await addZoi();
        else if (mode === "mws") await addMws();
        if (mode === "plantation") {
          if (selectedPlantation) {
            showOnlySelectedPlantation();
            return;
          } else {
            addPlantations(); // show all again
            return;
          }
        }
            } catch (err) {
        console.error("[DashboardBasemap] mode layer error:", err);
      }
    })();

    return () => {
      removeLayersById([
        "plantation_layer",
        "wb_all_layer",
        "zoi_border_layer",
        "wb_single_layer",
        "mws_boundary_layer",
        "terrain_layer",
        "drainage_layer",
        "wb_top_layer",
        "zoi_top_layer",
        "selected_waterbody_layer",
        "lulc_waterbody_layer",
        "lulc_zoi_layer",
        "lulc_zoi_excluded_layer",
        "wb_top_layer_mws",
      ]);
    };
  }, [
    mode,
    geoData,
    zoiFeatures,
    mwsData,
    selectedWaterbody,
    selectedFeature,
    lulcYear,
    projectName,
    projectId,
    organizationLabel,
    onSelectWaterbody,
    onZoiArea,
    district,
    block,
    plantationGeodata,
    selectedPlantation
  ]);

  return (
    <div className="relative w-full">
      {/* MAP DIV */}
      <div
        ref={mapElement}
        style={{
          width: selectedPlantation || selectedWaterbody ? "100%" : "1800px",
          height: styleHeight,
          border: "1px solid #ccc",
        }}
      />



      {/* POPUP ELEMENT */}
      <div
        ref={popupRef}
        style={{
          position: "absolute",
          zIndex: 2000,
          background: "white",
          padding: "6px",
          borderRadius: "4px",
          border: "1px solid #ccc",
          display: "none",
          pointerEvents: "auto",
        }}
      />
      {/* LEFT INFO PANEL */}
{selectedPlantation && (
  <div
    className="absolute top-6 left-6 z-[1200] bg-white rounded-lg shadow-lg p-4 w-[260px]"
  >
    <div className="flex flex-col gap-2 text-sm text-gray-800">
      <div className="font-semibold text-base">
        {selectedPlantation?.Name?.replace(/\s*\(.*?\)\s*/g, "").trim() || "Plantation Site"}
      </div>

      <div className="text-gray-600">
        <span className="font-medium">Patch Suitability:</span>{" "}
        {selectedPlantation?.patch_suitability || "NA"}
      </div>

      <div className="text-gray-600">
        <span className="font-medium">Area (ha):</span>{" "}
        {selectedPlantation?.area_ha
          ? Number(selectedPlantation.area_ha).toFixed(2)
          : "NA"}
      </div>
    </div>
  </div>
)}


      {/* ZOOM CONTROLS */}
      <div className="absolute top-10 right-4 flex flex-col gap-1 z-[1100]">
        {["+", "–"].map((sign) => (
          <button
            key={sign}
            className="bg-white border border-gray-300 rounded-md w-10 h-10 text-xl 
                     cursor-pointer hover:bg-gray-100 active:scale-95 transition"
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              const view = map.getView();
              const delta = sign === "+" ? 1 : -1;

              view.animate({
                zoom: view.getZoom() + delta,
                duration: 300,
              });
            }}
          >
            {sign}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardBasemap;

