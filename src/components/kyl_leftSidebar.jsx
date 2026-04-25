import React, { useState, useEffect } from 'react';
import KYLIndicatorFilter from './kyl_indicatorFilter';
import KYLPatternDisplay from './kyl_patternDisplay';
import { ChevronRight, ArrowLeft } from 'lucide-react';

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
    getFormattedSelectedFilters,
    getAllPatternTypes,
    handlePatternRemoval,
    getSubcategoriesForCategory,
    getPatternsForSubcategory,
    patternSelections,
    handlePatternSelection,
    isPatternSelected,
    isFilterProcessing
}) => {
    const [activeTab, setActiveTab] = useState('Filters');
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);

    useEffect(() => {
        setActiveTab('Filters');
        setSelectedSubcategory(null);
        setIndicatorType(null);
    }, []);

    const combinedSelectedValues = {
        ...filterSelections.selectedMWSValues,
        ...filterSelections.selectedVillageValues
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setIndicatorType(null);
        setSelectedSubcategory(null);
    };

    const isDisabled = !filtersEnabled || isFilterProcessing;

    // Count active filters per category for badges
    const getActiveCategoryCount = (category) => {
        return getAllFilters()
            .filter(f => f.category === category)
            .reduce((count, f) => {
                const mwsVals = filterSelections.selectedMWSValues?.[f.name];
                const vilVals = filterSelections.selectedVillageValues?.[f.name];
                const wbVals = filterSelections.selectedWaterbodyValues?.[f.name];
                if (mwsVals?.length || vilVals?.length || wbVals?.length) return count + 1;
                return count;
            }, 0);
    };

    // ── Determine which "view" to show ──────────────────────────────────────
    const showCategoryList = !indicatorType;
    const showFilterList   = !!indicatorType && activeTab === 'Filters';
    const showSubcatList   = !!indicatorType && activeTab === 'Patterns' && !selectedSubcategory;
    const showPatternList  = !!indicatorType && activeTab === 'Patterns' && !!selectedSubcategory;

    return (
        <div className="w-[320px] bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">

            {/* ── Tabs — always visible ───────────────────────────────────── */}
            <div className="flex gap-2 p-3 pb-0 shrink-0">
                {['Filters', 'Patterns'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors
                            ${activeTab === tab
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        {tab === 'Patterns' ? 'Patterns (Experimental)' : 'Filters'}
                    </button>
                ))}
            </div>

            {/* ── Breadcrumb header — shown when inside a category ────────── */}
            {indicatorType && (
                <div className="flex items-center gap-2 px-3 pt-3 pb-1 shrink-0">
                    <button
                        onClick={() => {
                            setIndicatorType(null);
                            setSelectedSubcategory(null);
                        }}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back
                    </button>
                    <span className="text-gray-300">|</span>
                    <span className="text-xs text-gray-500 font-medium truncate">
                        {selectedSubcategory
                            ? <><span className="text-gray-400">{indicatorType}</span> › {selectedSubcategory}</>
                            : indicatorType
                        }
                    </span>
                    {selectedSubcategory && (
                        <>
                            <span className="text-gray-300">|</span>
                            <button
                                onClick={() => setSelectedSubcategory(null)}
                                className="text-indigo-500 hover:text-indigo-700 text-xs font-medium ml-auto shrink-0"
                            >
                                Categories
                            </button>
                        </>
                    )}
                </div>
            )}

            <div className="w-full h-px bg-gray-100 mt-2 shrink-0" />

            {/* ── Scrollable content area ──────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-3 custom-scrollbar">

                {/* ── VIEW A: Category list ─────────────────────────────────── */}
                {showCategoryList && (
                    <div className="space-y-1.5">
                        {/* hint */}
                        {activeTab === 'Filters' &&
                         Object.keys(filterSelections.selectedMWSValues).length === 0 &&
                         Object.keys(filterSelections.selectedVillageValues).length === 0 && (
                            <p className="text-[11px] text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg mb-3 border border-indigo-100">
                                Select a category below to apply filters
                            </p>
                        )}
                        {activeTab === 'Patterns' && (
                            <p className="text-[11px] text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg mb-3 border border-indigo-100">
                                Select a pattern category to explore
                            </p>
                        )}

                        {(activeTab === 'Filters' ? getAllFilterTypes() : (getAllPatternTypes?.() || []))
                            .map((category) => {
                                const activeCount = activeTab === 'Filters' ? getActiveCategoryCount(category) : 0;
                                return (
                                    <button
                                        key={category}
                                        onClick={() => {
                                            setIndicatorType(category);
                                            setSelectedSubcategory(null);
                                        }}
                                        disabled={isDisabled}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg
                                            border text-sm font-medium transition-all
                                            ${isDisabled
                                                ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
                                                : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                                            }`}
                                    >
                                        <span>{category}</span>
                                        <div className="flex items-center gap-2">
                                            {activeCount > 0 && (
                                                <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full leading-none">
                                                    {activeCount}
                                                </span>
                                            )}
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </button>
                                );
                            })
                        }
                    </div>
                )}

                {/* ── VIEW B: Filter list ───────────────────────────────────── */}
                {showFilterList && (
                    <div className="space-y-6">
                        {getAllFilters()
                            .filter(f => f.category === indicatorType)
                            .map(filter => (
                                <div key={filter.name}>
                                    <KYLIndicatorFilter
                                        filter={{
                                            ...filter,
                                            selectedValue: combinedSelectedValues[filter.name]?.[0]
                                        }}
                                        onFilterChange={handleFilterSelection}
                                        isDisabled={isDisabled}
                                        getFormattedSelectedFilters={getFormattedSelectedFilters}
                                        toggleStates={toggleStates}
                                        handleLayerSelection={handleLayerSelection}
                                    />
                                </div>
                            ))
                        }
                    </div>
                )}

                {/* ── VIEW C: Pattern subcategory list ─────────────────────── */}
                {showSubcatList && (
                    <div className="space-y-1.5">
                        {getSubcategoriesForCategory?.(indicatorType).map(subcategory => (
                            <button
                                key={subcategory}
                                onClick={() => setSelectedSubcategory(subcategory)}
                                disabled={isDisabled}
                                className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm font-medium text-gray-700 hover:text-indigo-700"
                            >
                                <span>{subcategory}</span>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                        ))}
                    </div>
                )}

                {/* ── VIEW D: Pattern list ──────────────────────────────────── */}
                {showPatternList && (
                    <div className="space-y-4">
                        {getPatternsForSubcategory?.(indicatorType, selectedSubcategory).map((pattern, index) => (
                            <KYLPatternDisplay
                                key={pattern.name || index}
                                pattern={pattern}
                                isDisabled={isDisabled}
                                isSelected={isPatternSelected?.(pattern.name, patternSelections)}
                                onPatternSelect={handlePatternSelection}
                                handlePatternRemoval={handlePatternRemoval}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KYLLeftSidebar;