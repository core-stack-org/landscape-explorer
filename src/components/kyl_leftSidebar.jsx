import React, { useState } from 'react';
import KYLIndicatorFilter from './kyl_indicatorFilter';
import KYLPatternDisplay from './kyl_patternDisplay';

const KYLLeftSidebar = ({
    indicatorType,
    setIndicatorType,
    filterSelections,
    setFilterSelections,
    getAllFilterTypes,
    getAllFilters,
    handleFilterSelection,
    setToggleStates,
    currentLayer,
    setCurrentLayer,
    mapRef,
    filtersEnabled,
    getFormattedSelectedFilters,
    // Pattern props
    getAllPatternTypes,
    handlePatternRemoval,
    getSubcategoriesForCategory,
    getPatternsForSubcategory,
    patternSelections,
    handlePatternSelection,
    isPatternSelected
}) => {
    // State to track active tab (Patterns or Filters)
    const [activeTab, setActiveTab] = useState('Filters');
    
    // State to track selected pattern subcategory
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);

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

    // Reset subcategory when changing main category or tab
    const handleCategoryChange = (category) => {
        setIndicatorType(category);
        setSelectedSubcategory(null);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setIndicatorType(null);
        setSelectedSubcategory(null);
    };


    return (
        <div className="w-[320px] bg-white rounded-lg border border-gray-100 p-4">
            <div className="space-y-2">
                {/* Tab Buttons */}
                <div className="flex gap-2 mb-4">
                    <button
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors
                            ${activeTab === 'Patterns'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                        `}
                        onClick={() => handleTabChange('Patterns')}
                    >
                        Patterns (Experimental)
                    </button>
                    <button
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors
                            ${activeTab === 'Filters'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                        `}
                        onClick={() => handleTabChange('Filters')}
                    >
                        Filters
                    </button>
                </div>

                {/* Filters Tab Content */}
                {activeTab === 'Filters' && (
                    <>
                        {(Object.keys(filterSelections.selectedMWSValues).length === 0 && Object.keys(filterSelections.selectedVillageValues).length === 0) &&
                            <button
                                className="w-full py-2 px-2 text-indigo-600 bg-indigo-100 rounded-lg text-xs font-medium text-left mb-1"
                            >
                                Select filters from amongst the different indicators shown below
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
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200
                                    disabled:hover:bg-gray-100 disabled:pointer-events-none
                                    `}
                                    onClick={() => setIndicatorType(category)}
                                    disabled={!filtersEnabled}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>

                        {/* {indicatorType && (
                            <div className="flex justify-end">
                                <button
                                    onClick={handleClearAll}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 underline"
                                    disabled={!filtersEnabled}
                                >
                                    Clear all
                                </button>
                            </div>
                        )} */}

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
                                                        getFormattedSelectedFilters={getFormattedSelectedFilters}
                                                    />
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Patterns Tab Content */}
                {activeTab === 'Patterns' && (
                    <>
                        <button
                            className="w-full py-2 px-2 text-indigo-600 bg-indigo-100 rounded-lg text-sm font-medium text-left"
                        >
                            Click to Know More About Patterns
                        </button>

                        {/* Main Category Buttons (Agriculture, Livelihood) */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            {getAllPatternTypes && getAllPatternTypes().map((category) => (
                                <button
                                    key={category}
                                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors
                                    ${indicatorType === category
                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                        : 'text-gray-600 border-gray-200 hover:bg-gray-50'}
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200
                                    disabled:hover:bg-gray-100 disabled:pointer-events-none
                                    `}
                                    onClick={() => handleCategoryChange(category)}
                                    disabled={!filtersEnabled}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>

                        {/* Show subcategories when a main category is selected */}
                        {indicatorType && !selectedSubcategory && (
                            <div className="bg-gray-50 rounded-lg p-4 mt-4 relative">
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

                                <div className="text-xs font-medium text-gray-600 mb-3">
                                    Select a subcategory:
                                </div>

                                <div className="space-y-2">
                                    {getSubcategoriesForCategory && getSubcategoriesForCategory(indicatorType).map((subcategory) => (
                                        <button
                                            key={subcategory}
                                            className="w-full text-left px-4 py-3 bg-white rounded-md border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-sm font-medium text-gray-700"
                                            onClick={() => setSelectedSubcategory(subcategory)}
                                            disabled={!filtersEnabled}
                                        >
                                            {subcategory}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Show patterns when subcategory is selected */}
                        {indicatorType && selectedSubcategory && (
                            <div className="bg-gray-50 rounded-lg p-4 mt-4 relative">
                                <button
                                    onClick={() => setSelectedSubcategory(null)}
                                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                                    title="Back to subcategories"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M15 18l-6-6 6-6"
                                            stroke="currentColor"
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>

                                <div className="mb-3">
                                    <div className="text-sm font-semibold text-gray-800">
                                        {selectedSubcategory}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {indicatorType}
                                    </div>
                                </div>

                                <div
                                    className="overflow-y-auto custom-scrollbar"
                                    style={{ maxHeight: 'calc(90vh - 320px)' }}
                                >
                                    <div className="space-y-4">
                                        {getPatternsForSubcategory && getPatternsForSubcategory(indicatorType, selectedSubcategory).map((pattern, index) => (
                                            <KYLPatternDisplay
                                                key={pattern.name || index}
                                                pattern={pattern}
                                                isDisabled={!filtersEnabled}
                                                isSelected={isPatternSelected && isPatternSelected(pattern.name, patternSelections)}
                                                onPatternSelect={handlePatternSelection}
                                                handlePatternRemoval={handlePatternRemoval}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default KYLLeftSidebar;