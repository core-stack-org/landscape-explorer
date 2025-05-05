import React, { useState } from 'react';

const MapControls = ({ 
  showMWS, 
  setShowMWS, 
  showVillages, 
  setShowVillages,
  mapRef,
  toggleLayer,
  toggledLayers = {}
}) => {
  const [showLayerControls, setShowLayerControls] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  const handleZoomIn = () => {
    if (!mapRef.current) return;
    const view = mapRef.current.getView();
    const zoom = view.getZoom();
    view.animate({
      zoom: zoom + 1,
      duration: 250
    });
  };

  const handleZoomOut = () => {
    if (!mapRef.current) return;
    const view = mapRef.current.getView();
    const zoom = view.getZoom();
    view.animate({
      zoom: zoom - 1,
      duration: 250
    });
  };

  const handleResetView = () => {
    if (!mapRef.current) return;
    const view = mapRef.current.getView();
    view.animate({
      center: [78.9, 23.6],
      zoom: 5,
      duration: 750
    });
  };

  const handleToggleClick = (layerName, isVisible) => {
    if (toggleLayer) {
      toggleLayer(layerName, isVisible);
    }
  };

  return (
    <div className="absolute bottom-6 right-6 flex flex-col space-y-2">
      {/* Layer controls button */}
      <button
        onClick={() => setShowLayerControls(!showLayerControls)}
        className="bg-white rounded-lg shadow-lg p-2 flex items-center justify-center hover:bg-gray-100"
        title="Toggle layer controls"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h11M5 6a1 1 0 11-2 0 1 1 0 012 0zM5 12a1 1 0 11-2 0 1 1 0 012 0zM5 18a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      </button>

      {/* Layer control panel */}
      {showLayerControls && (
        <div className="bg-white rounded-lg shadow-lg p-3 w-60">
          <h3 className="font-medium text-gray-700 mb-2">Layer Controls</h3>
          
          {/* Layer category buttons */}
          <div className="flex space-x-1 mb-3">
            <button 
              className={`px-2 py-1 text-xs rounded ${activeCategory === 'base' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
              onClick={() => setActiveCategory('base')}
            >
              Base
            </button>
            <button 
              className={`px-2 py-1 text-xs rounded ${activeCategory === 'resources' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
              onClick={() => setActiveCategory('resources')}
            >
              Resources
            </button>
            <button 
              className={`px-2 py-1 text-xs rounded ${activeCategory === 'planning' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
              onClick={() => setActiveCategory('planning')}
            >
              Planning
            </button>
            <button 
              className={`px-2 py-1 text-xs rounded ${activeCategory === 'demographics' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
              onClick={() => setActiveCategory('demographics')}
            >
              Demographics
            </button>
          </div>

          {/* Base layers (always visible) */}
          {(activeCategory === 'base' || activeCategory === null) && (
            <div className="space-y-2 mb-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMWS}
                  onChange={() => setShowMWS(!showMWS)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Show Watersheds</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVillages}
                  onChange={() => setShowVillages(!showVillages)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Show Boundaries</span>
              </label>
            </div>
          )}

          {/* Resources Layers */}
          {activeCategory === 'resources' && (
            <div className="space-y-2 mb-3">
              <h4 className="text-xs font-medium text-gray-600 mb-1">Resources Layers</h4>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toggledLayers.settlement || false}
                  onChange={(e) => handleToggleClick('settlement', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Settlement</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toggledLayers.water_structure || false}
                  onChange={(e) => handleToggleClick('water_structure', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Water Structure</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toggledLayers.well_structure || false}
                  onChange={(e) => handleToggleClick('well_structure', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Well Structure</span>
              </label>
            </div>
          )}

          {/* Planning Layers */}
          {activeCategory === 'planning' && (
            <div className="space-y-2 mb-3">
              <h4 className="text-xs font-medium text-gray-600 mb-1">Planning Layers</h4>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toggledLayers.agri_structure || false}
                  onChange={(e) => handleToggleClick('agri_structure', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Agriculture Structure</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toggledLayers.livelihood_structure || false}
                  onChange={(e) => handleToggleClick('livelihood_structure', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Livelihood Structure</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toggledLayers.recharge_structure || false}
                  onChange={(e) => handleToggleClick('recharge_structure', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Recharge Structure</span>
              </label>
            </div>
          )}

          {/* Other Layers */}
          {activeCategory === 'demographics' && (
            <div className="space-y-2 mb-3">
              <h4 className="text-xs font-medium text-gray-600 mb-1">Other Layers</h4>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toggledLayers.demographics || false}
                  onChange={(e) => handleToggleClick('demographics', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Demographics</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toggledLayers.drainage || false}
                  onChange={(e) => handleToggleClick('drainage', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Drainage</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toggledLayers.remote_sensed_waterbodies || false}
                  onChange={(e) => handleToggleClick('remote_sensed_waterbodies', e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Remote-Sensed Waterbodies</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Zoom controls */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={handleZoomIn}
          className="p-2 w-8 h-8 flex items-center justify-center hover:bg-gray-100"
          title="Zoom in"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="border-t border-gray-200"></div>
        <button
          onClick={handleZoomOut}
          className="p-2 w-8 h-8 flex items-center justify-center hover:bg-gray-100"
          title="Zoom out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="border-t border-gray-200"></div>
        <button
          onClick={handleResetView}
          className="p-2 w-8 h-8 flex items-center justify-center hover:bg-gray-100"
          title="Reset view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MapControls; 