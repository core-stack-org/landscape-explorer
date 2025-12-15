const KYLPatternDisplay = ({ pattern, isDisabled, isSelected, onPatternSelect, handlePatternRemoval }) => {
    //const [isExpanded, setIsExpanded] = useState(false);

    const handleApplyClick = () => {
        if (!isDisabled && !isSelected) {
            onPatternSelect(pattern, !isSelected);
        }
        else{
            handlePatternRemoval(pattern)
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            {/* Pattern Header - Always Visible */}
            <div className="space-y-2">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-800">
                                {pattern.patternCategory}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="text-xs text-indigo-600 font-medium">
                                {pattern.subcategory}
                            </div>
                            <span className="text-xs text-gray-400">•</span>
                            <div className="text-xs text-gray-500">
                                {pattern.level === 0 ? 'MWS' : 'Village'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Characteristics - Always Visible */}
                <div className="text-xs text-gray-600 leading-relaxed">
                    <span className="font-medium text-gray-700">Characteristics: </span>
                    {pattern.characteristics}
                </div>
            </div>

            {/* Expanded Content - Only Value Labels */}
            {/* Apply Pattern Button */}
            <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                    onClick={handleApplyClick}
                    className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors
                        ${isDisabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isSelected
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                    disabled={isDisabled}
                >
                    {isSelected ? 'Remove Pattern' : 'Apply Pattern'}
                </button>
            </div>
        </div>
    );
};

export default KYLPatternDisplay;