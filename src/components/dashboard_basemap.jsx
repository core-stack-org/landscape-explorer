// DashboardBasemap.jsx
import React, { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Stroke, Icon ,Fill} from "ol/style";
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


const DashboardBasemap = ({
  id,
  type,
  mode = "waterbody",
  geoData,
  zoiFeatures,
  mwsData,
  selectedWaterbody,
  selectedFeature,
  lulcYear,
  projectName,
  projectId,
  district,
  block,
  onSelectWaterbody,
  onZoiArea,
  organizationLabel,
  styleHeight = "900px",
}) => {

  const mapRef = useRef(null);
  const mapElement = useRef(null);
  const popupRef = useRef(null);
  const geojsonReaderRef = useRef(new GeoJSON());
  const lulcLoadedRef = useRef(false);

  const read4326 = (data) =>
    geojsonReaderRef.current.readFeatures(data, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:4326",
    });
   
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
            anchor: [0.5, 1],
            src: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
            scale: 0.05,
          }),
        })
      );
    }
    return styles;
  };

  const removeLayersById = (ids = []) => {
    const m = mapRef.current;
    if (!m) return;
    const layers = m.getLayers().getArray().slice();
    layers.forEach((layer) => {
      const lid = layer.get("id");
      if (lid && ids.includes(lid)) {
        try {
          m.removeLayer(layer);
        } catch (e) {
          // ignore
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
      } catch {}
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
  
      // If layer is WMS or Image with LAYER name
      try {
        const params = layer.getSource?.().getParams?.();
        if (params?.LAYERS && params.LAYERS.includes("LULC")) {
          map.removeLayer(layer);
        }
      } catch {}
  
      // If layer is XYZ or raster-type LULC
      const src = layer.getSource?.();
      if (src?.urls && src?.urls[0]?.includes("LULC")) {
        map.removeLayer(layer);
      }
    });
  };
  

  // Create map once
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

    const overlay = new Overlay({
      element: popupRef.current,
      positioning: "bottom-center",
      offset: [0, -15],
      stopEvent: false,
    });
    map.addOverlay(overlay);
    map.overlayRef = overlay;

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
      } catch {}
    };
  }, []);

  

  // Combined Mode + LULC effect
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

// NORMALIZE TEHSIL selectedWaterbody
let normalizedWaterbody = selectedWaterbody;

// Tehsil passes OL Feature instead of plain object
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


   
    // Reset LULC loaded flag
    lulcLoadedRef.current = false;

    // Clear all layers
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
    ]);
    removeLayersBySourceParam("clipped_lulc_filtered_mws");
    removeLayersBySourceParam("clipped_lulc_filtered_rwb");

    const view = map.getView();

    removeLulcLayers()
    // Helper to add LULC layer
    const addLulcLayer = async (
     
      styleName,
      idName,
      targetFeature = null,
      isInnerCrop = false
    ) => {
      if (!lulcYear) return null;
    
      let workspace = "LULC_level_3";
      let layerName = null;
    
      // PROJECT FETCHING 
      if (projectName && projectId) {
        layerName = `LULC_${lulcYear}_${projectName}_${projectId}__level_3`;
      }
      // TEHSIL FETCHING 
      if (!projectName && !projectId && district && block) {
        layerName = `LULC_${lulcYear}_${block.toLowerCase()}_level_3`;
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
    

    const addWaterbody = async () => {
      const isTehsil = !projectName && !projectId;
    
      // PROJECT MODE
      if (!isTehsil) {
        if (!geoData) return;
    
        const allWB = read4326(geoData);
    
        const wbLayer = new VectorLayer({
          source: new VectorSource({ features: allWB }),
          style: waterBodyStyle,
        });
        wbLayer.setZIndex(5);
        wbLayer.set("id", "wb_all_layer");
        map.addLayer(wbLayer);
    
        if (normalizedWaterbody) {
          const selectedFeatureOl = allWB.find(
            (f) =>
              f.get("UID")?.toString() === normalizedWaterbody.UID?.toString()
          );
    
          if (selectedFeatureOl) {
            view.fit(selectedFeatureOl.getGeometry().getExtent(), {
              padding: [20, 20, 20, 20],
            });
    removeLulcLayers()
            await addLulcLayer(
              "lulc_RWB",
              "lulc_waterbody_layer",
              selectedFeatureOl,
              false
            );
    
            const wbTop = new VectorLayer({
              source: new VectorSource({ features: [selectedFeatureOl] }),
              style: new Style({
                stroke: new Stroke({ color: "blue", width: 3 }),
              }),
            });
            wbTop.setZIndex(11);
            wbTop.set("id", "wb_top_layer");
            map.addLayer(wbTop);
          }
        }
    
        return;
      }
    
      // TEHSIL MODE (single feature)
if (isTehsil) {
  if (!selectedWaterbody) return;

  // Clean properties by removing internal geometry
  const cleanProps = { ...selectedWaterbody };
  delete cleanProps.geometry;            
  delete cleanProps.Geometry;            
  delete cleanProps.properties;          

  let tehsilFeature = null;

  // Convert using ONLY valid GeoJSON geometry
  tehsilFeature = geojsonReaderRef.current.readFeature(
    {
      type: "Feature",
      geometry: selectedWaterbody.geometry || selectedWaterbody.Geometry,
      properties: cleanProps,
    },
    {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:4326",
    }
  );

  const geom = tehsilFeature.getGeometry();
  if (!geom) {
    console.warn("❗ Tehsil feature has no valid geom AFTER FIX:", tehsilFeature);
    return;
  }

  view.fit(geom.getExtent(), {
    padding: [20, 20, 20, 20],
    maxZoom: 17,
    duration: 300,
  });

  const wbLayer = new VectorLayer({
    source: new VectorSource({ features: [tehsilFeature] }),
    style: new Style({
      stroke: new Stroke({ color: "blue", width: 3 }),
    }),
  });
  wbLayer.set("id", "wb_single_layer");
  wbLayer.setZIndex(10);
  map.addLayer(wbLayer);
removeLulcLayers()
  await addLulcLayer(
    "lulc_RWB",                       
    "lulc_waterbody_layer",
    tehsilFeature,
    false
  );

  return;
}


    };
    

    const addZoi = async () => {
      if (!normalizedWaterbody) return;
    
      const zoiOl = getZoiOlFeatures();
      if (!zoiOl.length) return;
    
      let selectedZoi = null;
    
      // ------------------------------------------------------
      // ⭐ PROJECT MODE → match by UID
      // ------------------------------------------------------
      if (normalizedWaterbody.UID) {
        selectedZoi = zoiOl.find(
          (f) =>
            f.get("UID")?.toString() === normalizedWaterbody.UID?.toString()
        );
      }
    
      // TEHSIL MODE → NO UID → auto-select first polygon
      if (!projectName && !projectId) {
        const wbUID = normalizedWaterbody.properties.UID?.toString();
    
        selectedZoi = zoiOl.find(
          (f) => f.get("UID")?.toString() === wbUID
        );
    
        if (!selectedZoi) {
          console.warn(" No matching ZOI found for UID:", wbUID);
          return;
        }
    
      }
    
      if (!selectedZoi) return;
    
      // Convert and zoom
      const zoiFeature = new Feature(selectedZoi.getGeometry().clone());
      const geom = zoiFeature.getGeometry();
    
      if (geom) {
        map.getView().fit(geom.getExtent(), {
          padding: [40, 40, 40, 40],
          maxZoom: 17,
          duration: 500,
        });
      }
    
      // Draw border
      const zoiLayer = new VectorLayer({
        source: new VectorSource({ features: [zoiFeature] }),
        style: new Style({ stroke: new Stroke({ color: "yellow", width: 3 }) }),
      });
      zoiLayer.set("id", "zoi_border_layer");
      map.addLayer(zoiLayer);
    removeLulcLayers()
      // Add LULC with crop
      await addLulcLayer(
        "waterrej_lulc",
        "lulc_zoi_layer",
        zoiFeature,
        false
      );

      
    
      // ------------------------------------------------------
      // ⭐ WATERBODY INSIDE ZOI
      // Only project mode has geoData
      // ------------------------------------------------------
      if (geoData && normalizedWaterbody.UID) {
        const allWB = read4326(geoData);
        const matchedWB = allWB.find(
          (f) =>
            f.get("UID")?.toString() === normalizedWaterbody.UID?.toString()
        );
    
        if (matchedWB) {
          const wbFeature = new Feature(matchedWB.getGeometry().clone());
    
          const wbLayer = new VectorLayer({
            source: new VectorSource({ features: [wbFeature] }),
            style: new Style({ stroke: new Stroke({ color: "blue", width: 3 }) }),
          });
          wbLayer.set("id", "wb_single_layer");
          map.addLayer(wbLayer);
    
          const lulcLayer = map
            .getLayers()
            .getArray()
            .find((l) => l.get("id") === "lulc_zoi_layer");
    
          if (lulcLayer) {
            lulcLayer.addFilter(
              new Crop({ feature: wbFeature, wrapX: true, inner: true })
            );
          }
        }
      }

// ⭐ TEHSIL MODE — use EXACT SAME LOGIC as addWaterbody()
if (!projectName && !projectId) {

  if (!selectedWaterbody || !selectedWaterbody.geometry) {
    console.warn("❗ No geometry found for Tehsil waterbody in ZOI mode");
    return;
  }

  // 1️⃣ Make clean props
  const cleanProps = { ...selectedWaterbody };
  delete cleanProps.geometry;
  delete cleanProps.Geometry;
  delete cleanProps.properties;

  // 2️⃣ Create OL Feature EXACTLY like waterbody mode
  const wbFeatureOl = geojsonReaderRef.current.readFeature(
    {
      type: "Feature",
      geometry: selectedWaterbody.geometry,
      properties: cleanProps,
    },
    {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:4326",
    }
  );

  // 3️⃣ Draw blue WB outline
  const wbLayer = new VectorLayer({
    source: new VectorSource({ features: [wbFeatureOl] }),
    style: new Style({
      stroke: new Stroke({ color: "blue", width: 3 }),
    }),
  });
  wbLayer.set("id", "wb_single_layer");
  wbLayer.setZIndex(99999);
  map.addLayer(wbLayer);



  //  Cut out WB area from LULC (same as project)
  const lulcLayer = map
    .getLayers()
    .getArray()
    .find((l) => l.get("id") === "lulc_zoi_layer");

  if (lulcLayer) {
    lulcLayer.addFilter(
      new Crop({
        feature: wbFeatureOl,
        wrapX: true,
        inner: true, // REMOVE LULC inside WB
      })
    );
  }
}




    
      // Top highlight
      const zoiTop = new VectorLayer({
        source: new VectorSource({ features: [zoiFeature] }),
        style: new Style({ stroke: new Stroke({ color: "yellow", width: 3 }) }),
      });
      zoiTop.set("id", "zoi_top_layer");
      map.addLayer(zoiTop);
    };
    
    const addMws = async () => {

      if (!normalizedWaterbody || !selectedWaterbody) {
        console.warn("❗ normalizedWaterbody OR selectedWaterbody missing");
        return;
      }
    
      const map = mapRef.current;
      const view = map.getView();
    
      const isTehsil = !projectName && !projectId;
      const isProject = projectName && projectId;
    
      let selectedMws = null;
      let allMws = [];
      let mwsUid = null;
    
      // ------------------------------------
      // ⭐ PROJECT MODE
      // ------------------------------------
      if (isProject) {
        mwsUid = normalizedWaterbody?.MWS_UID?.toString();
    
        if (!mwsUid) {
          console.warn("❗ Project mode → missing MWS_UID");
          return;
        }
    
        try {
          allMws = geojsonReaderRef.current.readFeatures(mwsData || []);
        } catch (err) {
          console.error("Project mode → failed to parse mwsData:", err);
          return;
        }
    
        selectedMws = allMws.find((f) => f.get("uid")?.toString() === mwsUid);
    
        if (!selectedMws) {
          console.warn("❗ Project mode → No MWS matched for UID", mwsUid);
          return;
        }
      }
    
      // ------------------------------------
      // ⭐ TEHSIL MODE
      // ------------------------------------
      if (isTehsil) {
        const rawGeom = mwsData?.values_?.geometry;
    
        if (!rawGeom) {
          console.error("❗ Tehsil → NO GEOMETRY FOUND in mwsData");
          return;
        }
    
        // rebuild polygon from flatCoordinates
        let realGeom;
        try {
          const flat = rawGeom.flatCoordinates;
          const stride = rawGeom.stride || 2;
          const ring = [];
    
          for (let i = 0; i < flat.length; i += stride) {
            ring.push([flat[i], flat[i + 1]]);
          }
    
          realGeom = new Polygon([ring]);
        } catch (err) {
          console.error("❌ Failed to rebuild polygon:", err);
          return;
        }
    
        selectedMws = new Feature({
          geometry: realGeom,
          UID: mwsData?.uid
        });
      }
    
      // ------------------------------------
      // ⭐ DRAW MWS BOUNDARY
      // ------------------------------------
      try {
        const boundaryLayer = new VectorLayer({
          source: new VectorSource({ features: [selectedMws] }),
          style: new Style({
            stroke: new Stroke({ color: "black", width: 3 }),
            fill: null,
          }),
        });
    
        boundaryLayer.set("id", "mws_boundary_layer");
        boundaryLayer.setZIndex(3);
        map.addLayer(boundaryLayer);
      } catch (err) {
        console.error("❌ Failed to create boundary layer:", err);
        return;
      }
    
      // ------------------------------------
      // ⭐ FIT VIEW
      // ------------------------------------
      const geom = selectedMws.getGeometry?.();
      if (geom) {
        try {
          view.fit(geom.getExtent(), { padding: [60, 60, 60, 60], maxZoom: 17 });
        } catch (err) {
          console.error("❌ Error fitting view:", err);
        }
      }
    
      // ------------------------------------
      // ⭐ WATERBODY (ALWAYS USE selectedWaterbody)
      // ------------------------------------
      let wbFeatureObj = null;
    
      try {
        if (selectedWaterbody?.geometry) {
          wbFeatureObj = geojsonReaderRef.current.readFeature(
            {
              type: "Feature",
              geometry: selectedWaterbody.geometry,
              properties: { ...selectedWaterbody },
            },
            {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:4326",
            }
          );
        }
    
        if (!wbFeatureObj) {
          console.warn("❗ MWS Mode → No waterbody geometry found");
          return;
        }
    
        // WATERBODY OUTLINE LAYER
        const selectedWaterLayer = new VectorLayer({
          source: new VectorSource({ features: [wbFeatureObj] }),
          style: new Style({
            stroke: new Stroke({ color: "blue", width: 3 }),
          }),
        });
    
        selectedWaterLayer.set("id", "selected_waterbody_layer");
        selectedWaterLayer.setZIndex(10);
        map.addLayer(selectedWaterLayer);
    
        // WATERBODY TOP LAYER (always above everything)
        const wbTop = new VectorLayer({
          source: new VectorSource({ features: [wbFeatureObj] }),
          style: new Style({
            stroke: new Stroke({ color: "blue", width: 3 }),
          }),
        });
    
        wbTop.set("id", "wb_top_layer_mws");
        wbTop.setZIndex(999999);
        map.addLayer(wbTop);
    
      } catch (err) {
        console.error("❌ Failed to draw waterbody:", err);
      }
    
      // ------------------------------------
      // ⭐ MULTIPOLYGON FOR CROPPING
      // ------------------------------------
      let multiPoly = null;
      try {
        const selGeom = selectedMws.getGeometry?.();
        if (selGeom) {
          const type = selGeom.getType();
          if (type === "Polygon") {
            multiPoly = new MultiPolygon([selGeom.getCoordinates()]);
          } else {
            multiPoly = selGeom;
          }
        }
      } catch (err) {
        console.error("❌ multiPoly error:", err);
      }
    
      // ------------------------------------
      // ⭐ TERRAIN LAYER
      // ------------------------------------
      try {
        const terrainLayerName = isProject
          ? `${projectName.toLowerCase()}_${projectId}_terrain_raster`
          : `${district.toLowerCase()}_${block.toLowerCase()}_terrain_raster`;
    
        const terrainLayer = await getImageLayer(
          "terrain",
          terrainLayerName,
          true,
          "Terrain_Style_11_Classes"
        );
    
        if (terrainLayer) {
          terrainLayer.setOpacity(0.7);
          terrainLayer.setZIndex(0);
          terrainLayer.set("id", "terrain_layer");
          map.addLayer(terrainLayer);
    
          if (multiPoly && terrainLayer.addFilter) {
            terrainLayer.addFilter(
              new Crop({
                feature: new Feature(multiPoly),
                wrapX: false,
                inner: false,
              })
            );
          }
        }
      } catch (err) {
        console.error("Terrain error:", err);
      }
    
      // ------------------------------------
      // ⭐ DRAINAGE LAYER
      // ------------------------------------
      try {
        const drainageLayerName = isProject
          ? `${projectName.toLowerCase()}_${projectId}`
          : `${district.toLowerCase()}_${block.toLowerCase()}`;
    
        const drainageLayer = await getVectorLayers(
          "drainage",
          drainageLayerName,
          true,
          "drainage"
        );
    
        if (drainageLayer) {
          const drainageColors = [
            "#03045E", "#023E8A", "#0077B6", "#0096C7", "#00B4D8",
            "#48CAE4", "#90E0EF", "#ADE8F4", "#CAF0F8",
          ];
    
          drainageLayer.setStyle((feature) => {
            const order = feature.get("ORDER") || 1;
            return new Style({
              stroke: new Stroke({
                color: drainageColors[order - 1] || drainageColors[0],
                width: 2,
              }),
            });
          });
    
          drainageLayer.set("id", "drainage_layer");
          drainageLayer.setZIndex(2);
          map.addLayer(drainageLayer);
    
          if (multiPoly && drainageLayer.addFilter) {
            drainageLayer.addFilter(
              new Crop({
                feature: new Feature(multiPoly),
                wrapX: false,
                inner: false,
              })
            );
          }
        }
      } catch (err) {
        console.error("Drainage error:", err);
      }
    };
    
    (async () => {
      try {
        if (mode === "waterbody") {
          await addWaterbody();
        } else if (mode === "zoi") {
          await addZoi();
        } else if (mode === "mws") {
          await addMws();
        }
    
      } catch (err) {
        console.error("[DashboardBasemap] mode layer error:", err);
      }
    })();

    return () => {
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
    district,block
  ]);

  return (
    <div className="relative w-full">
      {/* MAP DIV */}
      <div
        id={id}
        ref={mapElement}
        style={{width: "100%", 
          width: selectedWaterbody ? "100%" : "1500px",
          height: styleHeight, 
          border: "1px solid #ccc" }}
      />

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
