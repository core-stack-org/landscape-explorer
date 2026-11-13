
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

const KYLPatternDisplay = ({
    pattern,
    isDisabled,
    isSelected,
    onPatternSelect,
    handlePatternRemoval
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({
        top: 0,
        left: 0
    });

    const hideTimeoutRef = useRef(null);

    const handleApplyClick = () => {
        if (!isDisabled && !isSelected) {
            onPatternSelect(pattern, !isSelected);
        } else {
            handlePatternRemoval(pattern);
        }
    };

    const handleTooltipEnter = (event) => {
        clearTimeout(hideTimeoutRef.current);

        const rect = event.currentTarget.getBoundingClientRect();

        const tooltipWidth = Math.min(360, window.innerWidth - 24);
        const estimatedHeight = Math.min(
            420,
            window.innerHeight * 0.7
        );

        const left = Math.max(
            12,
            Math.min(rect.left, window.innerWidth - tooltipWidth - 12)
        );

        let top = rect.bottom + 8;

        // If there isn't enough space below, show tooltip above.
        if (top + estimatedHeight > window.innerHeight - 12) {
            top = Math.max(12, rect.top - estimatedHeight - 8);
        }

        setTooltipPosition({ top, left });
        setShowTooltip(true);
    };

    const handleTooltipLeave = () => {
        hideTimeoutRef.current = setTimeout(() => {
            setShowTooltip(false);
        }, 150);
    };

    const hasTooltipContent = pattern.triggerExp || pattern.comment;

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            {/* Pattern Header */}
            <div className="flex items-start justify-between">
                <h3 className="text-xs font-semibold text-gray-800">
                    {pattern.patternCategory}
                </h3>

                {hasTooltipContent && (
                    <div
                        className="shrink-0 ml-2"
                        onMouseEnter={handleTooltipEnter}
                        onMouseLeave={handleTooltipLeave}
                    >
                        <Info className="w-4 h-4 text-gray-400 hover:text-indigo-600 cursor-pointer" />
                    </div>
                )}
            </div>

            {/* Hover Tooltip - Rendered outside sidebar */}
            {showTooltip && createPortal(
                <div
                    onMouseEnter={() => clearTimeout(hideTimeoutRef.current)}
                    onMouseLeave={handleTooltipLeave}
                    style={{
                        position: 'fixed',
                        top: tooltipPosition.top,
                        left: tooltipPosition.left,
                        width: 'min(360px, calc(100vw - 24px)',
                        maxHeight: '70vh',
                        overflowY: 'auto',
                        zIndex: 99999
                    }}
                    className="rounded-lg bg-gray-800 text-white p-4 shadow-2xl"
                >
                    {pattern.triggerExp && (
                        <div className="mb-3">
                            <p className="text-[11px] font-semibold mb-1">
                                Trigger Expression
                            </p>
                            <p className="text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                                {pattern.triggerExp}
                            </p>
                        </div>
                    )}

                    {/* {pattern.comment && (
                        <div>
                            <p className="text-[11px] font-semibold mb-1">
                                Comment
                            </p>
                            <p className="text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                                {pattern.comment}
                            </p>
                        </div>
                    )} */}
                </div>,
                document.body
            )}

            {/* Apply / Remove Pattern Button */}
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
