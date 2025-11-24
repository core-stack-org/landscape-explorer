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

const DashboardBasemap = ({
  id,
  mode = "waterbody",
  geoData,
  zoiFeatures,
  mwsData,
  selectedWaterbody,
  selectedFeature,
  lulcYear,
  projectName,
  projectId,
  onSelectWaterbody,
  onZoiArea,
  organizationLabel,
  styleHeight = "900px",
}) => {
  const mapRef = useRef(null);
  const mapElement = useRef(null);
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

    console.log("[DashboardBasemap] Combined effect running", {
      mode,
      selectedWaterbodyUID: selectedWaterbody?.UID,
      hasGeoData: !!geoData,
      lulcYear,
      projectName,
      projectId,
    });

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
      if (!projectName || !projectId || !lulcYear) {
        console.warn("[DashboardBasemap] Missing LULC params", {
          projectName,
          projectId,
          lulcYear,
        });
        return null;
      }

      const fullYear = lulcYear
        .split("_")
        .map((p) => `20${p}`)
        .join("_")
        .toLowerCase();

      const basePrefix = "clipped_lulc_filtered_mws";
      const layerName = `${basePrefix}_${projectName}_${projectId}_${fullYear}`;

      console.log("[DashboardBasemap] Loading LULC layer:", layerName);

      try {
        const lulcLayer = await getImageLayer(
          "waterrej",
          layerName,
          true,
          styleName
        );

        if (!lulcLayer) {
          console.error("[DashboardBasemap] getImageLayer returned null");
          return null;
        }

        lulcLayer.setZIndex(1);
        lulcLayer.set("id", idName);

        // Apply crop if target feature provided
        if (targetFeature && typeof lulcLayer.addFilter === "function") {
          console.log(
            "[DashboardBasemap] Applying crop to LULC, inner:",
            isInnerCrop
          );
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
        console.log("[DashboardBasemap] ✅ LULC layer added successfully");
        return lulcLayer;
      } catch (err) {
        console.error(`[DashboardBasemap] LULC load failed:`, err);
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
        map.unByKey(map[key]);
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
        map.unByKey(map[pointerKey]);
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

      if (!selectedZoi) {
        console.warn("No ZOI found for selected waterbody UID");
        return;
      }

      const zoiLayer = new VectorLayer({
        source: new VectorSource({ features: [selectedZoi] }),
        style: new Style({
          stroke: new Stroke({ color: "yellow", width: 3 }),
        }),
      });

      zoiLayer.setZIndex(5);
      zoiLayer.set("id", "zoi_border_layer");
      map.addLayer(zoiLayer);

      const geom = selectedZoi.getGeometry();
      if (geom) {
        view.fit(geom.getExtent(), { padding: [20, 20, 20, 20] });
      }

      onZoiArea?.(selectedZoi.get("zoi_area") ?? null);

      // Add LULC for ZOI
      await addLulcLayer("waterrej_lulc", "lulc_zoi_layer", selectedZoi, false);

      // Exclude waterbody from LULC if available
      if (geoData) {
        const allWB = read4326(geoData);
        const matchedWB = allWB.find(
          (f) => f.get("UID")?.toString() === selectedWaterbody.UID?.toString()
        );

        if (matchedWB) {
          const wbLayer = new VectorLayer({
            source: new VectorSource({ features: [matchedWB] }),
            style: new Style({
              stroke: new Stroke({ color: "blue", width: 3 }),
            }),
          });

          wbLayer.setZIndex(6);
          wbLayer.set("id", "wb_single_layer");
          map.addLayer(wbLayer);

          // Add inner crop to exclude waterbody from LULC
          const lulcLayer = map
            .getLayers()
            .getArray()
            .find((l) => l.get("id") === "lulc_zoi_layer");
          if (lulcLayer && typeof lulcLayer.addFilter === "function") {
            lulcLayer.addFilter(
              new Crop({ feature: matchedWB, wrapX: true, inner: true })
            );
          }
        }
      }

      // Add ZOI border on top
      const zoiBorderTop = new VectorLayer({
        source: new VectorSource({ features: [selectedZoi] }),
        style: new Style({
          stroke: new Stroke({ color: "yellow", width: 3 }),
        }),
      });
      zoiBorderTop.setZIndex(10);
      zoiBorderTop.set("id", "zoi_top_layer");
      map.addLayer(zoiBorderTop);

      // Add waterbody border on top
      if (geoData) {
        const allWB = read4326(geoData);
        const matched = allWB.find(
          (f) => f.get("UID")?.toString() === selectedWaterbody?.UID?.toString()
        );
        if (matched) {
          const wbTop = new VectorLayer({
            source: new VectorSource({ features: [matched] }),
            style: new Style({
              stroke: new Stroke({ color: "blue", width: 3 }),
            }),
          });
          wbTop.setZIndex(11);
          wbTop.set("id", "wb_top_layer");
          map.addLayer(wbTop);
        }
      }
    };

    const addMws = async () => {
      if (!selectedWaterbody || !selectedFeature) return;
      if (!projectName || !projectId) return;

      const typeName = `waterrej:WaterRejapp_mws_${projectName}_${projectId}`;
      const mwsId = selectedFeature.properties?.MWS_UID;
      const uidParts = mwsId?.split("_") || [];
      const uidPrefix =
        uidParts.length >= 2 ? `${uidParts[0]}_${uidParts[1]}` : mwsId;

      const base =
        "https://geoserver.core-stack.org:8443/geoserver/waterrej/ows?";
      const params = new URLSearchParams({
        service: "WFS",
        version: "1.0.0",
        request: "GetFeature",
        typeName,
        outputFormat: "application/json",
        CQL_FILTER: `uid LIKE '${uidPrefix}%'`,
      });
      const wfsUrl = base + params.toString();

      let matchedFeatures = [];
      try {
        const res = await fetch(wfsUrl);
        if (res.ok) {
          const json = await res.json();
          matchedFeatures = json.features || [];
        } else {
          console.warn("[DashboardBasemap] MWS WFS fetch failed:", res.status);
        }
      } catch (e) {
        console.error("[DashboardBasemap] MWS WFS fetch error:", e);
      }

      if (!matchedFeatures.length) {
        const selectedFeatureObj = new GeoJSON().readFeature(selectedFeature, {
          dataProjection: "EPSG:4326",
          featureProjection: view.getProjection(),
        });
        const selectedWaterLayer = new VectorLayer({
          source: new VectorSource({ features: [selectedFeatureObj] }),
          style: new Style({ stroke: new Stroke({ color: "blue", width: 3 }) }),
        });
        selectedWaterLayer.setZIndex(3);
        selectedWaterLayer.set("id", "selected_waterbody_layer");
        map.addLayer(selectedWaterLayer);

        const geom = selectedFeatureObj.getGeometry();
        if (geom) view.fit(geom.getExtent(), { padding: [40, 40, 40, 40] });
        return;
      }

      const featureObjs = new GeoJSON().readFeatures(
        { type: "FeatureCollection", features: matchedFeatures },
        { dataProjection: "EPSG:4326", featureProjection: view.getProjection() }
      );

      const boundarySource = new VectorSource({ features: featureObjs });
      const boundaryLayer = new VectorLayer({
        source: boundarySource,
        style: new Style({
          stroke: new Stroke({ color: "black", width: 3 }),
          fill: null,
        }),
      });
      boundaryLayer.setZIndex(3);
      boundaryLayer.set("id", "mws_boundary_layer");
      map.addLayer(boundaryLayer);

      const multiCoords = [];
      featureObjs.forEach((f) => {
        const g = f.getGeometry();
        if (!g) return;
        const t = g.getType();
        if (t === "Polygon") multiCoords.push(g.getCoordinates());
        else if (t === "MultiPolygon")
          g.getCoordinates().forEach((poly) => multiCoords.push(poly));
      });
      const multiPoly = multiCoords.length
        ? new MultiPolygon(multiCoords)
        : null;

      try {
        const terrainLayerName = `WATER_REJ_terrain_${projectName}_${projectId}`;
        const terrainLayer = await getImageLayer(
          "waterrej",
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
        }
      } catch (e) {
        console.error("[DashboardBasemap] Terrain layer error:", e);
      }

      try {
        const orgLabel = organizationLabel || "";
        const drainageLayerName = `WATER_REJ_drainage_line_${orgLabel}_${projectName}_${projectId}`;
        const drainageLayer = await getVectorLayers(
          "waterrej",
          drainageLayerName,
          true,
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
            return new Style({ stroke: new Stroke({ color, width: 2 }) });
          });
          drainageLayer.setZIndex(1);
          drainageLayer.set("id", "drainage_layer");
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
        }
      } catch (e) {
        console.error("[DashboardBasemap] Drainage layer error:", e);
      }

      if (selectedFeature) {
        try {
          const selectedFeatureObj = new GeoJSON().readFeature(
            selectedFeature,
            {
              dataProjection: "EPSG:4326",
              featureProjection: view.getProjection(),
            }
          );
          const selectedWaterLayer = new VectorLayer({
            source: new VectorSource({ features: [selectedFeatureObj] }),
            style: new Style({
              stroke: new Stroke({ color: "blue", width: 3 }),
              fill: null,
            }),
          });
          selectedWaterLayer.setZIndex(5);
          selectedWaterLayer.set("id", "selected_waterbody_layer");
          map.addLayer(selectedWaterLayer);

          if (multiPoly) {
            const tempFeat = new Feature(multiPoly);
            const ex = tempFeat.getGeometry().getExtent();
            if (ex && !Number.isNaN(ex[0]))
              view.fit(ex, { padding: [50, 50, 50, 50] });
          } else if (selectedFeatureObj.getGeometry()) {
            view.fit(selectedFeatureObj.getGeometry(), {
              padding: [50, 50, 50, 50],
            });
          }
        } catch (e) {
          console.error("[DashboardBasemap] selected waterbody add error:", e);
        }
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
        console.log(
          "[DashboardBasemap] Mode setup complete, LULC loaded:",
          lulcLoadedRef.current
        );
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
  ]);

  return (
    <div className="relative w-full">
      {/* MAP DIV */}
      <div
        id={id}
        ref={mapElement}
        style={{ width: "100%", height: styleHeight, border: "1px solid #ccc" }}
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
