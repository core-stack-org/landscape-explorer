import ToggleButton from "./buttons/toggle_button_kyl";

const KYLIndicatorFilter = ({ filter, onFilterChange, isDisabled, getFormattedSelectedFilters, toggleStates, handleLayerSelection}) => {
    
    const isOptionSelected = (option) => {
        const formattedFilters = getFormattedSelectedFilters();
        const selectedFilter = formattedFilters.find(f => f.name === filter.name);
        if (!selectedFilter) {
            return false;
        }
        return selectedFilter.values.includes(option.label);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                    {filter.label}
                </h3>
                <ToggleButton 
                    isOn={toggleStates[filter.name]} 
                    toggleSwitch={() => handleLayerSelection(filter)}
                />
            </div>
            <div className="space-y-2 pt-1">
                {filter.values.map((option) => {
                    return (
                        <label 
                            key={option.label}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
                        >
                            <input
                                type="checkbox"
                                name={filter.name}
                                checked={isOptionSelected(option)}
                                onChange={(e) => onFilterChange(filter.name, option, e.target.checked)}
                                disabled={isDisabled}
                                className="w-4 h-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-gray-700">{option.label}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
};
export default KYLIndicatorFilter;