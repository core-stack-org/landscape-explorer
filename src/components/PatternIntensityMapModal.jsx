import React, { useEffect, useRef, useMemo } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { Fill, Stroke, Style } from "ol/style";
import getVectorLayers from "../actions/getVectorLayers";
import { getPatternCountByMws, patternIntensityColor } from "./utils/patternIntensityUtils";

const PatternIntensityMapModal = ({
  open,
  onClose,
  district,
  block,
  dataJson,
  patternSelections,
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mwsLayerRef = useRef(null);

  const countByMws = useMemo(() => {
    if (!dataJson || !patternSelections?.selectedMWSPatterns) return {};
    return getPatternCountByMws(dataJson, patternSelections.selectedMWSPatterns);
  }, [dataJson, patternSelections?.selectedMWSPatterns]);

  const maxCount = useMemo(() => {
    const values = Object.values(countByMws);
    return values.length ? Math.max(...values) : 0;
  }, [countByMws]);

  useEffect(() => {
    if (!open || !mapContainerRef.current || !district?.label || !block?.label) return;

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      }),
      zIndex: 0,
    });

    const map = new Map({
      target: mapContainerRef.current,
      view: new View({
        projection: "EPSG:4326",
        center: [80, 23.5],
        zoom: 8,
      }),
      layers: [baseLayer],
    });
    mapRef.current = map;

    const layerName = `deltaG_well_depth_${district.label
      .toLowerCase()
      .split(" ")
      .join("_")}_${block.label
      .toLowerCase()
      .replace(/\s*\(\s*/g, "_")
      .replace(/\s*\)\s*/g, "")
      .replace(/\s+/g, "_")}`;

    getVectorLayers("mws_layers", layerName, true, true).then((mwsLayer) => {
      if (!mapRef.current) return;
      mwsLayerRef.current = mwsLayer;
      mwsLayer.setStyle((feature) => {
        const uid = feature.get?.("uid") ?? feature.values_?.uid;
        const count = countByMws[uid] ?? 0;
        const fillColor = patternIntensityColor(count, maxCount);
        return new Style({
          stroke: new Stroke({ color: "#374151", width: 1 }),
          fill: new Fill({ color: fillColor }),
        });
      });
      mapRef.current.addLayer(mwsLayer);
      const source = mwsLayer.getSource();
      const tryFit = () => {
        const ext = source.getExtent();
        if (ext && ext[0] !== Infinity && !Number.isNaN(ext[0]) && source.getFeatures().length > 0) {
          mapRef.current?.getView().fit(ext, { padding: [40, 40, 80, 40], maxZoom: 14 });
          source.un("change", tryFit);
        }
      };
      source.on("change", tryFit);
    });

    return () => {
      if (mwsLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(mwsLayerRef.current);
        mwsLayerRef.current = null;
      }
      mapRef.current?.setTarget(undefined);
      mapRef.current = null;
    };
  }, [open, district?.label, block?.label]);

  // Update style when countByMws/maxCount change (e.g. pattern selection changed while modal open)
  useEffect(() => {
    if (!open || !mwsLayerRef.current) return;
    mwsLayerRef.current.setStyle((feature) => {
      const uid = feature.get?.("uid") ?? feature.values_?.uid;
      const count = countByMws[uid] ?? 0;
      const fillColor = patternIntensityColor(count, maxCount);
      return new Style({
        stroke: new Stroke({ color: "#374151", width: 1 }),
        fill: new Fill({ color: fillColor }),
      });
    });
  }, [open, countByMws, maxCount]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="pattern-intensity-title">
      <div className="bg-white rounded-xl shadow-xl flex flex-col w-[90vw] max-w-4xl h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="pattern-intensity-title" className="text-lg font-semibold text-gray-800">
            Map View (Pattern intensity)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div ref={mapContainerRef} className="flex-1 min-h-0 w-full" />
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Pattern intensity:</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Safe</span>
            <div
              className="w-8 h-4 rounded border border-gray-300"
              style={{ backgroundColor: patternIntensityColor(0, 1) }}
            />
            <span className="text-xs text-gray-500">0</span>
          </div>
          <div className="flex items-center gap-1 flex-1 max-w-[200px]">
            <div
              className="h-4 flex-1 rounded-l border-y border-l border-gray-300"
              style={{ background: "linear-gradient(to right, rgba(34,197,94,0.55), rgba(234,179,8,0.55))" }}
            />
            <div
              className="h-4 flex-1 rounded-r border border-gray-300"
              style={{ background: "linear-gradient(to right, rgba(234,179,8,0.55), rgba(220,38,38,0.55))" }}
            />
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-4 rounded border border-gray-300"
              style={{ backgroundColor: patternIntensityColor(1, 1) }}
            />
            <span className="text-xs text-gray-600">High stress</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternIntensityMapModal;
