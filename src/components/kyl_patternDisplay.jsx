import React, { useState } from 'react';

const KYLPatternDisplay = ({ pattern, isDisabled, isSelected, onPatternSelect }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleApplyClick = () => {
        if (!isDisabled) {
            onPatternSelect(pattern, !isSelected);
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
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isDisabled}
                    >
                        <svg
                            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>

                {/* Characteristics - Always Visible */}
                <div className="text-xs text-gray-600 leading-relaxed">
                    <span className="font-medium text-gray-700">Characteristics: </span>
                    {pattern.characteristics}
                </div>
            </div>

            {/* Expanded Content - Only Value Labels */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                    <div className="text-xs font-medium text-gray-700 mb-2">
                        Conditions:
                    </div>
                    {pattern.values.map((valueItem, index) => (
                        <div
                            key={index}
                            className="text-sm text-gray-700 pl-3 py-1"
                        >
                            • {valueItem.label}
                        </div>
                    ))}
                </div>
            )}

            {/* Apply Pattern Button */}
            <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                    onClick={handleApplyClick}
                    className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors
                    ${isDisabled
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                    disabled={isDisabled}
                >
                    {'Apply Pattern'}
                </button>
            </div>
        </div>
    );
};

export default KYLPatternDisplay;