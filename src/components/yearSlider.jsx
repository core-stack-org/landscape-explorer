import { useEffect, useState } from "react";
import { yearAtom } from "../store/locationStore.jsx";
import { useRecoilState } from "recoil";
import { yearAtomFamily } from "../store/locationStore.jsx";

const YearSlider = ({ currentLayer, sliderId = null }) => {
  const yearDataLulc = [
    { label: "2017-2018", value: "17_18" },
    { label: "2018-2019", value: "18_19" },
    { label: "2019-2020", value: "19_20" },
    { label: "2020-2021", value: "20_21" },
    { label: "2021-2022", value: "21_22" },
    { label: "2022-2023", value: "22_23" },
    { label: "2023-2024", value: "23_24" },
  ];

  const [currentValue, setCurrentValue] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  // const [yearvalue, setYearAtom] = useRecoilState(yearAtom);
  const [yearValue, setYearAtom] = useRecoilState(
    sliderId ? yearAtomFamily(sliderId) : yearAtom
  );

  const isLulcLayerActive =
    currentLayer &&
    (currentLayer.name === "avg_double_cropped" ||
      currentLayer.name.includes("LULC") ||
      currentLayer.name.includes("lulc") ||
      currentLayer.name.includes("lulcWaterrej"));

  useEffect(() => {
    setYearAtom(yearDataLulc[0].value);
  }, []);

  const handleSliderChange = (e) => {
    setCurrentValue(parseInt(e.target.value));
    setYearAtom(yearDataLulc[parseInt(e.target.value)].value);
  };

  if (!isLulcLayerActive) return null;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <div className="relative">
          <div className="bg-white bg-opacity-70 rounded-lg px-4 py-2">
            <div className="text-sm font-medium text-gray-700 mb-1">
              Year Slider
            </div>
            <div className="relative">
              {showTooltip && (
                <div
                  className="absolute -top-8 transform -translate-x-1/2 bg-white rounded px-2 py-1 text-xs shadow"
                  style={{
                    left: `${
                      (currentValue / (yearDataLulc.length - 1)) * 100
                    }%`,
                  }}
                >
                  {yearDataLulc[currentValue].label}
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 min-w-[70px]">
                  {yearDataLulc[0].label}
                </span>

                <input
                  type="range"
                  min={0}
                  max={yearDataLulc.length - 1}
                  value={currentValue}
                  onChange={handleSliderChange}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="flex-grow h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    "--thumb-color": "#3B82F6",
                    "--track-color": "#E5E7EB",
                  }}
                />

                <span className="text-xs text-gray-600 min-w-[70px] text-right">
                  {yearDataLulc[yearDataLulc.length - 1].label}
                </span>
              </div>
              <div className="relative w-full mt-3 h-8">
                {yearDataLulc.map(({ label }, index) => (
                  <div
                    key={index}
                    className="absolute  text-[10px] text-gray-700 text-center whitespace-nowrap"
                    style={{
                      left: `${
                        (index / (yearDataLulc.length - 1)) * 65 + 15.5
                      }%`,
                    }}
                  >
                    {label.split("-")[0]}
                    <br />
                    {label.split("-")[1]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: var(--track-color);
          outline: none;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--thumb-color);
          cursor: pointer;
          border: 2px solid white;
        }

        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--thumb-color);
          cursor: pointer;
          border: 2px solid white;
        }
      `}</style>
    </div>
  );
};

export default YearSlider;