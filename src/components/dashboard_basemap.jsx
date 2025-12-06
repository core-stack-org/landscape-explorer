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
            src: waterbodyIcon,
            anchor: [0.5, 1],
            scale: 1,
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
        } catch {
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
        if (params?.LAYERS && params.LAYERS.includes("LULC")) {
          map.removeLayer(layer);
        }
      } catch {
      }

      const src = layer.getSource?.();
      if (src?.urls && src?.urls[0]?.includes("LULC")) {
        map.removeLayer(layer);
      }
    });
  };

  // INITIAL MAP SETUP
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

    // CLICK HANDLER (returns pure GeoJSON geometry)
    map.on("singleclick", (event) => {
      const m = mapRef.current;
      if (!m) return;

      const feature = m.forEachFeatureAtPixel(
        event.pixel,
        (feat) => {
          const type = feat.getGeometry()?.getType();
          if (type === "Point") return null;
          return feat;
        },
        { hitTolerance: 6 }
      );

      const popupEl = popupRef.current;
      if (!popupEl) return;

      if (!feature) {
        popupEl.style.display = "none";
        return;
      }

      const props = feature.getProperties?.() || {};
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
          geometry: geometryJSON, // PURE GEOJSON
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
    if ( normalizedWaterbody && typeof normalizedWaterbody.get === "function" &&  normalizedWaterbody.get("UID")) {
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
        layerName = `LULC_${lulcYear}_${projectName}_${projectId}__level_3`;
      }
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

    // ───── WATERBODY MODE ─────
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

        if (allWB.length > 0) {
          let fullExtent = allWB[0].getGeometry().getExtent().slice();

          allWB.forEach((f) => {
            const ex = f.getGeometry().getExtent();
            fullExtent[0] = Math.min(fullExtent[0], ex[0]);
            fullExtent[1] = Math.min(fullExtent[1], ex[1]);
            fullExtent[2] = Math.max(fullExtent[2], ex[2]);
            fullExtent[3] = Math.max(fullExtent[3], ex[3]);
          });

          view.fit(fullExtent, {
            padding: [50, 50, 50, 50],
            maxZoom: 11,
            duration: 400,
          });
        }

        if (normalizedWaterbody) {
          const selectedFeatureOl = allWB.find(
            (f) =>
              f.get("UID")?.toString() === normalizedWaterbody.UID?.toString()
          );

          if (selectedFeatureOl) {
            view.fit(selectedFeatureOl.getGeometry().getExtent(), {
              padding: [20, 20, 20, 20],
            });
            removeLulcLayers();
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

      // TEHSIL MODE
      if (isTehsil) {
        if (!selectedWaterbody?.geometry) return;

        const tehsilFeature = geojsonReaderRef.current.readFeature(
          {
            type: "Feature",
            geometry: selectedWaterbody.geometry,
            properties: selectedWaterbody,
          },
          {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:4326",
          }
        );

        const geom = tehsilFeature.getGeometry();
        if (!geom) return;

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

        removeLulcLayers();
        await addLulcLayer(
          "lulc_RWB",
          "lulc_waterbody_layer",
          tehsilFeature,
          false
        );
        return;
      }
    };

    // ───── ZOI MODE ─────
    const addZoi = async () => {
      if (!normalizedWaterbody) return;

      const zoiOl = getZoiOlFeatures();
      if (!zoiOl.length) return;

      const uid =
        normalizedWaterbody.UID?.toString() ||
        normalizedWaterbody.uid?.toString();

      let selectedZoi = null;

      if (uid) {
        selectedZoi = zoiOl.find((f) => {
          const fu =
            f.get("UID") || f.get("uid") || f.get("waterbody_uid");
          return fu?.toString() === uid;
        });
      }

      if (!selectedZoi) return;

      // send ZOI area back up (if available in attributes)
      if (onZoiArea) {
        const rawArea =
          selectedZoi.get("zoi_area") ??
          selectedZoi.get("ZOI_AREA") ??
          selectedZoi.get("area_ha") ??
          selectedZoi.get("AREA_HA");
        const areaHa = rawArea != null ? Number(rawArea) : null;
        if (!Number.isNaN(areaHa) && areaHa != null) {
          onZoiArea(areaHa);
        } else {
          onZoiArea(null);
        }
      }

      const zoiFeature = new Feature(selectedZoi.getGeometry().clone());
      const geom = zoiFeature.getGeometry();

      if (geom) {
        map.getView().fit(geom.getExtent(), {
          padding: [40, 40, 40, 40],
          maxZoom: 17,
          duration: 500,
        });
      }

      const zoiLayer = new VectorLayer({
        source: new VectorSource({ features: [zoiFeature] }),
        style: new Style({ stroke: new Stroke({ color: "yellow", width: 3 }) }),
      });
      zoiLayer.set("id", "zoi_border_layer");
      map.addLayer(zoiLayer);

      removeLulcLayers();
      await addLulcLayer("waterrej_lulc", "lulc_zoi_layer", zoiFeature, false);

      // PROJECT ZOI → draw WB inside ZOI
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

      // TEHSIL ZOI → add WB the same way using selectedWaterbody geometry
      if (!projectName && !projectId) {
        if (!selectedWaterbody?.geometry) return;

        const wbFeatureOl = geojsonReaderRef.current.readFeature(
          {
            type: "Feature",
            geometry: selectedWaterbody.geometry,
            properties: selectedWaterbody,
          },
          {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:4326",
          }
        );

        const wbLayer = new VectorLayer({
          source: new VectorSource({ features: [wbFeatureOl] }),
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
              feature: wbFeatureOl,
              wrapX: true,
              inner: true,
            })
          );
        }
      }

      const zoiTop = new VectorLayer({
        source: new VectorSource({ features: [zoiFeature] }),
        style: new Style({ stroke: new Stroke({ color: "yellow", width: 3 }) }),
      });
      zoiTop.set("id", "zoi_top_layer");
      map.addLayer(zoiTop);
    };  

    // ───── MWS MODE ─────
    const addMws = async () => {
      if (!normalizedWaterbody || !selectedWaterbody) {
        console.warn("❗ normalizedWaterbody OR selectedWaterbody missing");
        return;
      }

      const map = mapRef.current;
      
      // WAIT FOR MAP TO BE READY
      if (!map?.isReady) {
        await new Promise((resolve) => {
          const checkReady = () => {
            if (map?.isReady) {
              resolve();
            } else {
              setTimeout(checkReady, 50);
            }
          };
          checkReady();
        });
      }
      
      const view = map.getView();

      const isTehsil = !projectName && !projectId;
      const isProject = projectName && projectId;

      let selectedMws = null;
      let allMws = [];
      let mwsUid = null;

      // PROJECT MODE → use mwsData FeatureCollection + MWS_UID
      if (isProject) {
        mwsUid = normalizedWaterbody?.MWS_ID?.toString() ||
                normalizedWaterbody?.MWS_UID?.toString();

        if (!mwsUid) {
          console.warn("Project mode → missing MWS UID");
          return;
        }

        try {
          allMws = geojsonReaderRef.current.readFeatures(mwsData || []);
        } catch (err) {
          console.error("Project mode → failed to parse mwsData:", err);
          return;
        }

        selectedMws = allMws.find((f) => {
          const fu = f.get("uid") || f.get("UID") || f.get("MWS_UID");
          return fu?.toString() === mwsUid;
        });

        if (!selectedMws) {
          console.warn("Project mode → No MWS matched for UID", mwsUid);
          return;
        }
      }
      // TEHSIL MODE → mwsData is raw OL feature-like
      if (isTehsil) {
        const rawGeom = mwsData?.values_?.geometry;

        if (!rawGeom) {
          console.error("Tehsil → NO GEOMETRY FOUND in mwsData");
          return;
        }

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
          console.error("Failed to rebuild polygon:", err);
          return;
        }
        selectedMws = new Feature({
          geometry: realGeom,
          UID: mwsData?.uid,
        });
      }

      // MultiPolygon for cropping (MOVED UP - prepare BEFORE loading layers)
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
        console.error(" multiPoly error:", err);
      }

      // ═══════════════════════════════════════════════════
      // LOAD ALL LAYERS IN PARALLEL (instead of sequential)
      // ═══════════════════════════════════════════════════
      
      const terrainLayerName = isProject
        ? `${projectName.toLowerCase()}_${projectId}_terrain_raster`
        : `${district.toLowerCase()}_${block.toLowerCase()}_terrain_raster`;
        
      const drainageLayerName = isProject
        ? `${projectName.toLowerCase()}_${projectId}`
        : `${district.toLowerCase()}_${block.toLowerCase()}`;

      console.log("🔄 Loading terrain & drainage in parallel...");

      // Load terrain and drainage at the SAME TIME
      const [terrainLayer, drainageLayer] = await Promise.all([
        getImageLayer("terrain", terrainLayerName, true, "Terrain_Style_11_Classes").catch(err => {
          console.error("Terrain load failed:", err);
          return null;
        }),
        getVectorLayers("drainage", drainageLayerName, true, "drainage").catch(err => {
          console.error("Drainage load failed:", err);
          return null;
        })
      ]);
      // Add terrain layer
      if (terrainLayer) {
        terrainLayer.setOpacity(0.7);
        terrainLayer.setZIndex(0);
        terrainLayer.set("id", "terrain_layer");

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

      // Add drainage layer
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

      // Draw MWS boundary
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
        console.error("Failed to create boundary layer:", err);
        return;
      }

      const geom = selectedMws.getGeometry?.();
      if (geom) {
        try {
          view.fit(geom.getExtent(), {
            padding: [60, 60, 60, 60],
            maxZoom: 17,
          });
        } catch (err) {
          console.error(" Error fitting view:", err);
        }
      }

      // waterbody from selectedWaterbody.geometry
      let wbFeatureObj = null;

      try {
        if (selectedWaterbody?.geometry) {
          wbFeatureObj = geojsonReaderRef.current.readFeature(
            {
              type: "Feature",
              geometry: selectedWaterbody.geometry,
              properties: {},
            },
            {
              dataProjection: "EPSG:4326",
              featureProjection: "EPSG:4326",
            }
          );
        }

    // TRY FALLBACK IF selectedWaterbody.geometry IS MISSING
    if (!wbFeatureObj) {
      console.warn(" No WB geometry found — attempting fallback...");

      let fallbackWB = null;

      // Try from geoData (project mode)
      if (geoData) {
        const allWB = geojsonReaderRef.current.readFeatures(geoData);
        fallbackWB = allWB.find(
          (f) =>
            f.get("UID")?.toString() === normalizedWaterbody.UID?.toString()
        );
      }

      // Try from zoiFeatures (tehsil mode)
      if (!fallbackWB && zoiFeatures) {
        const zoiOl = getZoiOlFeatures();
        fallbackWB = zoiOl.find(
          (f) =>
            f.get("UID")?.toString() === normalizedWaterbody.UID?.toString()
        );
      }

      if (!fallbackWB) {
        console.error(" Could not reconstruct waterbody!");
        return;
      }

      wbFeatureObj = new Feature(fallbackWB.getGeometry().clone());
    }


        const selectedWaterLayer = new VectorLayer({
          source: new VectorSource({ features: [wbFeatureObj] }),
          style: new Style({
            stroke: new Stroke({ color: "blue", width: 3 }),
          }),
        });

        selectedWaterLayer.set("id", "selected_waterbody_layer");
        selectedWaterLayer.setZIndex(10);
        map.addLayer(selectedWaterLayer);

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
        console.error("Failed to draw waterbody:", err);
      }
      
      // Force map to render
      map.renderSync();
    };

    (async () => {
      try {
        if (mode === "waterbody") await addWaterbody();
        else if (mode === "zoi") await addZoi();
        else if (mode === "mws") await addMws();
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
  ]);

  return (
    <div className="relative w-full">
      {/* MAP DIV */}
      <div
        id={id}
        ref={mapElement}
        style={{
          width: selectedWaterbody ? "100%" : "1500px",
          height: styleHeight,
          border: "1px solid #ccc",
        }}
      />

      {/* POPUP ELEMENT (for onSelectWaterbody click) */}
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
          pointerEvents: "none",
        }}
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