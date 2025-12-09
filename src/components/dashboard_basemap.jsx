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
  styleHeight = "800px",
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
          geometry: geometryJSON,
          pixel:event.pixel
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

      // PROJECT MODE (unchanged)
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

      // TEHSIL MODE — PATCHED
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

  const geom = tehsilFeature.getGeometry();
  view.fit(geom.getExtent(), {
    padding: [20, 20, 20, 20],
    maxZoom: 17,
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

  console.log("✅ Waterbody + MWS drawn (Project/Tehsil)");

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

