import { useEffect, useState ,useRef} from "react";
import { useRecoilState } from "recoil";
import { yearAtom, yearAtomFamily } from "../store/locationStore.jsx";

const YearSliderWB = ({ currentLayer, sliderId = null,interventionYear }) => {
    const THUMB_SIZE = 16;
  const yearDataLulc = [
    { label: "2017-2018", value: "17_18" },
    { label: "2018-2019", value: "18_19" },
    { label: "2019-2020", value: "19_20" },
    { label: "2020-2021", value: "20_21" },
    { label: "2021-2022", value: "21_22" },
    { label: "2022-2023", value: "22_23" },
    { label: "2023-2024", value: "23_24" },
    { label: "2024-2025", value: "24_25" },
  ];
  const [sliderWidth, setSliderWidth] = useState(0);
  const sliderRef = useRef(null);
  const sliderWrapRef = useRef(null);

  useEffect(() => {
    if (!interventionYear) return;
  
    // normalize if needed (23-24 / 2023-2024)
    const normalized =
      interventionYear.includes("-") && interventionYear.length === 9
        ? interventionYear
        : interventionYear;
  
    setYearAtom(normalized);
  }, [interventionYear]);

  useEffect(() => {
    if (!sliderWrapRef.current) return;
  
    const updateWidth = () => {
      setSliderWidth(sliderWrapRef.current.offsetWidth);
    };
  
    updateWidth(); // initial
  
    const ro = new ResizeObserver((entries) => {
      setSliderWidth(entries[0].contentRect.width);
    });
  
    ro.observe(sliderWrapRef.current);
  
    return () => ro.disconnect();
  }, []);

// useEffect(() => {
//     if (sliderRef.current) {
//       setSliderWidth(sliderRef.current.offsetWidth);
//     }
//   }, []);

  const normIntervention = interventionYear
  ? interventionYear.replace("-", "_")
  : null;

  const interventionIndex = normIntervention
  ? yearDataLulc.findIndex(y => y.value === normIntervention)
  : -1;



  const [currentValue, setCurrentValue] = useState(
    yearDataLulc.length - 1
  );
  const [showTooltip, setShowTooltip] = useState(false);

  const [yearValue, setYearAtom] = useRecoilState(
    sliderId ? yearAtomFamily(sliderId) : yearAtom
  );

  const isLulcLayerActive = (() => {
    if (!currentLayer) return false;

    if (typeof currentLayer === "object" && currentLayer.name) {
      return (
        currentLayer.name === "avg_double_cropped" ||
        currentLayer.name.includes("LULC") ||
        currentLayer.name.includes("lulc") ||
        currentLayer.name.includes("lulcWaterrej")
      );
    }

    if (Array.isArray(currentLayer)) {
      return currentLayer.some(
        (layer) =>
          layer.name === "avg_double_cropped" ||
          layer.name === "built_up_area" ||
          layer.name.includes("LULC") ||
          layer.name.includes("lulc")
      );
    }

    return false;
  })();

  useEffect(() => {
    setYearAtom(yearDataLulc[yearDataLulc.length - 1].value);
  }, []);

  useEffect(() => {
    if (!yearValue) return;
  
    const index = yearDataLulc.findIndex((y) => y.value === yearValue);
    if (index !== -1) {
      setCurrentValue(index);
    }
  }, [yearValue]);

  const handleSliderChange = (e) => {
    const index = parseInt(e.target.value);
    setCurrentValue(index);
    setYearAtom(yearDataLulc[index].value);
  };

  if (!isLulcLayerActive) return null;
  const getPosPx = (index) => {
    if (!sliderWidth) return 0;
  
    return (index / (yearDataLulc.length - 1)) * sliderWidth;
  };

  return (
    <div className="w-full mx-auto">
      <div className="relative">
        <div className="bg-white bg-opacity-70 rounded-lg px-4 py-2">
                 <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
           <span className="text-sm font-semibold text-gray-800">
             Year Slider
          </span>
          {interventionYear && (
            <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-md px-3 py-1">
              Intervention: {interventionYear}
            </span>
          )}
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

              {/* Slider */}
              <div ref={sliderWrapRef} className="flex-grow">
                <input
                    type="range"
                    min={0}
                    max={yearDataLulc.length - 1}
                    value={currentValue}
                    onChange={handleSliderChange}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                    "--thumb-color": "#3B82F6",
                    "--track-color": "#E5E7EB",
                    }}
                />
                </div>

              <span className="text-xs text-gray-600 min-w-[70px] text-right">
                {yearDataLulc[yearDataLulc.length - 1].label}
              </span>
            </div>

        {/* Year labels */}
        <div className="relative mt-3 h-10 overflow-visible mx-[70px]">
{/* Intervention line */}
{interventionIndex !== -1 && (
  <div
    className="absolute top-0 h-full w-[2px] bg-red-500"
    style={{
      left: `${getPosPx(interventionIndex)}px`,
      transform: "translateX(-50%)",
      zIndex: 20,
    }}
  />
)}

{/* Year labels */}
{sliderWidth > 0 &&
  yearDataLulc.map(({ label }, index) => (
    <div
      key={index}
      className="absolute text-[10px] text-gray-500 whitespace-nowrap"
      style={{
        left: `${getPosPx(index)}px`,
        top: "20px",
        transform: "translateX(-50%) rotate(-40deg)",
      }}
    >
      {label.replace("-20", "-")}
    </div>
  ))}

</div>

<div className="flex items-center gap-4 pt-3">
           <span className="text-xs text-gray-500">
             {/* Selected: {yearDataLulc[currentValue].label} */}
           </span>
         </div>

          </div>
        </div>
      </div>

      {/* SLIDER STYLE */}
      <style jsx>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: var(--track-color);
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--thumb-color);
          border: 2px solid white;
          cursor: pointer;
        }

        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--thumb-color);
          border: 2px solid white;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default YearSliderWB;


