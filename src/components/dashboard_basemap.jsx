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
import { unByKey } from "ol/Observable"; 



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

    const ensureOLFeature = (obj) => {
      if (obj instanceof Feature) return obj;
    
      const geom = obj.geometry
        ? new GeoJSON().readGeometry(obj.geometry, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:4326",
          })
        : null;
    
      return new Feature(geom);
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

    if (type === "tehsil") {
      if (!selectedWaterbody || !selectedFeature) {
        console.log("⏳ Waiting for tehsil selectedWaterbody + selectedFeature...");
        return;
      }
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
      if (!geoData) return;
      const allWB = read4326(geoData);

      const wbLayer = new VectorLayer({
        source: new VectorSource({ features: allWB }),
        style: waterBodyStyle,
      });
      wbLayer.setZIndex(5);
      wbLayer.set("id", "wb_all_layer");
      map.addLayer(wbLayer);

      if (selectedWaterbody) {
        const selectedFeatureOl = allWB.find(
          (f) => f.get("UID")?.toString() === selectedWaterbody.UID?.toString()
        );
        if (selectedFeatureOl) {
          view.fit(selectedFeatureOl.getGeometry(), {
            padding: [20, 20, 20, 20],
          });

          // Add LULC for selected waterbody
          await addLulcLayer(
            "lulc_RWB",
            "lulc_waterbody_layer",
            selectedFeatureOl,
            false
          );

          // Add waterbody border on top
          const wbTop = new VectorLayer({
            source: new VectorSource({ features: [selectedFeatureOl] }),
            style: new Style({
              stroke: new Stroke({ color: "blue", width: 3 }),
            }),
            fill: new Fill({
              color: "rgba(0,0,0,0.01)" // invisible but clickable
            })
          });
          wbTop.setZIndex(11);
          wbTop.set("id", "wb_top_layer");
          map.addLayer(wbTop);
        }
      } else {
        const extent = wbLayer.getSource().getExtent();
        if (extent && !Number.isNaN(extent[0]))
          view.fit(extent, { padding: [20, 20, 20, 20] });
      }

      // Click handler
      const key = "__dashboard_singleclick_key__";
      if (map[key]) {
        unByKey(map[key]);     
        map[key] = null;
      }

      map[key] = map.on("singleclick", (evt) => {
        let clickedProps = null;
        map.forEachFeatureAtPixel(evt.pixel, (feature) => {
          const props = feature.getProperties();
          const geom = feature.getGeometry();
          const gType =
            geom && typeof geom.getType === "function" ? geom.getType() : null;

          if (gType === "Point") {
            clickedProps = props;
            return true;
          }
          if (props?.waterbody_name || props?.waterbody) {
            clickedProps = props;
            return true;
          }
          return false;
        });

        if (clickedProps) {
          onSelectWaterbody?.({
            UID: clickedProps.UID,
            MWS_ID: clickedProps.MWS_ID || clickedProps.mws_id || clickedProps.mwsid, 
            name:
              clickedProps.waterbody_name ||
              clickedProps.waterbody ||
              clickedProps.name,
            Village: clickedProps.Village || clickedProps.village,
            Taluka: clickedProps.Taluka,
            District: clickedProps.District,
            State: clickedProps.State,
            siltRemoved: clickedProps.slit_excavated,
            areaOred: clickedProps.area_ored,
            pixel: evt.pixel,
          });
        }
      });

      const pointerKey = "__dashboard_pointermove_key__";
      if (map[pointerKey]) {
        unByKey(map[pointerKey]);    
        map[pointerKey] = null;
      }
      map[pointerKey] = map.on("pointermove", (evt) => {
        const hit = map.hasFeatureAtPixel(evt.pixel);
        map.getTargetElement().style.cursor = hit ? "pointer" : "";
      });
    };

    const addZoi = async () => {
      if (!selectedWaterbody) return;
    
      const zoiOl = getZoiOlFeatures();
      if (!zoiOl.length) return;
    
      const selectedZoi = zoiOl.find(
        (f) => f.get("UID")?.toString() === selectedWaterbody.UID?.toString()
      );
    
      if (!selectedZoi) return;
    
      // 🔥 MUST CONVERT HERE
      const zoiFeature = new Feature(selectedZoi.getGeometry().clone());
      const geom = zoiFeature.getGeometry();
if (geom) {
  map.getView().fit(geom.getExtent(), {
    padding: [40, 40, 40, 40],
    maxZoom: 17,
    duration: 500,
  });
}

    
      // Draw ZOI
      const zoiLayer = new VectorLayer({
        source: new VectorSource({ features: [zoiFeature] }),
        style: new Style({ stroke: new Stroke({ color: "yellow", width: 3 }) }),
      });
      zoiLayer.set("id", "zoi_border_layer");
      map.addLayer(zoiLayer);
    
      // 🔥 MUST PASS zoiFeature (not selectedZoi!)
      const lulcZoi = await addLulcLayer(
        "waterrej_lulc",
        "lulc_zoi_layer",
        zoiFeature,
        false
      );
    
      // WATERBODY
      if (geoData) {
        const allWB = read4326(geoData);
        const matchedWB = allWB.find(
          (f) => f.get("UID")?.toString() === selectedWaterbody.UID?.toString()
        );
    
        if (matchedWB) {
          const wbFeature = new Feature(matchedWB.getGeometry().clone());
    
          const wbLayer = new VectorLayer({
            source: new VectorSource({ features: [wbFeature] }),
            style: new Style({ stroke: new Stroke({ color: "blue", width: 3 }) }),
          });
          wbLayer.set("id", "wb_single_layer");
          map.addLayer(wbLayer);
    
          // 🔥 MUST PASS wbFeature (NOT matchedWB!)
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
    
      // TOP ZOI
      const zoiTop = new VectorLayer({
        source: new VectorSource({ features: [zoiFeature] }),
        style: new Style({ stroke: new Stroke({ color: "yellow", width: 3 }) }),
      });
      zoiTop.set("id", "zoi_top_layer");
      map.addLayer(zoiTop);
    };
    
    

    const addMws = async () => {
      if (!selectedWaterbody || !selectedFeature) return;
      if (!mwsData) return;
    
      const map = mapRef.current;
      const view = map.getView();
      const pName = projectName ? projectName.toLowerCase() : null;
        
      // 1) Extract correct MWS UID from selectedWaterbody
      const mwsUid = selectedWaterbody?.MWS_UID?.toString();
      if (!mwsUid) {
        console.warn("❗ selectedWaterbody.mws_id not found");
        return;
      }
        
      // 2) Convert MWS GeoJSON to OL features
      const allMws = geojsonReaderRef.current.readFeatures(mwsData, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      });
    
      // 3) Match correct MWS from GeoJSON
      const selectedMws = allMws.find(
        (f) => f.get("uid")?.toString() === mwsUid
      );
    
      if (!selectedMws) {
        console.warn("No matching MWS found for UID:", mwsUid);
        return;
      }
    
    
      // 4) Draw MWS boundary
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
    
      // 5) Fit map to the MWS polygon
      const geom = selectedMws.getGeometry();
      if (geom) {
        view.fit(geom.getExtent(), { padding: [50, 50, 50, 50] });
      }
    
      // 6) Highlight selected waterbody
      try {
        const selectedFeatureObj = new GeoJSON().readFeature(selectedFeature, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:4326",
        });
    
        const selectedWaterLayer = new VectorLayer({
          source: new VectorSource({ features: [selectedFeatureObj] }),
          style: new Style({
            stroke: new Stroke({ color: "blue", width: 3 }),
            fill: null,
          }),
        });
    
        selectedWaterLayer.set("id", "selected_waterbody_layer");
        selectedWaterLayer.setZIndex(5);
        map.addLayer(selectedWaterLayer);
      } catch (err) {
        console.error("Error adding selected waterbody layer:", err);
      }
    
      // 7) Create multiPolygon object
      let multiPoly = null;
      const type = selectedMws.getGeometry().getType();
    
      if (type === "Polygon") {
        multiPoly = new MultiPolygon([selectedMws.getGeometry().getCoordinates()]);
      } else if (type === "MultiPolygon") {
        multiPoly = selectedMws.getGeometry();
      }
    
      // 8) TERRAIN LAYER
      try {
        let terrainLayerName = null;
      
        // PROJECT MODE
        if (projectName && projectId) {
          const p = projectName.toLowerCase();
          terrainLayerName = `${p}_${projectId}_terrain_raster`;
        }
      
        // TEHSIL MODE
        if (!projectName && !projectId && district && block) {
          terrainLayerName = `${district.toLowerCase()}_${block.toLowerCase()}_terrain_raster`;
        }
            
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
      
          if (multiPoly && typeof terrainLayer.addFilter === "function") {
            terrainLayer.addFilter(
              new Crop({
                feature: new Feature(multiPoly),
                wrapX: false,
                inner: false,
              })
            );
          }
        } else {
          console.warn("Terrain not found:", terrainLayerName);
        }
      } catch (err) {
        console.error("Terrain error:", err);
      }
      
    
 // 9) DRAINAGE LAYER
try {
  let drainageLayerName = null;

  // PROJECT TYPE
  if (projectName && projectId) {
    drainageLayerName = `${projectName.toLowerCase()}_${projectId}`;
  }

  // TEHSIL TYPE
  if (!projectName && !projectId && district && block) {
    drainageLayerName = `${district.toLowerCase()}_${block.toLowerCase()}`;
  }

  const drainageLayer = await getVectorLayers(
    "drainage",
    drainageLayerName,
    true,
    "drainage"
  );

  if (drainageLayer) {
    const drainageColors = [
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
      const order = feature.get("ORDER") || 1;
      const color = drainageColors[order - 1] || drainageColors[0];
      return new Style({
        stroke: new Stroke({ color, width: 2 }),
      });
    });

    drainageLayer.set("id", "drainage_layer");
    drainageLayer.setZIndex(2);
    map.addLayer(drainageLayer);

    if (multiPoly && typeof drainageLayer.addFilter === "function") {
      drainageLayer.addFilter(
        new Crop({
          feature: new Feature(multiPoly),
          wrapX: false,
          inner: false,
        })
      );
    }
  } else {
    console.warn("Drainage not found:", drainageLayerName);
  }
} catch (err) {
  console.error("Drainage error:", err);
}

    };
    
    // Execute based on mode
    
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
