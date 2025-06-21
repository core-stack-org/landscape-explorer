import React from 'react';
import KYLIndicatorFilter from './kyl_indicatorFilter';

const KYLLeftSidebar = ({
    indicatorType,
    setIndicatorType,
    filterSelections,
    setFilterSelections,
    getAllFilterTypes,
    getAllFilters,
    handleFilterSelection,
    state,
    district,
    block,
    // Add just these new props
    setToggleStates,
    currentLayer,
    setCurrentLayer,
    mapRef,
    filtersEnabled
}) => {
    const combinedSelectedValues = {
        ...filterSelections.selectedMWSValues,
        ...filterSelections.selectedVillageValues
    };

    const handleClearAll = () => {
        // Remove all layers from the map
        if (currentLayer.length > 0) {
            currentLayer.forEach(layer => {
                layer.layerRef.forEach(ref => {
                    if (mapRef.current) {
                        mapRef.current.removeLayer(ref);
                    }
                });
            });
        }

        // Reset all toggle states
        setToggleStates({});

        // Clear all layers
        setCurrentLayer([]);

        // Clear all filters
        setFilterSelections({
            selectedMWSValues: {},
            selectedVillageValues: {}
        });
    };

    return (
        <div className="w-[320px] bg-white rounded-lg border border-gray-100 p-4">
            <div className="space-y-2">
                <button
                    className="w-full py-2 px-2 text-indigo-600 bg-indigo-100 rounded-lg text-sm font-medium text-left"
                    onClick={() => window.open("https://docs.google.com/document/d/13wht82tXmw0x-ORfVLYBnfUDkkabzqOxvqwmIXGRmpk/edit?usp=sharing", '_blank', 'noopener,noreferrer')}
                >
                    Click to Know More About Indicators
                </button>
                {(Object.keys(filterSelections.selectedMWSValues).length === 0 && Object.keys(filterSelections.selectedVillageValues).length === 0) &&
                    <button
                        className="w-full py-2 px-2 text-indigo-600 bg-indigo-100 rounded-lg text-xs font-medium text-left mb-1"
                    >
                        Click on a micro-watershed (blue outline) to view its report or select filters from amongst the different indicators shown below
                    </button>
                }
                <div className="flex flex-wrap gap-2 pt-2">
                    {getAllFilterTypes().map((category) => (
                        <button
                            key={category}
                            className={`px-3 py-1.5 rounded-md text-sm border transition-colors
                                ${indicatorType === category
                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'}
                            `}
                            onClick={() => setIndicatorType(category)}
                            disabled={!filtersEnabled}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {indicatorType && (
                    <div className="flex justify-end">
                        <button
                            onClick={handleClearAll}
                            className="text-xs text-indigo-600 hover:text-indigo-700 underline"
                            disabled={!filtersEnabled}
                        >
                            Clear all
                        </button>
                    </div>
                )}

                {indicatorType && (
                    <div className="bg-gray-50 rounded-lg p-4 mt-2 relative">
                        <button
                            onClick={() => setIndicatorType(null)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M18 6L6 18M6 6l12 12"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>

                        <div
                            className="overflow-y-auto custom-scrollbar"
                            style={{ maxHeight: 'calc(90vh - 280px)' }}
                        >
                            <div className="space-y-6">
                                {getAllFilters()
                                    .filter((filter) => filter.category === indicatorType)
                                    .map((filter) => (
                                        <div key={filter.name} className="space-y-3">
                                            <KYLIndicatorFilter
                                                filter={{
                                                    ...filter,
                                                    selectedValue: combinedSelectedValues[filter.name]?.[0]
                                                }}
                                                onFilterChange={handleFilterSelection}
                                                isDisabled={!filtersEnabled}
                                            />
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KYLLeftSidebar;