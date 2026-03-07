import React, { useEffect, useRef, useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !mapContainerRef.current || !district?.label || !block?.label) return;

    let mounted = true;
    const container = mapContainerRef.current;

    const initMap = async () => {
      setLoading(true);
      setError(null);
      try {
        const baseLayer = new TileLayer({
          source: new XYZ({
            url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
            maxZoom: 30,
          }),
        });

        const map = new Map({
          target: container,
          layers: [baseLayer],
          view: new View({
            center: [0, 0],
            zoom: 4,
          }),
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

        const mwsLayer = await getVectorLayers("mws_layers", layerName, true, true);
        if (!mounted) return;

        mwsLayerRef.current = mwsLayer;
        map.addLayer(mwsLayer);

        const countByMws = getPatternCountByMws(
          dataJson || [],
          patternSelections?.selectedMWSPatterns || {}
        );
        const maxCount = Math.max(1, ...Object.values(countByMws));

        mwsLayer.setStyle((feature) => {
          const uid = feature.get("uid");
          const count = uid != null ? countByMws[uid] ?? 0 : 0;
          const t = maxCount > 0 ? count / maxCount : 0;
          const color = patternIntensityColor(t);
          return new Style({
            stroke: new Stroke({ color: "#1f2937", width: 1 }),
            fill: new Fill({ color }),
          });
        });

        const source = mwsLayer.getSource();
        const fitView = () => {
          const features = source.getFeatures();
          if (features.length > 0) {
            try {
              map.getView().fit(source.getExtent(), {
                padding: [40, 40, 40, 40],
                maxZoom: 14,
                duration: 300,
              });
            } catch (_) {}
          }
        };
        source.on("change", fitView);
        setTimeout(fitView, 800);
      } catch (err) {
        if (mounted) setError(err?.message || "Failed to load map");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initMap();
    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
        mapRef.current = null;
      }
      mwsLayerRef.current = null;
    };
  }, [open, district?.label, block?.label, dataJson, patternSelections?.selectedMWSPatterns]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pattern-intensity-map-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="pattern-intensity-map-title" className="text-lg font-semibold text-gray-800">Pattern intensity across MWS</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative flex-1 min-h-[400px] bg-gray-100">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <span className="text-gray-600 font-medium">Loading map…</span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 p-4">
              <p className="text-red-600 text-center">{error}</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Intensity (stress patterns):</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Safe</span>
            <div
              className="w-16 h-3 rounded border border-gray-300"
              style={{
                background: "linear-gradient(to right, rgba(34,197,94,0.75), rgba(234,179,44,0.75), rgba(220,38,38,0.75))",
              }}
            />
            <span className="text-xs text-gray-600">High stress</span>
          </div>
          <p className="text-xs text-gray-500">
            Green = no stress patterns; yellow/orange = moderate; red = high number of patterns matched.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PatternIntensityMapModal;
