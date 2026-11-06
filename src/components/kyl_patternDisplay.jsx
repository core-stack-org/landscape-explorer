import { Info } from 'lucide-react';

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
                            <h3 className="text-xs font-semibold text-gray-800">
                                {pattern.patternCategory}
                            </h3>
                        </div>
                        {/* <div className="flex items-center gap-2 mt-1">
                            <div className="text-xs text-gray-500">
                                {pattern.level === 0 ? 'MWS' : 'Village'}
                            </div>
                        </div> */}
                    </div>
                     {pattern.triggerExp && (
                        <div className="relative group shrink-0 ml-2">
                            <Info className="w-4 h-4 text-gray-400 hover:text-indigo-600 cursor-pointer" />
                            <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-56 z-50 rounded-md bg-gray-800 text-white text-[11px] leading-snug px-3 py-2 shadow-lg">
                                <span className="font-medium">Trigger: </span>
                                {pattern.triggerExp}
                            </div>
                        </div>
                    )}
                </div>

           
            </div>

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