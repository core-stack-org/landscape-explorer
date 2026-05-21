import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { yearAtom, yearAtomFamily } from "../store/locationStore.jsx";

const YearSlider = ({ currentLayer, sliderId = null, interventionYear }) => {
  const yearDataLulcFull = [
    { label: "2017-18", value: "17_18" },
    { label: "2018-19", value: "18_19" },
    { label: "2019-20", value: "19_20" },
    { label: "2020-21", value: "20_21" },
    { label: "2021-22", value: "21_22" },
    { label: "2022-23", value: "22_23" },
    { label: "2023-24", value: "23_24" },
    { label: "2024-25", value: "24_25" },
    { label: "2025-26", value: "25_26" },
  ];

  const isAvgDoubleCropped = (() => {
    if (!currentLayer) return false;
    if (typeof currentLayer === "object" && currentLayer.name)
      return currentLayer.name === "avg_double_cropped";
    if (Array.isArray(currentLayer))
      return currentLayer.some((l) => l.name === "avg_double_cropped");
    return false;
  })();

  const yearDataLulc = isAvgDoubleCropped
    ? yearDataLulcFull.slice(0, 8)
    : yearDataLulcFull;

  const [currentValue, setCurrentValue] = useState(0);
  const [yearValue, setYearAtom] = useRecoilState(
    sliderId ? yearAtomFamily(sliderId) : yearAtom
  );

  const isLulcLayerActive = (() => {
    if (!currentLayer) return false;

    const isExcludedLulc = (name) => {
      if (!name) return false;
      return (
        name === "lulc_crop_percent" ||
        name === "lulc_forest_percent" ||
        name === "lulc_shrub_percent"
      );
    };

    if (typeof currentLayer === "object" && currentLayer.name)
      return (
        (currentLayer.name === "avg_double_cropped" ||
        currentLayer.name.includes("LULC") ||
        currentLayer.name.includes("lulc")) &&
        !isExcludedLulc(currentLayer.name)
      );
    if (Array.isArray(currentLayer))
      return currentLayer.some(
        (l) =>
          (l.name === "avg_double_cropped" ||
          l.name === "built_up_area" ||
          l.name.includes("LULC") ||
          l.name.includes("lulc")) &&
          !isExcludedLulc(l.name)
      );
    return false;
  })();

  useEffect(() => {
    setYearAtom(yearDataLulc[0].value);
    setCurrentValue(0);
  }, [yearDataLulc.length]);

  useEffect(() => {
    if (!interventionYear) return;
    setYearAtom(interventionYear);
  }, [interventionYear]);

  const normIntervention = interventionYear
    ? interventionYear.replace("-", "_")
    : null;
  const interventionIndex = normIntervention
    ? yearDataLulc.findIndex((y) => y.value === normIntervention)
    : -1;

  const handleSliderChange = (e) => {
    const index = parseInt(e.target.value);
    setCurrentValue(index);
    setYearAtom(yearDataLulc[index].value);
  };

  const trackFillPct = (currentValue / (yearDataLulc.length - 1)) * 100;

  if (!isLulcLayerActive) return null;

  return (
    <div className="w-full">
      <div
        className="rounded-2xl px-5 pt-3 pb-4 border border-white/40"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1.5px 6px rgba(99,102,241,0.08)",
        }}
      >
        {/* ── Header row ── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Calendar icon */}
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Year
            </span>
          </div>

          {/* Active year pill */}
          <div className="flex items-center gap-1.5">
            {interventionYear && interventionIndex !== -1 && (
              <span className="text-[9px] font-semibold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                ↓ {interventionYear}
              </span>
            )}
            <span
              className="text-xs font-bold px-3 py-1 rounded-full border"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
                color: "white",
                borderColor: "#6366f1",
                boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
              }}
            >
              {yearDataLulc[currentValue].label}
            </span>
          </div>
        </div>

        {/* ── Slider ── */}
        <div className="relative mb-1">
          <input
            type="range"
            min={0}
            max={yearDataLulc.length - 1}
            value={currentValue}
            onChange={handleSliderChange}
            className="w-full appearance-none h-1.5 rounded-full outline-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #6366f1 0%, #818cf8 ${trackFillPct}%, #e5e7eb ${trackFillPct}%, #e5e7eb 100%)`,
            }}
          />

          {/* Intervention year marker */}
          {interventionIndex !== -1 && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${(interventionIndex / (yearDataLulc.length - 1)) * 100}%`,
                top: "-6px",
                transform: "translateX(-50%)",
              }}
            >
              <div className="w-0.5 h-5 bg-red-400 opacity-80 rounded-full" />
            </div>
          )}
        </div>

        {/* ── Year labels + tick marks ── */}
        <div className="relative mt-2.5" style={{ height: "28px" }}>
          {yearDataLulc.map(({ label }, index) => {
            const pct = (index / (yearDataLulc.length - 1)) * 100;
            const isActive = index === currentValue;
            const isIntervention = index === interventionIndex;

            return (
              <button
                key={index}
                onClick={() => {
                  setCurrentValue(index);
                  setYearAtom(yearDataLulc[index].value);
                }}
                className="absolute flex flex-col items-center gap-0.5 group focus:outline-none"
                style={{
                  left: `${pct}%`,
                  transform: "translateX(-50%)",
                  top: 0,
                }}
              >
                {/* Tick */}
                <div
                  className="rounded-full transition-all duration-150"
                  style={{
                    width: isActive ? "2px" : "1px",
                    height: isActive ? "8px" : "5px",
                    background: isIntervention
                      ? "#f87171"
                      : isActive
                        ? "#6366f1"
                        : "#d1d5db",
                  }}
                />
                {/* Label */}
                <span
                  className="text-[9px] leading-none font-medium transition-all duration-150 whitespace-nowrap"
                  style={{
                    color: isIntervention
                      ? "#ef4444"
                      : isActive
                        ? "#6366f1"
                        : "#9ca3af",
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border: 2.5px solid white;
          box-shadow: 0 0 0 2px #6366f1, 0 2px 8px rgba(99,102,241,0.35);
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 0 3px #6366f1, 0 4px 12px rgba(99,102,241,0.45);
        }
        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(1.1);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border: 2.5px solid white;
          box-shadow: 0 0 0 2px #6366f1, 0 2px 8px rgba(99,102,241,0.35);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default YearSlider;