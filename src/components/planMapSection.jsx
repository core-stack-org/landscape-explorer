import React, { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import { defaults as defaultControls } from "ol/control";
import MouseWheelZoom from "ol/interaction/MouseWheelZoom";
import PinchZoom from "ol/interaction/PinchZoom";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";

const MapSection = ({
  title,
  loadLayer,
  loadBoundary,
  districtNameSafe,
  blockNameSafe,
  plan
}) => {
  const mapEl = useRef(null);
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (!plan) return;

    const mapInstance = new Map({
      target: mapEl.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
          }),
        }),
      ],
      view: new View({
        center: [78.9, 23.6],
        zoom: 6,
        projection: "EPSG:4326",
      }),
      controls: defaultControls(),
    });

    setMap(mapInstance);
    mapInstance.getInteractions().forEach((interaction) => {
        if (
          interaction instanceof MouseWheelZoom ||
          interaction instanceof PinchZoom ||
          interaction instanceof DoubleClickZoom
        ) {
          interaction.setActive(false);
        }
      });

    // Boundary first
    loadBoundary(mapInstance, districtNameSafe, blockNameSafe);

    // Load the layer for this map section
    loadLayer(mapInstance);

    return () => mapInstance.setTarget(null);
  }, [plan]);

  // Function to zoom
  const zoomMap = (amount) => {
    if (!map) return;
    const view = map.getView();
    view.animate({
      zoom: view.getZoom() + amount,
      duration: 300,
    });
  };

  return (
    <div className="mb-10 relative">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>

      <div
        ref={mapEl}
        className="w-full h-[450px] border rounded-lg shadow bg-white relative"
      />

      {/* ZOOM CONTROLS */}
      <div className="absolute top-14 right-4 flex flex-col gap-1 z-[999]">
        <button
          className="bg-white border border-gray-300 rounded-md w-9 h-9 text-lg 
                     cursor-pointer hover:bg-gray-100 active:scale-95 transition"
          onClick={() => zoomMap(+1)}
        >
          +
        </button>

        <button
          className="bg-white border border-gray-300 rounded-md w-9 h-9 text-lg 
                     cursor-pointer hover:bg-gray-100 active:scale-95 transition"
          onClick={() => zoomMap(-1)}
        >
          –
        </button>
      </div>
    </div>
  );
};

export default MapSection;
