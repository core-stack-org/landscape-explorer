import React, { useState, useEffect } from 'react';
import KYLIndicatorFilter from './kyl_indicatorFilter';
import KYLPatternDisplay from './kyl_patternDisplay';
import { ChevronRight, ArrowLeft, AlertCircle, WifiOff, FileX, Loader2 } from 'lucide-react';

// ─── Filter section mapping ───────────────────────────────────────────────────

const FILTER_SECTION_MAP = {
  'terrainCluster_ID':            'MWS',
  'relief':                       'MWS',
  'relative_mean_elevation' :     'MWS',
  'lulc_crop_percent':            'MWS',
  'avg_precipitation':            'MWS',
  'avg_runoff':                   'MWS',
  'drought_category':             'MWS',
  'avg_number_dry_spell':         'MWS',
  'avg_rabi_surface_water_mws':   'MWS',
  'avg_zaid_surface_water_mws':   'MWS',
  'aquifer_class':                'MWS',
  'soge_class':                   'MWS',
  'trend_g':                      'MWS',
  'avg_double_cropped':           'MWS',
  'degradation_land_area':        'MWS',
  'river_available':              'MWS',
  'canal_available':              'MWS',
  'decrease_in_tree_cover':       'MWS',
  'increase_in_tree_cover':       'MWS',
  'area_wide_scale_restoration':  'MWS',
  'area_protection':              'MWS',
  'green_credit':                 'MWS',
  'lcw_conflict':                 'MWS',
  'factory_csr':                  'MWS',
  'mining':                       'MWS',

  'waterbody_type':               'Waterbody',
  'waterbody_size':               'Waterbody',
  'surface_water_trend':          'Waterbody',
  'drainage_line':                'Waterbody',

  'total_population':             'Village',
  'percent_st_population':        'Village',
  'percent_sc_population':        'Village',
  'literacy_level':               'Village',
  'essential_education_infra':    'Village',
  'higher_education_infra':       'Village',
  'advanced_health_services':     'Village',
  'public_distribution_system':   'Village',
  'financial_inclusion':          'Village',
  'agri_market_access':           'Village',
  'post_harvest_infra':           'Village',
  'farmer_cooperatives_access':   'Village',
  'livestock_management_centers': 'Village',
  'agricultural_support_infrastructure':    'Village',
  'total_assets':                 'Village',
};

const getFilterSection = (filterName) => FILTER_SECTION_MAP[filterName] || 'Other';

// ─── Disabled reason banner ───────────────────────────────────────────────────
// Maps each dataJsonError value to an icon + colour scheme + message.
// Kept as a lookup so adding new error types only requires one edit here.

const DISABLED_REASON_META = {
  not_found: {
    Icon:    FileX,
    bg:      'bg-amber-50',
    border:  'border-amber-200',
    iconCls: 'text-amber-500',
    textCls: 'text-amber-800',
    label:   'Oops. Data not yet generated for this location yet',
    detail: (
        <>
        Request data for the location via this form{' '}
        <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSesYshZg_HmNc0FgF-JSBye-AeN6mdyrhF2cjGmqLYeD7WgZA/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium hover:opacity-70"
            onClick={(e) => e.stopPropagation()}
        >
            here
        </a>
        .
        </>
    )
  },
  network: {
    Icon:    WifiOff,
    bg:      'bg-red-50',
    border:  'border-red-200',
    iconCls: 'text-red-500',
    textCls: 'text-red-800',
    label:   'Data taking time to load ?',
    detail:  'Use the Retry button in the error notification to reload MWS data.',
  },
  parse: {
    Icon:    AlertCircle,
    bg:      'bg-red-50',
    border:  'border-red-200',
    iconCls: 'text-red-500',
    textCls: 'text-red-800',
    label:   'Malformed data response',
    detail:  'The server returned unexpected data. Try refreshing the page.',
  },
  loading: {
    Icon:    Loader2,
    bg:      'bg-indigo-50',
    border:  'border-indigo-200',
    iconCls: 'text-indigo-400 animate-spin',
    textCls: 'text-indigo-700',
    label:   'Map is loading…',
    detail:  'Filters will be available once the map finishes loading.',
  },
};

const VILLAGE_REASON_META = {
  not_found: {
    Icon:    FileX,
    bg:      'bg-amber-50',
    border:  'border-amber-200',
    iconCls: 'text-amber-500',
    textCls: 'text-amber-800',
    label:   'No village data for this block',
    detail:  'Village attribute data hasn\'t been generated here yet.',
  },
  network: {
    Icon:    WifiOff,
    bg:      'bg-red-50',
    border:  'border-red-200',
    iconCls: 'text-red-500',
    textCls: 'text-red-800',
    label:   'Data taking time to load ?',
    detail:  'Use the Retry button in the error notification to reload.',
  },
  parse: {
    Icon:    AlertCircle,
    bg:      'bg-red-50',
    border:  'border-red-200',
    iconCls: 'text-red-500',
    textCls: 'text-red-800',
    label:   'Malformed village data',
    detail:  'The server returned unexpected data. Try refreshing.',
  },
};

/**
 * Resolves which reason key to use given the props.
 * Returns null when filters are enabled (no banner needed).
 *
 * @param {boolean} filtersEnabled
 * @param {string|null} filtersDisabledReason  — raw string from parent
 * @returns {keyof DISABLED_REASON_META | null}
 */
function resolveReasonKey(filtersEnabled, filtersDisabledReason) {
  if (filtersEnabled) return null;
  if (!filtersDisabledReason) return null;

  if (filtersDisabledReason.includes('No MWS data'))        return 'not_found';
  if (filtersDisabledReason.includes('failed to load'))     return 'network';
  if (filtersDisabledReason.includes('malformed'))          return 'parse';
  if (filtersDisabledReason.includes('loading'))            return 'loading';

  return null; // unknown reason — render nothing rather than a broken banner
}

// Resolves a villageJsonError string → key for VILLAGE_REASON_META
function resolveVillageReasonKey(villageFiltersDisabledReason) {
  if (!villageFiltersDisabledReason) return null;
  if (villageFiltersDisabledReason.includes('No village data'))  return 'not_found';
  if (villageFiltersDisabledReason.includes('failed to load'))   return 'network';
  if (villageFiltersDisabledReason.includes('malformed'))        return 'parse';
  return null;
}

function FiltersDisabledBanner({ reasonKey }) {
  if (!reasonKey) return null;

  const { Icon, bg, border, iconCls, textCls, label, detail } =
    DISABLED_REASON_META[reasonKey];

  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${bg} ${border} mb-3`}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconCls}`} />
      <div>
        <p className={`text-xs font-semibold leading-snug ${textCls}`}>{label}</p>
        <p className={`text-[11px] leading-snug mt-0.5 ${textCls} opacity-80`}>{detail}</p>
      </div>
    </div>
  );
}

function VillageFiltersBanner({ reasonKey }) {
  if (!reasonKey) return null;
  const { Icon, bg, border, iconCls, textCls, label, detail } =
    VILLAGE_REASON_META[reasonKey];
 
  return (
    <div className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border ${bg} ${border} mb-3`}>
      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${iconCls}`} />
      <div>
        <p className={`text-[11px] font-semibold leading-snug ${textCls}`}>{label}</p>
        <p className={`text-[10px] leading-snug mt-0.5 ${textCls} opacity-80`}>{detail}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
  filtersDisabledReason,
  villageFiltersDisabledReason,
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

  // Resolve the reason key once — used by the banner and the empty-state hint
  const reasonKey = resolveReasonKey(filtersEnabled, filtersDisabledReason);

  const getActiveCategoryCount = (category) => {
    return getAllFilters()
      .filter(f => f.category === category)
      .reduce((count, f) => {
        const mwsVals = filterSelections.selectedMWSValues?.[f.name];
        const vilVals = filterSelections.selectedVillageValues?.[f.name];
        const wbVals  = filterSelections.selectedWaterbodyValues?.[f.name];
        if (mwsVals?.length || vilVals?.length || wbVals?.length) return count + 1;
        return count;
      }, 0);
  };

  const getCategorySection = (category) => {
    const filters = getAllFilters().filter(f => f.category === category);
    if (filters.length === 0) return 'Other';
    return getFilterSection(filters[0].name) || 'Other';
  };

  const getCategoriesBySection = () => {
    const categories = getAllFilterTypes();
    const grouped = { MWS: [], Waterbody: [], Village: [], Other: [] };
    categories.forEach(category => {
      const section = getCategorySection(category);
      (grouped[section] ?? grouped.Other).push(category);
    });
    return Object.entries(grouped).filter(([, cats]) => cats.length > 0);
  };

  const getFiltersBySection = () => {
    const filters = getAllFilters().filter(f => f.category === indicatorType);
    const grouped = { MWS: [], Waterbody: [], Village: [], Other: [] };
    filters.forEach(filter => {
      const section = getFilterSection(filter.name) || 'Other';
      (grouped[section] ?? grouped.Other).push(filter);
    });
    return Object.entries(grouped).filter(([, flt]) => flt.length > 0);
  };

  const showCategoryList = !indicatorType;
  const showFilterList   = !!indicatorType && activeTab === 'Filters';
  const showSubcatList   = !!indicatorType && activeTab === 'Patterns' && !selectedSubcategory;
  const showPatternList  = !!indicatorType && activeTab === 'Patterns' && !!selectedSubcategory;

  return (
    <div className="w-[320px] bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">

      {/* ── Layer-selecting overlay ─────────────────────────────────────── */}
      {isLayerSelecting && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl gap-3"
          style={{
            background:     'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(2px)',
            animation:      'fadeIn 0.15s ease-in-out',
          }}
        >
          <div className="w-8 h-8 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-indigo-600">Adding layer to map…</p>
          <p className="text-[10px] text-gray-400">Please wait</p>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex gap-2 p-3 pb-0 shrink-0">
        {['Filters', 'Patterns'].map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors
              ${activeTab === tab
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
          >
            {tab === 'Patterns' ? 'Patterns (Experimental)' : 'Filters'}
          </button>
        ))}
      </div>

      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      {indicatorType && (
        <div className="flex items-center gap-2 px-3 pt-3 pb-1 shrink-0">
          <button
            onClick={() => { setIndicatorType(null); setSelectedSubcategory(null); }}
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

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-3 custom-scrollbar">

        {/* ── VIEW A: Category list ───────────────────────────────────── */}
        {showCategoryList && (
          <div className="space-y-6">

            {/*
              Disabled reason banner — shown instead of the normal hint
              when filters are unavailable for a known reason.
              When filters ARE enabled, show the normal instructional hint.
            */}
            {isDisabled && reasonKey
              ? <FiltersDisabledBanner reasonKey={reasonKey} />
              : activeTab === 'Filters' &&
                Object.keys(filterSelections.selectedMWSValues).length === 0 &&
                Object.keys(filterSelections.selectedVillageValues).length === 0 && (
                  <p className="text-[11px] text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg mb-3 border border-indigo-100">
                    Select a category below to apply filters
                  </p>
                )
            }

            {activeTab === 'Patterns' && (
              <p className="text-[11px] text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg mb-3 border border-indigo-100">
                Select a pattern category to explore
              </p>
            )}

            {activeTab === 'Filters' ? (
              getCategoriesBySection().map(([section, categories]) => (
                <div key={section}>
                  <div className="mb-4 flex items-center gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">
                      {section}
                    </h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
                  </div>

                  <div className="space-y-1.5 ml-1">
                    {categories.map((category) => {
                      const activeCount = getActiveCategoryCount(category);
                      return (
                        <button
                          key={category}
                          onClick={() => { setIndicatorType(category); setSelectedSubcategory(null); }}
                          disabled={isDisabled}
                          title={isDisabled && reasonKey ? DISABLED_REASON_META[reasonKey].label : undefined}
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
              (getAllPatternTypes?.() || []).map((category) => (
                <button
                  key={category}
                  onClick={() => { setIndicatorType(category); setSelectedSubcategory(null); }}
                  disabled={isDisabled}
                  title={isDisabled && reasonKey ? DISABLED_REASON_META[reasonKey].label : undefined}
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

        {/* ── VIEW B: Filter list ─────────────────────────────────────── */}
        {showFilterList && (
            <div className="space-y-6">
            {getFiltersBySection().map(([section, filters]) => {
                const isVillageSection = section === 'Village';
                const villageReasonKey = resolveVillageReasonKey(villageFiltersDisabledReason);

                return (
                <div key={section}>
                    {isVillageSection && villageReasonKey && !isDisabled && (
                        <VillageFiltersBanner reasonKey={villageReasonKey} />
                    )}
        
                    <div className="space-y-6 ml-1">
                        {filters.map(filter => {
                            return(
                                <div key={filter.name}>
                                <KYLIndicatorFilter
                                    filter={{
                                    ...filter,
                                    selectedValue: combinedSelectedValues[filter.name]?.[0],
                                    }}
                                    onFilterChange={handleFilterSelection}
                                    isDisabled={isDisabled || (isVillageSection && !!villageReasonKey)}          // ← per-section disabled
                                    getFormattedSelectedFilters={getFormattedSelectedFilters}
                                    toggleStates={toggleStates}
                                    handleLayerSelection={handleLayerSelection}
                                    showConnectivityRef={showConnectivityRef}
                                />
                                </div>
                            )
                        })}
                    </div>
                </div>
                );
            })}
            </div>
        )}

        {/* ── VIEW C: Pattern subcategory list ───────────────────────── */}
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

        {/* ── VIEW D: Pattern list ────────────────────────────────────── */}
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