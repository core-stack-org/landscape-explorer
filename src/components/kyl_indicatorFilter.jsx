import ToggleButton from "./buttons/toggle_button_kyl";
import { toast, Toaster } from "react-hot-toast";
import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

const KYLIndicatorFilter = ({ filter, onFilterChange, isDisabled, getFormattedSelectedFilters, toggleStates, handleLayerSelection,showConnectivityRef}) => {
    
    const [showSource, setShowSource] = useState(false);
    const sourceRef = useRef(null);

    useEffect(() => {
    const handleClickOutside = (event) => {
        if (
            sourceRef.current &&
            !sourceRef.current.contains(event.target)
        ) {
            setShowSource(false);
        }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
}, []);

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
<div className="flex items-start justify-between gap-4 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2 relative" ref={sourceRef}>
    <h3 className="text-sm font-semibold text-gray-900">
        {filter.label}
    </h3>

    <button
        type="button"
    onClick={() => setShowSource(true)}
        className="text-gray-400 hover:text-indigo-600 transition-colors"
    >
        <Info size={15} />
    </button>

    {showSource && (
        <div className="absolute top-6 left-0 z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-xl p-3">
            <p className="text-xs font-semibold text-gray-800 mb-1">
                Source
            </p>

            <p className="text-xs text-gray-600">
                {filter.source || "Source information will be available soon."}
            </p>
        </div>
    )}
</div>
                    <ToggleButton 
                        isOn={toggleStates[filter.name]} 
                        toggleSwitch={() => {
                            if (showConnectivityRef.current) {
                                toast.error(
                                    "Please turn off MWS Connectivity before using Visualize."
                                );
                                return;
                            }
                            handleLayerSelection(filter)}}
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