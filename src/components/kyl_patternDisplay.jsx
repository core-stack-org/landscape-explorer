
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info,X } from 'lucide-react';

const KYLPatternDisplay = ({
    pattern,
    isDisabled,
    isSelected,
    onPatternSelect,
    handlePatternRemoval,
    onVisualise,
    isVisualised
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
        const [showInfoBox, setShowInfoBox] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({
        top: 0,
        left: 0
    });

    const sigIds = [...new Set(pattern.triggerExp?.match(/sig_\d+/g) ?? [])];
    const signalLabels = pattern.descriptions ?? {};
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
        console.log({ rectTop: rect.top, rectBottom: rect.bottom, rectLeft: rect.left, innerHeight: window.innerHeight, innerWidth: window.innerWidth });

        const tooltipWidth = Math.min(360, window.innerWidth - 24);
        const estimatedHeight = 120;

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
                        onClick={() => { setShowTooltip(false); setShowInfoBox(true); }}

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
                        width: 'min(360px, calc(100vw - 24px))',
                        maxHeight: '70vh',
                        overflowY: 'auto',
                        zIndex: 99999
                    }}
                    className="rounded-lg bg-gray-800 text-white p-4 shadow-2xl"
                >
                    {pattern.triggerExp && (
                        <div>
                            <p className="text-[11px] font-semibold mb-1">Trigger Expression</p>
                            <p className="text-[11px] leading-relaxed break-words whitespace-pre-wrap text-gray-300">
                                {pattern.triggerExp}
                            </p>

                            {sigIds.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-600">
                                    <p className="text-[11px] font-semibold mb-2">What each signal means</p>
                                    <ul className="space-y-2">
                                        {sigIds.map((id) => (
                                            <li key={id} className="flex items-start gap-2">
                                                <span className="shrink-0 font-mono text-[11px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded">
                                                    {id}
                                                </span>
                                                <span className="font-mono text-[11px] leading-snug break-words">
                                                    {signalLabels[id] ?? 'Description not available'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
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

                                        {pattern.comment && (
                        <button
                            type="button"
                            onClick={() => { setShowTooltip(false); setShowInfoBox(true); }}
                            className="mt-3 pt-3 border-t border-gray-600 w-full text-left text-[11px] font-semibold text-indigo-300 hover:text-indigo-200"
                        >
                            View full explanation →
                        </button>
                    )}
                </div>,
                document.body
            )}

                        {showInfoBox && createPortal(
                <div
                    onClick={() => setShowInfoBox(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
                    className="flex items-center justify-center bg-black/40 p-4"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-semibold text-gray-800">
                                {pattern.patternCategory}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowInfoBox(false)}
                                className="shrink-0 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">
                            {pattern.comment ?? 'Explanation not available'}
                        </p>
                    </div>
                </div>,
                document.body
            )}


            {/* Apply / Remove Pattern Button */}
            <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                <button
                    onClick={handleApplyClick}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors
                        ${isDisabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isSelected
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                    disabled={isDisabled}
                >
                    {isSelected ? 'Remove' : 'Apply Pattern'}
                </button>

                {isSelected && (
                    <button
                        type="button"
                        onClick={() => onVisualise?.(pattern)}
                        className="flex-1 flex items-center justify-between gap-2 py-2 px-3 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <span>Visualise</span>
                        <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${isVisualised ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isVisualised ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default KYLPatternDisplay;
