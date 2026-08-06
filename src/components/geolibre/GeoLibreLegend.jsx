import { useEffect, useRef, useState } from "react";

const GeoLibreLegend = ({ legends = [] }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState("");
  const previousTitlesRef = useRef([]);

  useEffect(() => {
    const titles = legends.map((legend) => legend.title);
    const addedTitle = titles.find(
      (title) => !previousTitlesRef.current.includes(title)
    );
    if (addedTitle) setCollapsed(false);
    setSelectedTitle((current) =>
      addedTitle || (titles.includes(current) ? current : titles[0] || "")
    );
    previousTitlesRef.current = titles;
  }, [legends]);

  if (!legends.length) return null;

  const selected =
    legends.find((legend) => legend.title === selectedTitle) || legends[0];

  return (
    <aside className="absolute bottom-10 right-3 z-20 w-72 max-w-[calc(100%-1.5rem)] rounded-lg border border-slate-200 bg-white/95 text-slate-800 shadow-xl backdrop-blur-sm md:right-[22rem]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
      >
        <span>Legend</span>
        <span aria-hidden="true">{collapsed ? "+" : "−"}</span>
      </button>

      {!collapsed && (
        <div className="border-t border-slate-200 px-3 pb-3 pt-2">
          {legends.length > 1 ? (
            <label className="block">
              <span className="sr-only">Visible layer legend</span>
              <select
                className="mb-3 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                value={selected.title}
                onChange={(event) => setSelectedTitle(event.target.value)}
              >
                {legends.map((legend) => (
                  <option key={legend.title} value={legend.title}>
                    {legend.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mb-3 text-sm font-medium">{selected.title}</p>
          )}

          <ul className="max-h-64 space-y-2 overflow-y-auto text-xs">
            {selected.items.map((item) => (
              <li key={`${item.label}-${item.color}`} className="flex items-center gap-2">
                <span
                  className={
                    item.shape === "circle"
                      ? "h-3 w-3 shrink-0 rounded-full"
                      : item.shape === "line"
                        ? "h-0.5 w-4 shrink-0"
                        : "h-3 w-3 shrink-0 rounded-sm"
                  }
                  style={{
                    backgroundColor: item.color,
                    border: item.strokeColor
                      ? `1px solid ${item.strokeColor}`
                      : undefined,
                  }}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
};

export default GeoLibreLegend;
