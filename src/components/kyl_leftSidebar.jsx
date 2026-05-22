import React, { useState, useEffect } from 'react';
import KYLIndicatorFilter from './kyl_indicatorFilter';
import KYLPatternDisplay from './kyl_patternDisplay';
import { ChevronRight, ArrowLeft } from 'lucide-react';

// Filter section mapping - maps each filter to its section
const FILTER_SECTION_MAP = {
    // MWS Section Filters
    'terrainCluster_ID': 'MWS',
    'lulc_crop_percent': 'MWS',
    'avg_precipitation': 'MWS',
    'avg_runoff': 'MWS',
    'drought_category': 'MWS',
    'avg_number_dry_spell': 'MWS',
    'avg_rabi_surface_water_mws': 'MWS',
    'avg_double_cropped': 'MWS',
    'decrease_in_tree_cover': 'MWS',
    'increase_in_tree_cover': 'MWS',
    'area_wide_scale_restoration': 'MWS',
    'area_protection': 'MWS',
    'green_credit': 'MWS',
    'lcw_conflict': 'MWS',

    // Waterbody Section Filters
    'waterbody_type': 'Waterbody',

    // Village Section Filters
    'total_population': 'Village',
    'essential_education_infra': 'Village',
    'total_assets': 'Village',
};

// Function to get filter section
const getFilterSection = (filterName) => {
    return FILTER_SECTION_MAP[filterName] || 'Other';
};

const KYLLeftSidebar = ({
    indicatorType,
    setIndicatorType,
    filterSelections,
    getAllFilterTypes,
    getAllFilters,
    handleFilterSelection,
    toggleStates,
    handleLayerSelection,
    filtersEnabled,
    getFormattedSelectedFilters,
    getAllPatternTypes,
    handlePatternRemoval,
    getSubcategoriesForCategory,
    getPatternsForSubcategory,
    patternSelections,
    handlePatternSelection,
    isPatternSelected,
    isFilterProcessing,
    isLayerSelecting,
    showConnectivityRef,
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
        ...filterSelections.selectedVillageValues,
        ...filterSelections.selectedWaterbodyValues,
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

    // Get category section mapping
    const getCategorySection = (category) => {
        const filters = getAllFilters().filter(f => f.category === category);
        if (filters.length === 0) return 'Other';
        
        const section = getFilterSection(filters[0].name);
        return section || 'Other';
    };

    // Group categories by section (MWS, Waterbody, Village)
    const getCategoriesBySection = () => {
        const categories = getAllFilterTypes();
        const grouped = {
            'MWS': [],
            'Waterbody': [],
            'Village': [],
            'Other': []
        };

        categories.forEach(category => {
            const section = getCategorySection(category);
            if (grouped[section]) {
                grouped[section].push(category);
            } else {
                grouped[section].push(category);
            }
        });

        // Filter out empty sections
        return Object.entries(grouped).filter(([_, categories]) => categories.length > 0);
    };

    // Group filters by section (MWS, Waterbody, Village)
    const getFiltersBySection = () => {
        const filters = getAllFilters().filter(f => f.category === indicatorType);
        const grouped = {
            'MWS': [],
            'Waterbody': [],
            'Village': [],
            'Other': []
        };

        filters.forEach(filter => {
            const section = getFilterSection(filter.name) || 'Other';
            if (grouped[section]) {
                grouped[section].push(filter);
            } else {
                grouped[section].push(filter);
            }
        });

        // Filter out empty sections
        return Object.entries(grouped).filter(([_, filters]) => filters.length > 0);
    };

    // ── Determine which "view" to show ──────────────────────────────────────
    const showCategoryList = !indicatorType;
    const showFilterList   = !!indicatorType && activeTab === 'Filters';
    const showSubcatList   = !!indicatorType && activeTab === 'Patterns' && !selectedSubcategory;
    const showPatternList  = !!indicatorType && activeTab === 'Patterns' && !!selectedSubcategory;

    return (
        <div className="w-[320px] bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">

            {isLayerSelecting && (
            <div
                className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl gap-3"
                style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(2px)',
                animation: 'fadeIn 0.15s ease-in-out',
                }}
            >
                <div className="w-8 h-8 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-xs font-semibold text-indigo-600">Adding layer to map…</p>
                <p className="text-[10px] text-gray-400">Please wait</p>
            </div>
            )}

            <style>{`
            @keyframes fadeIn {
                from { opacity: 0; }
                to   { opacity: 1; }
            }
            `}</style>

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

                {/* ── VIEW A: Category list WITH SECTION HEADINGS ──────────────────────── */}
                {showCategoryList && (
                    <div className="space-y-6">
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

                        {activeTab === 'Filters' ? (
                            // Filters Tab - Show with section headings
                            getCategoriesBySection().map(([section, categories]) => (
                                <div key={section}>
                                    {/* ── SECTION HEADING ──────────────────────────────────── */}
                                    <div className="mb-4 flex items-center gap-3">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">
                                            {section}
                                        </h3>
                                        <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
                                    </div>

                                    {/* ── CATEGORIES UNDER SECTION ───────────────────────── */}
                                    <div className="space-y-1.5 ml-1">
                                        {categories.map((category) => {
                                            const activeCount = getActiveCategoryCount(category);
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
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Patterns Tab - Show without section headings
                            (getAllPatternTypes?.() || []).map((category) => (
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
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                </button>
                            ))
                        )}
                    </div>
                )}

                {/* ── VIEW B: Filter list WITH SECTION HEADINGS ──────────────────────── */}
                {showFilterList && (
                    <div className="space-y-6">
                        {getFiltersBySection().map(([section, filters]) => (
                            <div key={section}>
                                {/* ── SECTION HEADING ──────────────────────────────────── */}
                                <div className="mb-4 flex items-center gap-3">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">
                                        {section}
                                    </h3>
                                    <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
                                </div>

                                {/* ── FILTERS UNDER SECTION ───────────────────────────── */}
                                <div className="space-y-6 ml-1">
                                    {filters.map(filter => (
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
                                                showConnectivityRef={showConnectivityRef}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
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