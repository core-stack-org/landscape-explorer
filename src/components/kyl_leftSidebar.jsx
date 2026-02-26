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
    toggleStates,
    setToggleStates,
    handleLayerSelection,
    currentLayer,
    setCurrentLayer,
    mapRef,
    filtersEnabled,
    handleClearAll,
    getFormattedSelectedFilters,

    // Pattern props
    getAllPatternTypes,
    handlePatternRemoval,
    getSubcategoriesForCategory,
    getPatternsForSubcategory,
    patternSelections,
    setPatternSelections,
    handlePatternSelection,
    isPatternSelected
}) => {

    const [activeTab, setActiveTab] = useState('Filters');
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);

    const combinedSelectedValues = {
        ...filterSelections.selectedMWSValues,
        ...filterSelections.selectedVillageValues
    };

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
    <div className="w-[320px] bg-white rounded-lg border border-gray-100 p-4 flex flex-col h-[90vh]">

        <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium
                    ${activeTab === 'Patterns'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    onClick={() => handleTabChange('Patterns')}
                >
                    Patterns (Experimental)
                </button>

                <button
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium
                    ${activeTab === 'Filters'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    onClick={() => handleTabChange('Filters')}
                >
                    Filters
                </button>
            </div>

            {/* FILTER SECTION */}
            {activeTab === 'Filters' && (
                <>
                    {(Object.keys(filterSelections.selectedMWSValues).length === 0 &&
                      Object.keys(filterSelections.selectedVillageValues).length === 0) && (
                        <button className="w-full py-2 px-2 text-indigo-600 bg-indigo-100 rounded-lg text-xs text-left mb-1">
                            Select filters from amongst the indicators below
                        </button>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                        {getAllFilterTypes().map((category) => (
                            <button
                                key={category}
                                className={`px-3 py-1.5 rounded-md text-sm border
                                ${indicatorType === category
                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                onClick={() => setIndicatorType(category)}
                                disabled={!filtersEnabled}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {indicatorType && (
                        <div className="bg-gray-50 rounded-lg p-4 mt-2">
                            <div className="flex justify-between mb-4">
                                <h4 className="text-sm font-semibold">{indicatorType}</h4>
                                <button
                                    onClick={() => setIndicatorType(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-6">
                                {getAllFilters()
                                    .filter((filter) => filter.category === indicatorType)
                                    .map((filter) => (
                                        <KYLIndicatorFilter
                                            key={filter.name}
                                            filter={{
                                                ...filter,
                                                selectedValue:
                                                    combinedSelectedValues[filter.name]?.[0]
                                            }}
                                            onFilterChange={handleFilterSelection}
                                            isDisabled={!filtersEnabled}
                                            getFormattedSelectedFilters={getFormattedSelectedFilters}
                                            toggleStates={toggleStates}
                                            handleLayerSelection={handleLayerSelection}
                                        />
                                    ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* PATTERN SECTION */}
            {activeTab === 'Patterns' && (
                <>
                    <button className="w-full py-2 px-2 text-indigo-600 bg-indigo-100 rounded-lg text-sm text-left">
                        Click to Know More About Patterns
                    </button>

                    <div className="flex flex-wrap gap-2 pt-2">
                        {getAllPatternTypes().map((category) => (
                            <button
                                key={category}
                                className={`px-3 py-1.5 rounded-md text-sm border
                                ${indicatorType === category
                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                onClick={() => handleCategoryChange(category)}
                                disabled={!filtersEnabled}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {indicatorType && !selectedSubcategory && (
                        <div className="bg-gray-50 rounded-lg p-4 mt-4">
                            {getSubcategoriesForCategory(indicatorType).map((subcategory) => (
                                <button
                                    key={subcategory}
                                    className="w-full text-left px-4 py-3 bg-white rounded-md border hover:border-indigo-300 hover:bg-indigo-50 text-sm"
                                    onClick={() => setSelectedSubcategory(subcategory)}
                                >
                                    {subcategory}
                                </button>
                            ))}
                        </div>
                    )}

                    {indicatorType && selectedSubcategory && (
                        <div className="bg-gray-50 rounded-lg p-4 mt-4">
                            <div className="space-y-4">
                                {getPatternsForSubcategory(indicatorType, selectedSubcategory)
                                    .map((pattern, index) => (
                                        <KYLPatternDisplay
                                            key={pattern.name || index}
                                            pattern={pattern}
                                            isDisabled={!filtersEnabled}
                                            isSelected={isPatternSelected(
                                                pattern.name,
                                                patternSelections
                                            )}
                                            onPatternSelect={handlePatternSelection}
                                            handlePatternRemoval={handlePatternRemoval}
                                        />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

        </div>

        {/* CLEAR BUTTON */}
        <div className="pt-3 border-t flex justify-end bg-white">
            <button
                onClick={handleClearAll}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600"
            >
                Clear All
            </button>
        </div>

    </div>
    );
};

export default KYLLeftSidebar;