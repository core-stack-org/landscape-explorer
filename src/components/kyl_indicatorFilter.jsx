// src/components/kyl_indicatorFilter.jsx
const KYLIndicatorFilter = ({ filter, onFilterChange }) => {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                    {filter.label}
                </h3>
            </div>
            <div className="space-y-2">
                {filter.values.map((option) => {
                    return (
                        <label 
                            key={option.label}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                            <input
                                type="radio"
                                name={filter.name}
                                checked={filter.selectedValue?.label === option.label}
                                onChange={(e) => onFilterChange(filter.name, option, e.target.checked)}
                                className="w-4 h-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
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