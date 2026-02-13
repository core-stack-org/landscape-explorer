  // DashboardBasemap.jsx
  import React, { useEffect, useRef,useState } from "react";
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
  import KeyboardZoom from "ol/interaction/KeyboardZoom";
  import Feature from "ol/Feature";
  import MultiPolygon from "ol/geom/MultiPolygon";
  import Overlay from "ol/Overlay";
  import Polygon from "ol/geom/Polygon";
  import waterbodyIcon from "../assets/waterbodies_proposed.svg";
  import plantationIcon from "../assets/Plantation.svg"
  import LocationOnIcon from "@mui/icons-material/LocationOn";
  import YearSlider from "./yearSlider";
  import { WATER_DASHBOARD_CONFIG } from "../config/dashboard_configs/waterDashboard.config";

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
    showMap,
    onMapReady,
    styleHeight = "900px",

  }) => {
    const mapRef = useRef(null);
    const mapElement = useRef(null);
    const popupRef = useRef(null);
    const pendingPlantationRef = useRef(null);
    const pendingWaterbodyRef = useRef(null);

    const geojsonReaderRef = useRef(new GeoJSON());
    const lulcLoadedRef = useRef(false);
    const [waterLegendOpen, setWaterLegendOpen] = useState(false);
    const [terrainLegend, setTerrainLegend] = useState(false);
    const [drainageLegend, setDrainageLegend] = useState(false);
    const [selectedZoiFeature, setSelectedZoiFeature] = useState(null);
    const [zoiAreaState, setZoiAreaState] = useState(null)
    const [radiusState, setRadiusState] = useState(null);
    console.log(mwsData)
    
    const getWBProps = (wb) => {
      if (!wb) return {};
    
      // CASE 1: Already plain object (table)
      if (!wb.properties) return wb;
    
      // CASE 2: OL feature structure
      return {
        ...wb.properties,
        geometry: wb.geometry ?? wb.properties.geometry,
      };
    };

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
        parts = [name];
      }
    
      return parts
        .map((p) =>
          p
            .replace(/[^\w\s-]/g, "") // remove special chars
            .replace(/[-\s]+/g, "_")  // space/dash → _
            .replace(/_+/g, "_")      // collapse _
            .replace(/^_|_$/g, "")    // trim _
            .toLowerCase()
        )
        .join("_");
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
          fill: new Fill({
            color: "rgba(70, 130, 180, 0.9)"             })
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

    const plantationPointStyle = new Style({
      image: new Icon({
        src: plantationIcon,
        scale: 1.2,
        anchor: [0.5, 1],
      }),
    })

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
      if (onMapReady) {
        onMapReady(map);
      }

      map.isReady = true;

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

        if (mode === "mws") {
          popupRef.current.style.display = "none";
          return;
        }

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

        //  FIX: DEFINE THESE FIRST
        const props = feature.getProperties?.() || {};
        const layerType = feature.get("layerType");

    // ================= PLANTATION POPUP =================
    if (layerType === "plantation") {

      //  FIX: define geometryJSON FIRST
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

      // store data ONLY
      pendingPlantationRef.current = {
        ...props,
        geometry: geometryJSON,
      };

      popupEl.style.display = "block";
      m.overlayRef.setPosition(event.coordinate);

      // zoom ONLY on popup click
      popupEl.onclick = (e) => {
        e.stopPropagation(); 

        if (onSelectPlantation && pendingPlantationRef.current) {
          onSelectPlantation(pendingPlantationRef.current);
          pendingPlantationRef.current = null;
        }
      };

      return;
    }

        // ================= WATERBODY POPUP =================
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

        popupEl.innerHTML = `
      <div style="min-width:220px; cursor:pointer">
        <strong>${name}</strong><br/>
        <span style="font-size:12px;color:#555">
          UID: ${uid}
        </span><br/>
        <em style="color:#2563eb">Click to view details</em>
      </div>
    `;
    pendingWaterbodyRef.current = {
      ...props,
      UID: uid,
      waterbody_name: name,
      intervention_year:
      props.intervention_year ||
      props.Intervention_Year ||
      props.INTERVENTION_YEAR ||
      props.intv_year ||
      null,
      latitude: props.latitude ?? props.Latitude ?? props.lat ?? null,
      longitude: props.longitude ?? props.Longitude ?? props.lon ?? null,
      geometry: geometryJSON,


    };

    popupEl.onclick = (e) => {
      e.stopPropagation();

      if (onSelectWaterbody && pendingWaterbodyRef.current) {
        onSelectWaterbody(pendingWaterbodyRef.current);
        pendingWaterbodyRef.current = null;
      }
    };



        popupEl.style.display = "block";
        m.overlayRef.setPosition(event.coordinate);
      });


      map.getInteractions().forEach((interaction) => {
        if (
          interaction instanceof MouseWheelZoom ||
          interaction instanceof PinchZoom ||
          interaction instanceof DoubleClickZoom ||
          interaction instanceof KeyboardZoom
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

        removeLayersById([
          "lulc_waterbody_layer",
          "lulc_zoi_layer",
          "lulc_zoi_excluded_layer",
        ]);

        let workspace = "LULC_level_3";
        let layerName = null;

        if (projectName && projectId) {
          layerName = `LULC_${lulcYear}_${projectName.toLowerCase()}_${projectId}__level_3`;
        }

        if (!projectName && !projectId) {
          if (!district || !block) {
            console.warn("LULC skipped: district/block missing", {
              district,
              block,
            });
            return null;
          }
        
          const safeDistrict = transformName(district);
          const safeBlock = transformName(block);
        
          layerName = `LULC_${lulcYear}_${safeDistrict}_${safeBlock}_level_3`;
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
      
        //  FIT MAP TO ALL WATERBODIES
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
        if (isTehsil) {
          let wbGeom = selectedWaterbody?.geometry;
      
          // fallback from geoData
          if (!wbGeom && geoData?.type === "FeatureCollection") {
            const f = geoData.features?.[0];
            wbGeom = f?.geometry || null;
          }
      
          if (!wbGeom) {
            console.warn("Tehsil → WB geometry missing");
            return;
          }
      
          const olGeom = geojsonReaderRef.current.readGeometry(wbGeom, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:4326",
          });
      
          if (!olGeom) {
            console.error("Tehsil → OL geometry failed");
            return;
          }
      
          //  ZOOM — THIS WAS MISSING EFFECTIVELY
          view.fit(olGeom.getExtent(), {
            padding: [40, 40, 40, 40],
            maxZoom: 16,
            duration: 400,
          });
      
          // Draw WB
          removeLayersById(["wb_single_layer"]);
          const wbFeature = new Feature({ geometry: olGeom });
          const wbLayer = new VectorLayer({
            source: new VectorSource({
              features: [new Feature({ geometry: olGeom })],
            }),
            style: new Style({
              stroke: new Stroke({
                color: "blue",
                width: 4,
              }),
            }),
          });
      
          wbLayer.set("id", "wb_single_layer");
          wbLayer.setZIndex(9999);
          map.addLayer(wbLayer);
      
          await addLulcLayer(
            "lulc_RWB",
            "lulc_waterbody_layer",
            wbFeature,
            false
          );
      
          return; 
        }
        if (showMap && !selectedWaterbody) {
          showAllWaterbodies();   
          return;
        }

  // PROJECT MODE — show ONLY selected
  if (!normalizedWaterbody?.UID) return;

  const allWB = read4326(geoData);

  const selectedFeatureOl = allWB.find(
    f => f.get("UID")?.toString() === normalizedWaterbody.UID.toString()
  );

  if (!selectedFeatureOl) {
    showAllWaterbodies();
    return;
  }
  view.fit(selectedFeatureOl.getGeometry().getExtent(), {
    padding: [30, 30, 30, 30],
    maxZoom: 18,
    duration: 400,
  });

  const wbLayer = new VectorLayer({
    source: new VectorSource({ features: [selectedFeatureOl] }),
    style: new Style({
      stroke: new Stroke({
        color: "#2563eb",
        width: 4,
      }),
    }),
  });

  wbLayer.set("id", "wb_single_layer");
  wbLayer.setZIndex(999999); // IMPORTANT
  map.addLayer(wbLayer);

  removeLulcLayers();

  await addLulcLayer(
    "lulc_RWB",               // style name
    "lulc_waterbody_layer",   // layer id
    selectedFeatureOl,        // waterbody feature
    false                     // inner crop
  );
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
    const rawArea =
    selectedZoi.get("zoi_area") ||
    selectedZoi.get("ZOI_AREA") ||
    selectedZoi.get("area_ha") ||
    selectedZoi.get("AREA_HA") ||
    null;

  setSelectedZoiFeature(selectedZoi);  //  store full feature
  setZoiAreaState(rawArea ? Number(rawArea) : null);
  const radius = getRadiusFromArea(rawArea);
  setRadiusState(radius);

  if (onZoiArea) {
    onZoiArea(rawArea ? Number(rawArea) : null);
  }


    // 4) Clone geometry
    const zoiFeature = new Feature(selectedZoi.getGeometry().clone());
    const geom = zoiFeature.getGeometry();

    // 5) Zoom — increased
    if (geom) {
      map.getView().fit(geom.getExtent(), {
        padding: [30, 30, 30, 30],
        maxZoom: 18,
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

  const normalizeMwsFeatures = (features) => {
    if (!features) return [];

    // already OL features
    if (
      Array.isArray(features) &&
      features.length &&
      typeof features[0]?.getGeometry === "function"
    ) {
      return features;
    }

    // GeoJSON array → OL features
    if (Array.isArray(features)) {
      return geojsonReaderRef.current.readFeatures(
        {
          type: "FeatureCollection",
          features,
        },
        {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:4326",
        }
      );
    }

    return [];
  };


  const addMws = async () => {
    if (!selectedWaterbody || !selectedFeature) {
      console.warn("addMws → missing selectedWaterbody / selectedFeature");
      return;
    }

    const map = mapRef.current;
    if (!map?.isReady) {
      await new Promise((resolve) => {
        const check = () => (map.isReady ? resolve() : setTimeout(check, 40));
        check();
      });
    }

    const view = map.getView();
    const isProject = type === "project";
    const isTehsil = type === "tehsil";
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

    /* =====================================================
        PROJECT MODE — MULTIPLE MWS
    ===================================================== */
    if (isProject) {
      //  THIS WAS THE MAIN FIX
      const mwsFeatures = normalizeMwsFeatures(selectedFeature);

      if (!mwsFeatures.length) {
        console.warn("No valid MWS features after normalize");
        return;
      }

      // 1 Build MultiPolygon from ALL MWS
      const multiCoords = [];

      mwsFeatures.forEach((f) => {
        const geom = f.getGeometry(); 
        if (!geom) return;

        if (geom.getType() === "Polygon") {
          multiCoords.push(geom.getCoordinates());
        } else if (geom.getType() === "MultiPolygon") {
          geom.getCoordinates().forEach((c) => multiCoords.push(c));
        }
      });

      if (!multiCoords.length) {
        console.warn("No valid MWS geometry");
        return;
      }

      const mwsMultiPolygon = new MultiPolygon(multiCoords);
      const mwsCropFeature = new Feature({ geometry: mwsMultiPolygon });

      // 2️ TERRAIN + DRAINAGE
      const terrainKey = `${projectName.toLowerCase()}_${projectId}_terrain_raster`;
      const drainageKey = `${projectName.toLowerCase()}_${projectId}`;

      const [terrainLayer, drainageLayer] = await Promise.all([
        getImageLayer("terrain", terrainKey, true, "Terrain_Style_11_Classes").catch(() => null),
        getVectorLayers("drainage", drainageKey, true, "drainage").catch(() => null),
      ]);

      if (terrainLayer) {
        terrainLayer.setZIndex(1);
        terrainLayer.setOpacity(0.7);
        terrainLayer.addFilter(new Crop({ feature: mwsCropFeature }));
        map.addLayer(terrainLayer);
      }

    if (drainageLayer) {
    drainageLayer.setStyle((feature) => {
      const o = Number(feature.get("ORDER")) || 1;
      return new Style({
        stroke: new Stroke({
          color: drainageColors[o - 1] || drainageColors[0],
          width: 2,
        }),
      });
    });

    drainageLayer.set("id", "drainage_layer");
    drainageLayer.setZIndex(2);

    //  crop with MULTI MWS polygon
    drainageLayer.addFilter(
      new Crop({
        feature: mwsCropFeature,
        wrapX: false,
        inner: false,
      })
    );

    map.addLayer(drainageLayer);
  }


      // 3️ Draw MWS boundaries
      map.addLayer(
        new VectorLayer({
          source: new VectorSource({ features: mwsFeatures }),
          style: new Style({
            stroke: new Stroke({ color: "black", width: 3 }),
          }),
          zIndex: 3,
        })
      );

      // 4️ Zoom
      view.fit(mwsMultiPolygon.getExtent(), {
        padding: [60, 60, 60, 60],
        maxZoom: 17,
      });

      // 5️ Draw selected waterbody (BLUE) — SAME LOCATION
  const allWB = read4326(geoData);

    const wbFeatureOl = allWB.find(
      (f) =>
        f.get("UID")?.toString() ===
        selectedWaterbody?.UID?.toString()
    );

    if (!wbFeatureOl) {
      console.warn("Project MWS → Waterbody not found in geoData");
    } else {
      const wbLayer = new VectorLayer({
        source: new VectorSource({
          features: [wbFeatureOl],
        }),
        style: waterBodyStyle
      });

      wbLayer.set("id", "selected_waterbody_layer");
      wbLayer.setZIndex(50); //  always above drainage & MWS
      map.addLayer(wbLayer);
    }
      map.renderSync();
      return;
    }

    /* =====================================================
        TEHSIL MODE — SINGLE MWS (UNCHANGED)
    ===================================================== */
   /* ===============================
      TEHSIL MODE — MULTIPLE MWS
================================ */
if (isTehsil) {
  // Convert whatever was passed to OL features[]
  let mwsFeatures = [];

  if (Array.isArray(selectedFeature)) {
    mwsFeatures = selectedFeature;
  } else if (selectedFeature?.getGeometry) {
    mwsFeatures = [selectedFeature];
  } else if (selectedFeature?.geometry) {
    const f = geojsonReaderRef.current.readFeature(
      {
        type: "Feature",
        geometry: selectedFeature.geometry,
        properties: selectedFeature.properties || {},
      },
      { dataProjection: "EPSG:4326", featureProjection: "EPSG:4326" }
    );
    if (f) mwsFeatures = [f];
  }

  if (!mwsFeatures.length) {
    console.warn("Tehsil → No MWS features");
    return;
  }

  // Build MultiPolygon from all MWS
  const mwsMultiCoords = [];
  mwsFeatures.forEach((f) => {
    const geom = f.getGeometry();
    if (!geom) return;
    if (geom.getType() === "Polygon") {
      mwsMultiCoords.push(geom.getCoordinates());
    } else if (geom.getType() === "MultiPolygon") {
      geom.getCoordinates().forEach((c) => mwsMultiCoords.push(c));
    }
  });

  const mwsMultiPolygon = new MultiPolygon(mwsMultiCoords);
  const mwsCropFeature = new Feature({ geometry: mwsMultiPolygon });

  // Draw boundary (ALL MWS)
  const mwsBoundaryLayer = new VectorLayer({
    source: new VectorSource({ features: mwsFeatures }),
    style: new Style({
      stroke: new Stroke({ color: "black", width: 3 }),
    }),
    zIndex: 20,
  });
  mwsBoundaryLayer.set("id", "mws_boundary_layer");
  map.addLayer(mwsBoundaryLayer);

  // Load layers
  const terrainKey = `${transformName(district)}_${transformName(block)}_terrain_raster`;
  const drainageKey = `${transformName(district)}_${transformName(block)}`;

  const [terrainLayer, drainageLayer] = await Promise.all([
    getImageLayer("terrain", terrainKey, true, "Terrain_Style_11_Classes").catch(() => null),
    getVectorLayers("drainage", drainageKey, true, "drainage").catch(() => null),
  ]);

  // Clip terrain to MultiPolygon
  if (terrainLayer) {
    terrainLayer.addFilter(new Crop({ feature: mwsCropFeature }));
    map.addLayer(terrainLayer);
  }

  // Clip drainage + style
  if (drainageLayer) {
    drainageLayer.setStyle((feature) => {
      const o = Number(feature.get("ORDER")) || 1;
      return new Style({
        stroke: new Stroke({
          color: drainageColors[o - 1] || drainageColors[0],
          width: 2,
        }),
      });
    });

    drainageLayer.set("id", "drainage_layer");
    drainageLayer.setZIndex(30);

    drainageLayer.addFilter(
      new Crop({ feature: mwsCropFeature, wrapX: false, inner: false })
    );

    map.addLayer(drainageLayer);
  }

  // Compute combined extent & zoom
  view.fit(mwsMultiPolygon.getExtent(), {
    padding: [60, 60, 60, 60],
    maxZoom: 17,
  });

  // Draw waterbody
  if (selectedWaterbody?.geometry) {
    const wbGeom = geojsonReaderRef.current.readGeometry(
      selectedWaterbody.geometry,
      {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      }
    );

    if (wbGeom) {
      const wbFeature = new Feature({ geometry: wbGeom });
      const wbLayer = new VectorLayer({
        source: new VectorSource({ features: [wbFeature] }),
        style: waterBodyStyle,
      });

      wbLayer.set("id", "selected_waterbody_layer");
      wbLayer.setZIndex(50);
      map.addLayer(wbLayer);
    }
  }

  map.renderSync();
  return;
}

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
    const plantationStyle = (feature) => {
      const styles = [
        new Style({
          stroke: new Stroke({
            color: "yellow",
            width: 3,
          }),
        }),
      ];
  
      const geom = feature.getGeometry();
      if (geom) {
        let center;
        try {
          if (geom.getType() === "Polygon")
            center = geom.getInteriorPoint().getCoordinates();
          else if (geom.getType() === "MultiPolygon")
            center = geom.getInteriorPoints().getFirstCoordinate();
        } catch {
          const ex = geom.getExtent();
          center = [(ex[0] + ex[2]) / 2, (ex[1] + ex[3]) / 2];
        }
  
        styles.push(
          new Style({
            geometry: new Point(center),
            image: new Icon({
              src: plantationIcon, 
              anchor: [0.5, 1],
              scale: 1.2,
            }),
          })
        );
      }
  
      return styles;
    };

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
  const props = getWBProps(selectedWaterbody);

  const getCentroidFromGeom = (geom) => {
    if (!geom) return null;
    try {
      const olGeom = geojsonReaderRef.current.readGeometry(geom, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:4326",
      });
  
      if (olGeom.getType() === "Polygon") {
        return olGeom.getInteriorPoint().getCoordinates();
      }
  
      if (olGeom.getType() === "MultiPolygon") {
        return olGeom.getInteriorPoints().getFirstCoordinate();
      }
  
      const ex = olGeom.getExtent();
      return [(ex[0] + ex[2]) / 2, (ex[1] + ex[3]) / 2]; // fallback
    } catch (e) {
      console.error("Centroid failed:", e);
      return null;
    }
  };
  
  const hasProject = projectName && projectId;

// TEHSIL MODE → TRY lat_dec/lon_dec, else centroid
let lat =  props?.latitude ?? null;
let lon = props?.longitude ?? null;

// If TEHSIL AND missing → derive centroid
if (!hasProject && (lat == null || lon == null) && props?.geometry) {
  const centroid = getCentroidFromGeom(props.geometry);
  if (centroid) {
    lon = centroid[0];
    lat = centroid[1];
  }
}

  const getRadiusFromArea = (ha) => {
    if (!ha || isNaN(ha)) return null;

    const area_m2 = ha * 10000;             // 1 ha = 10000 m²
    const radius_m = Math.sqrt(area_m2 / Math.PI);
    return radius_m / 1000;                 // meters → km
  };

  const fmt = (v) => {
    const num = Number(v);
    return isNaN(num) ? "NA" : num.toFixed(4);   // <-- only 4 decimals
  };

  console.log(selectedWaterbody)

    return (
      <div className="relative w-full overflow-visible">
        {/* MAP DIV */}
        <div
    className="
    relative
    w-full          
    max-w-[2000px]  
    mx-auto   
    overflow-visible"
    style={{
        height: "clamp(920px, 65vh, 800px)",
      overflow:"visible"
    }}
  >
    
    <div
      ref={mapElement}
      className="w-full h-full"
      style={{ border: "1px solid #ccc" }}
    />

    
    
    {/* ZOOM CONTROLS MOVED INSIDE */}
      <div className=" absolute top-6 right-10 flex flex-col gap-1">
      {["+", "–"].map((sign) => (
        <button
          key={sign}
          className="
            bg-white border border-gray-300 rounded-md
            cursor-pointer hover:bg-gray-100 active:scale-95 transition
            flex items-center justify-center
            text-[clamp(1rem,1.4vw,1.6rem)]
          "
          style={{
            width: "clamp(28px, 2.3vw, 42px)",
            height: "clamp(28px, 2.3vw, 42px)",
          }}
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
              className="absolute top-6 left-6 bg-white rounded-lg shadow-lg p-4 w-[260px] text-[clamp(0.65rem,0.9vw,0.85rem)]"
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

          {/* LEFT INFO PANEL — WATERBODY */}
          {mode === "waterbody" && selectedWaterbody && !selectedPlantation && (
            <div
              className="
                absolute top-6 left-6
                bg-white rounded-md shadow-lg px-3 py-2 border
                flex flex-col gap-2
                text-gray-800
                text-[clamp(0.65rem,0.9vw,0.85rem)]
              "
              style={{ minWidth: "200px" }}
            >

           {/* Location Header — hide in tehsil */}
              {!( !projectName && !projectId ) && (
                <div className="flex items-center justify-between">
                  <div
                    className="
                      flex items-center gap-1 font-semibold text-gray-900
                      text-[clamp(0.75rem,1vw,1rem)]
                    "
                  >
                    <LocationOnIcon fontSize="small" sx={{ color: '#2563eb', marginTop:'1px' }} />
                    Waterbody name :{" "}
                    <span className="tracking-wide font-semibold">
                      {selectedWaterbody?.waterbody_name ||
                        selectedWaterbody?.name ||
                        selectedWaterbody?.properties?.waterbody_name ||
                        selectedWaterbody?.waterbody ||
                        "NA"}
                    </span>
                  </div>
                </div>
              )}


              {/* Lat, Long in single line */}
            <div className="bg-gray-50 rounded-md p-2 shadow-sm border border-gray-200">
              <div
                className="
                  text-gray-700 flex justify-between
                  text-[clamp(0.70rem,0.95vw,0.9rem)]">
                <span className="font-medium">Lat, Long:</span>
                <span>
                {lat ? fmt(lat) : "NA"} , {lon ? fmt(lon) : "NA"}

                </span>
              </div>
            </div>



              {/* Area Row */}
              <div
                className="
                  flex justify-between items-center
                  text-[clamp(0.70rem,0.95vw,0.9rem)]
                "
              >
                <span className="font-medium text-gray-700">Area (ha):</span>
                <span>
                  {props?.area_ored
                    ? Number(props.area_ored).toFixed(2)
                    : selectedWaterbody?.properties?.area_ored
                    ? Number(props.properties.area_ored).toFixed(2)
                    : selectedWaterbody?.areaOred
                    ? Number(props.areaOred).toFixed(2)
                    : "NA"}
                </span>
              </div>

            </div>
          )}
              {/* LEFT INFO PANEL — ZOI */}
              {mode === "zoi" && selectedZoiFeature && zoiAreaState !== null && (
                <div
                  className="
                    absolute top-6 left-6
                    bg-white rounded-md shadow-lg px-3 py-2 border
                    flex flex-col gap-1
                    text-gray-800
                    text-[clamp(0.65rem,0.9vw,0.85rem)]
                  "
                  style={{ minWidth: "180px" }}
                >
                  {/* ZOI Header */}
                  <div
                    className="
                      flex items-center gap-1 font-semibold text-gray-900
                      text-[clamp(0.75rem,1vw,1rem)]
                    "
                  >
                    <LocationOnIcon
                      fontSize="small"
                      sx={{ color: "#d97706", marginTop: "1px" }}
                    />
                    <span>ZOI</span>
                  </div>

                  {/* AREA */}
                  <div
                    className="
                      text-gray-700
                      flex justify-between
                      text-[clamp(0.70rem,0.95vw,0.9rem)]
                    "
                  >
                    <span className="font-medium">Area (ha):</span>
                    <span>{zoiAreaState.toFixed(2)}</span>
                  </div>

                  {/* RADIUS */}
                  <div
                    className="
                      text-gray-700
                      flex justify-between
                      text-[clamp(0.70rem,0.95vw,0.9rem)]
                    "
                  >
                    <span className="font-medium">Radius (km):</span>
                    <span>{radiusState ? radiusState.toFixed(2) : "NA"}</span>
                  </div>

                  {/* VILLAGE */}
                  {selectedZoiFeature.get && selectedZoiFeature.get("Village") && (
                    <div
                      className="
                        text-gray-700 flex justify-between
                        text-[clamp(0.70rem,0.95vw,0.9rem)]
                      "
                    >
                      <span className="font-medium">Village:</span>
                      <span>{selectedZoiFeature.get("Village")}</span>
                    </div>
                  )}
                </div>
              )}

            {/* YEAR SLIDER — ONLY FOR WATERBODY */}
            {mode === "waterbody" && selectedWaterbody && (
              <div
                className="absolute left-4 right-4 flex justify-end bottom-16"
            
              >
                <div
                  className="
                    bg-white/90 rounded-md shadow-md
                  "
                  style={{
                    padding: "clamp(4px, 8px, 12px)",
                    minWidth: "min(600px, 55%)",
                    fontSize: "clamp(0.65rem, 0.75rem, 0.85rem)",
                  }}
                  
                >
                  <YearSlider
                    currentLayer={{ name: 'lulcWaterrej' }}
                    sliderId="map1"
                    interventionYear={props?.intervention_year}
                  />
                </div>
              </div>
            )}


            {/* WATERBODY LEGEND */}
            {mode === "waterbody" && selectedWaterbody && (
              <div className="absolute bottom-16 left-4">

                {!waterLegendOpen ? (
                  /* COLLAPSED TAB */
                  <div
                    onClick={() => setWaterLegendOpen(true)}
                    className="bg-white/90 rounded-r-md shadow-md cursor-pointer font-semibold select-none"
                    style={{
                      padding: "clamp(3px, 0.6vw, 8px)",
                      fontSize: "clamp(0.55rem, 0.75vw, 0.85rem)",
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                    }}
                  >
                    Water Legend ▶
                  </div>
                ) : (
                  /* EXPANDED LEGEND */
                  <div
                    className="bg-white/90 rounded-md shadow-md ml-2"
                    style={{
                      padding: "clamp(6px, 1vw, 14px)",
                      minWidth: "clamp(140px, 16vw, 200px)",
                      fontSize: "clamp(0.55rem, 0.8vw, 0.9rem)",
                    }}
                  >
                    <div
                      className="flex justify-between items-center mb-2"
                      style={{
                        fontSize: "clamp(0.6rem, 0.8vw, 0.9rem)",
                      }}
                    >
                      <p className="font-semibold">Waterbody Legend</p>
                      <button
                        onClick={() => setWaterLegendOpen(false)}
                        className="font-bold hover:opacity-70"
                      >
                        ◀
                      </button>
                    </div>

                    {WATER_DASHBOARD_CONFIG.legends.waterbody.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 mb-1"
                        style={{ fontSize: "clamp(0.55rem, 0.75vw, 0.85rem)" }}
                      >
                        <div
                          className="border border-gray-400"
                          style={{
                            width: "clamp(10px, 1vw, 14px)",
                            height: "clamp(10px, 1vw, 14px)",
                            backgroundColor: item.color,
                          }}
                        />
                        <span className="text-gray-700">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}


          {mode === "zoi" && selectedWaterbody && (
              <div
              className="absolute left-4 right-4 flex justify-end bottom-20" >
              <div
                className="
                  bg-white/90 rounded-md shadow-md
                "
                style={{
                  padding: "clamp(4px, 8px, 12px)",
                  minWidth: "min(600px, 55%)",
                  fontSize: "clamp(0.65rem, 0.75rem, 0.85rem)",
                }}
                
              >
                <YearSlider
                  currentLayer={{ name: "lulcWaterrej" }}
                  sliderId="map2"
                  interventionYear={props?.intervention_year}
                />
              </div>
            </div>
          )}

          {/* ZOI LEGEND */}
          {mode === "zoi" && selectedWaterbody && (
            <div className="absolute bottom-20 left-4">
              {!waterLegendOpen ? (
                /* COLLAPSED TAB */
                <div
                  onClick={() => setWaterLegendOpen(true)}
                  className="bg-white/90 rounded-r-md shadow-md cursor-pointer font-semibold select-none"
                  style={{
                    padding: "clamp(3px, 0.6vw, 8px)",
                    fontSize: "clamp(0.55rem, 0.75rem, 0.85rem)",
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                  }}
                >
                  ZOI Legend ▶
                </div>
              ) : (
                /* EXPANDED LEGEND */
                <div
                  className="bg-white/90 rounded-md shadow-md ml-2"
                  style={{
                    padding: "clamp(6px, 1vw, 14px)",
                    minWidth: "clamp(140px, 16vw, 200px)",
                    fontSize: "clamp(0.55rem, 0.75vw, 0.85rem)", // match waterbody legend
                  }}
                >
                  <div
                    className="flex justify-between items-center mb-2"
                    style={{
                      fontSize: "clamp(0.6rem, 0.75vw, 0.85rem)", // match waterbody legend
                    }}
                  >
                    <p className="font-semibold">ZOI Legend</p>
                    <button
                      onClick={() => setWaterLegendOpen(false)}
                      className="font-bold hover:opacity-70"
                    >
                      ◀
                    </button>
                  </div>

                  {WATER_DASHBOARD_CONFIG.legends.zoi.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 mb-1"
                      style={{ fontSize: "clamp(0.55rem, 0.75vw, 0.85rem)" }}
                    >
                      <div
                        className="border border-gray-400"
                        style={{
                          width: "clamp(10px, 1vw, 14px)",
                          height: "clamp(10px, 1vw, 14px)",
                          backgroundColor: item.color,
                        }}
                      />
                      <span className="text-gray-700">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}



          {mode === "mws" && selectedWaterbody && (
            <>
              {/* TERRAIN LEGEND — LEFT */}
              <div className="absolute left-0 bottom-20 p-4 pointer-events-auto">
                {!terrainLegend ? (
                  /* COLLAPSED TAB */
                  <div
                    onClick={() => setTerrainLegend(true)}
                    className="bg-white/90 rounded-r-md shadow-md cursor-pointer font-semibold text-gray-800 select-none"
                    style={{
                      padding: "clamp(3px, 0.6vw, 8px)",
                      fontSize: "clamp(0.55rem, 0.75vw, 0.85rem)",
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                    }}
                  >
                    Terrain Legend ▶
                  </div>
                ) : (
                  /* EXPANDED */
                  <div
                    className="bg-white/90 rounded-md shadow-md ml-2"
                    style={{
                      padding: "clamp(6px, 1vw, 14px)",
                      minWidth: "clamp(140px, 16vw, 200px)",
                      fontSize: "clamp(0.55rem, 0.75vw, 0.85rem)",
                      maxHeight: "clamp(140px, 22vw, 240px)",
                      overflowY: "auto",
                    }}
                  >
                    <div
                      className="flex justify-between items-center mb-2"
                      style={{ fontSize: "clamp(0.6rem, 0.8vw, 0.9rem)" }}
                    >
                      <p className="font-semibold">Terrain Layer Legend</p>
                      <button
                        onClick={() => setTerrainLegend(false)}
                        className="font-bold hover:opacity-70"
                      >
                        ◀
                      </button>
                    </div>

                    {WATER_DASHBOARD_CONFIG.legends.terrain.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 mb-1"
                        style={{ fontSize: "clamp(0.55rem, 0.75vw, 0.85rem)" }}
                      >
                        <div
                          className="border border-gray-400"
                          style={{
                            width: "clamp(10px, 1vw, 14px)",
                            height: "clamp(10px, 1vw, 14px)",
                            backgroundColor: item.color,
                          }}
                        />
                        <span className="text-gray-700">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>


              {/*  DRAINAGE LEGEND — RIGHT */}
              <div className="absolute right-0 bottom-20 p-4 pointer-events-auto">
              {!drainageLegend ? (
                /* COLLAPSED TAB */
                <div
                  onClick={() => setDrainageLegend(true)}
                  className="bg-white/90 rounded-l-md shadow-md cursor-pointer font-semibold text-gray-800 select-none"
                  style={{
                    padding: "clamp(3px, 0.6vw, 8px)",
                    fontSize: "clamp(0.55rem, 0.75vw, 0.85rem)",
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                  }}
                >
                  Drainage Legend ▶
                </div>
              ) : (
                /* EXPANDED LEGEND */
                <div
                  className="bg-white/90 rounded-md shadow-md mr-2"
                  style={{
                    padding: "clamp(6px, 1vw, 14px)",
                    minWidth: "clamp(140px, 16vw, 200px)",
                    fontSize: "clamp(0.55rem, 0.75vw, 0.85rem)",
                    maxHeight: "clamp(140px, 22vw, 240px)",
                    overflowY: "auto",
                  }}
                >
                  <div
                    className="flex justify-between items-center mb-2"
                    style={{ fontSize: "clamp(0.6rem, 0.8vw, 0.9rem)" }}
                  >
                    <p className="font-semibold">Drainage Layer Legend</p>
                    <button
                      onClick={() => setDrainageLegend(false)}
                      className="font-bold hover:opacity-70"
                    >
                      ◀
                    </button>
                  </div>

                  {WATER_DASHBOARD_CONFIG.legends.drainage.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 mb-1"
                      style={{ fontSize: "clamp(0.55rem, 0.75vw, 0.85rem)" }}
                    >
                      <div
                        className="border border-gray-400"
                        style={{
                          width: "clamp(10px, 1vw, 14px)",
                          height: "clamp(10px, 1vw, 14px)",
                          backgroundColor: item.color,
                        }}
                      />
                      <span className="text-gray-700">Order {item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            </>
          )}
      </div>
    );
  };

  export default DashboardBasemap;

