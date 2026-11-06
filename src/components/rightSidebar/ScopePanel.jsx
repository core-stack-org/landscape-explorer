import { Loader2, X, Table } from 'lucide-react';
import SelectButton from '../buttons/select_button';

// The default block extracted from kyl_rightSidebar.jsx. Markup is unchanged;
// every value and handler comes in as a prop.
function SectionHeader({ title, count, action }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-700">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {action}
    </div>
  );
}

export default function ScopePanel({
  state, district, block, setState, setDistrict, setBlock, statesData, handleItemSelect,
  isLoading, mwsReady,
  handleTehsilReport, toggleWaterbodies, loadingWB, showWB,
  handlePlansClick, showPlans, handleStewardsClick, showStewards,
  toggleConnectivity, showConnectivity,
  toggleFarmBoundaries, farmBoundariesLoading, showFarmBoundaries,
  getFormattedSelectedFilters, setShowSelectionPopup, handleIndicatorRemoval, toggleStates,
  selectedMWS, selectedVillages, displayVillages, buildVillageReportUrl,
  getFormattedSelectedPatterns, handlePatternRemoval,
}) {
  const controlsDisabled = isLoading || !mwsReady;
  const disabledClass = 'opacity-50 cursor-not-allowed pointer-events-none bg-gray-100 text-gray-400 border-gray-200';
  const filters = getFormattedSelectedFilters();
  const patterns = getFormattedSelectedPatterns();

  return (
    <div className="flex flex-col gap-2">

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
        <p className="text-[11px] text-indigo-600 font-medium">
          Click on a micro-watershed (blue outline) to view its report.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="space-y-3">
          {[
            { label: 'State', val: state, setVal: setState, data: statesData },
            { label: 'District', val: district, setVal: setDistrict, data: state?.district ?? null },
            { label: 'Tehsil', val: block, setVal: setBlock, data: district?.blocks ?? null },
          ].map(({ label, val, setVal, data }) => (
            <div key={label} className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-500 w-12 shrink-0">{label}</label>
              <SelectButton
                currVal={val || { label: `Select ${label}` }}
                stateData={data}
                handleItemSelect={handleItemSelect}
                setState={setVal}
                className="w-full"
              />
            </div>
          ))}
        </div>

        {block && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleTehsilReport}
                disabled={controlsDisabled}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors border ${
                  controlsDisabled ? disabledClass : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7s-8.268-2.943-9.542-7z" />
                </svg>
                Tehsil Report
              </button>

              <button
                onClick={toggleWaterbodies}
                disabled={controlsDisabled}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors border ${
                  controlsDisabled
                    ? disabledClass
                    : showWB
                      ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-100'
                      : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
                }`}
              >
                {loadingWB ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading…</>
                ) : showWB ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C12 2 7 8 7 12a5 5 0 0 0 8.6 3.5" />
                      <line x1="3" y1="3" x2="21" y2="21" />
                    </svg>
                    Hide Waterbodies
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C12 2 7 8 7 12a5 5 0 0 0 10 0c0-4-5-10-5-10z" />
                    </svg>
                    Show Waterbodies
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePlansClick}
                disabled={controlsDisabled}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors border ${
                  controlsDisabled
                    ? disabledClass
                    : showPlans
                      ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-100'
                      : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
                }`}
              >
                {showPlans ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                )}
                {showPlans ? 'Hide Plans' : 'Plans'}
              </button>

              <button
                onClick={handleStewardsClick}
                disabled={controlsDisabled}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors border ${
                  controlsDisabled
                    ? disabledClass
                    : showStewards
                      ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-100'
                      : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
                }`}
              >
                {showStewards ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    <line x1="3" y1="3" x2="21" y2="21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                )}
                {showStewards ? 'Hide Stewards' : 'Stewards'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={toggleConnectivity}
                disabled={controlsDisabled}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors border ${
                  controlsDisabled
                    ? disabledClass
                    : showConnectivity
                      ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-100'
                      : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="5" cy="12" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="19" cy="19" r="2" />
                  <line x1="7" y1="12" x2="17" y2="6" /><line x1="7" y1="12" x2="17" y2="18" />
                </svg>
                {showConnectivity ? 'Hide Connectivity' : 'MWS Connectivity'}
              </button>

              <button
                onClick={toggleFarmBoundaries}
                disabled={controlsDisabled || farmBoundariesLoading}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors border ${
                  controlsDisabled
                    ? disabledClass
                    : showFarmBoundaries
                      ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-100'
                      : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
                }`}
              >
                {farmBoundariesLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                )}
                {farmBoundariesLoading ? 'Loading…' : showFarmBoundaries ? 'Hide Farm Boundaries' : 'Show Farm Boundaries'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <SectionHeader
          title="Selected Indicators"
          count={filters.length}
          action={
            filters.length > 0 && (
              <button
                onClick={() => setShowSelectionPopup(true)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
              >
                <Table className="w-3 h-3" />
                View Selection
              </button>
            )
          }
        />

        {filters.length > 0 ? (
          <>
            <div className="max-h-[160px] overflow-y-auto pr-1 space-y-1.5">
              {filters.map((filter, index) => (
                <div key={index} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-700 truncate">{filter.filterName}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {filter.values.map((value, vi) => (
                        <span key={vi} className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">{value}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleIndicatorRemoval(filter)}
                    className={`text-gray-300 hover:text-red-400 mt-0.5 transition-colors shrink-0 ${
                      toggleStates[filter.name] && filter.layer_store?.[0] !== 'waterbody' ? 'invisible' : ''
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
              {selectedMWS !== null && selectedMWS.length === 0 && selectedVillages !== null && selectedVillages.size === 0 ? (
                <p className="text-[11px] text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                  No micro-watersheds or villages match the selected filters.
                </p>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-bold text-blue-600 leading-none">{selectedMWS?.length ?? 0}</p>
                    <p className="text-[10px] text-blue-400 font-medium mt-0.5">Micro-Watershed</p>
                  </div>
                  <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-bold text-emerald-600 leading-none">{selectedVillages?.size ?? 0}</p>
                    <p className="text-[10px] text-emerald-400 font-medium mt-0.5">Villages</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-gray-400 italic text-center py-3">
            No indicators selected. Use the left panel to apply filters.
          </p>
        )}
      </div>

      {displayVillages.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Selected Villages</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
              {displayVillages.length}
            </span>
          </div>

          <div className="max-h-44 overflow-y-auto pr-1 flex flex-wrap gap-1.5">
            {displayVillages.map((village) => (
              <button
                key={village.villageId}
                type="button"
                title={`Open report for ${village.villageName}`}
                onClick={() => window.open(buildVillageReportUrl(village.villageId), '_blank', 'noopener,noreferrer')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-medium bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 max-w-full transition-colors"
              >
                <span className="truncate">{village.villageName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {patterns.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <SectionHeader title="Selected Patterns" count={patterns.length} />
          <div className="max-h-[140px] overflow-y-auto pr-1 space-y-1.5">
            {patterns.map((pattern, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-700 truncate">{pattern.category}</p>
                  {pattern.patternName && pattern.patternName !== pattern.category && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{pattern.patternName}</p>
                  )}
                </div>
                <button
                  onClick={() => handlePatternRemoval(pattern)}
                  className={`text-gray-300 hover:text-red-400 transition-colors shrink-0 ${
                    toggleStates[pattern.patternName] ? 'invisible' : ''
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
