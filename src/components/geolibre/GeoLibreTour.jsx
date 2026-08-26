import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";

export const GEOLIBRE_TOUR_STEPS = [
  {
    title: "Find layers to explore",
    description:
      "The Layers panel is on the left. Scroll through its themes, open a theme, and use the eye button beside any layer to show or hide it.",
    tip: "You can keep several layers visible together. Hide a layer whenever it gets in the way of what you are studying.",
  },
  {
    title: "Start with a micro-watershed",
    description:
      "Open Hydrology and show MicroWatershed Boundaries. Add Annual Water Balance to compare conditions across the small areas where rainfall and runoff drain towards a common outlet.",
    tip: "Click a micro-watershed to inspect its information, and lower the layer opacity if you also want to see the satellite image below it.",
  },
  {
    title: "Follow the water network",
    description:
      "Show Drainage Lines, Rivers, and Canals together. Zoom in and out to follow smaller drainage lines into rivers and see where canals branch away from them.",
    tip: "Pan along a river instead of looking at the whole tehsil at once. Local connections become clearer as you zoom in.",
  },
  {
    title: "See how land use changes",
    description:
      "Open a LULC group and choose a year. Level 1 gives a broad view of land cover, while Levels 2 and 3 show more detailed land-use classes.",
    tip: "Try one recent year first. Then switch years to look for changes in crops, water, vegetation, or built-up land.",
  },
  {
    title: "Understand what you see",
    description:
      "Use a layer's identify control, then click the map to read information for that place. The legend explains the colours used by the visible layers.",
    tip: "If the map becomes crowded, hide a few layers or reduce their opacity before comparing values and colours.",
  },
  {
    title: "Save a layer or learn more",
    description:
      "Open the three-dot menu beside a layer to see its download options. GeoLibre Tutorials explain more map tools, and QGIS Documentation shows how to open downloaded CoRE Stack layers in QGIS.",
    tip: "Before saving, check that you selected the layer, area, and file format you actually need.",
  },
];

const GeoLibreTour = ({ open, onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") {
        setStepIndex((value) => Math.max(0, value - 1));
      }
      if (event.key === "ArrowRight") {
        setStepIndex((value) =>
          Math.min(GEOLIBRE_TOUR_STEPS.length - 1, value + 1)
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const step = GEOLIBRE_TOUR_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === GEOLIBRE_TOUR_STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="geolibre-tour-title"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-700">
              Explore CoRE Stack Data Layers · {stepIndex + 1} of {GEOLIBRE_TOUR_STEPS.length}
            </p>
            <h2
              id="geolibre-tour-title"
              className="mt-2 text-xl font-semibold text-slate-900"
            >
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close GeoLibre quick tour"
            title="Close tour"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-700">
          {step.description}
        </p>
        <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50 p-3 text-sm leading-5 text-purple-900">
          <span className="font-semibold">Tip:</span> {step.tip}
        </div>

        <div className="mt-5 flex gap-1" aria-label="Tour progress">
          {GEOLIBRE_TOUR_STEPS.map((item, index) => (
            <span
              key={item.title}
              className={`h-1.5 flex-1 rounded-full ${
                index <= stepIndex ? "bg-purple-600" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <a
            href="https://geolibre.app/tutorials/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-700 hover:text-purple-900"
          >
            Official tutorials
            <ExternalLink className="h-4 w-4" />
          </a>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => setStepIndex((value) => value - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (isLast) onClose();
                else setStepIndex((value) => value + 1);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-purple-700 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-800"
            >
              {isLast ? "Finish" : "Next"}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GeoLibreTour;
