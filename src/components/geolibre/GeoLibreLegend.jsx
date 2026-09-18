import { useEffect, useRef, useState } from "react";

export const legendPosition = (bounds, size, fraction = { x: 1, y: 1 }) => {
  const gap = 12;
  const width = Math.max(0, bounds.width - gap * 2);
  const height = Math.max(0, bounds.height - gap * 2);
  return {
    left: gap + Math.max(0, width - size.width) * Math.min(1, Math.max(0, fraction.x)),
    top: gap + Math.max(0, height - size.height) * Math.min(1, Math.max(0, fraction.y)),
    width, height,
  };
};

const GeoLibreLegend = ({ legends = [] }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState("");
  const previousTitlesRef = useRef([]);
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const dragRef = useRef(null);
  const [bounds, setBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [size, setSize] = useState({ width: 288, height: 200 });
  const [fraction, setFraction] = useState({ x: 1, y: 1 });
  const position = legendPosition(bounds, size, fraction);

  useEffect(() => {
    const measure = () => {
      const parent = containerRef.current?.parentElement;
      if (parent) setBounds({ x: 0, y: 0, width: parent.clientWidth, height: parent.clientHeight });
      const card = cardRef.current;
      if (card) setSize({ width: card.offsetWidth, height: card.offsetHeight });
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (containerRef.current?.parentElement) observer?.observe(containerRef.current.parentElement);
    if (cardRef.current) observer?.observe(cardRef.current);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [collapsed, legends.length]);

  const moveBy = (x, y) => setFraction(current => ({
    x: Math.min(1, Math.max(0, current.x + x / Math.max(1, position.width - size.width))),
    y: Math.min(1, Math.max(0, current.y + y / Math.max(1, position.height - size.height))),
  }));

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
    <div ref={containerRef} className="pointer-events-none absolute z-20 overflow-hidden" style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}>
    <aside ref={cardRef} aria-label="Raster legend" className="pointer-events-auto absolute w-72 overflow-auto rounded-lg border border-slate-200 bg-white/95 text-slate-800 shadow-xl backdrop-blur-sm" style={{ left: position.left, top: position.top, maxWidth: position.width, maxHeight: position.height }}>
      <div className="flex items-center">
      <button type="button" aria-label="Move raster legend" title="Drag to move; arrow keys to reposition; Home to reset" className="cursor-move touch-none px-3 py-2"
        onPointerDown={event => {
          if (event.button !== 0) return;
          dragRef.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={event => {
          if (!dragRef.current) return;
          moveBy(event.clientX - dragRef.current.x, event.clientY - dragRef.current.y);
          dragRef.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={event => { dragRef.current = null; event.currentTarget.releasePointerCapture?.(event.pointerId); }}
        onPointerCancel={() => { dragRef.current = null; }}
        onLostPointerCapture={() => { dragRef.current = null; }}
        onKeyDown={event => {
          const directions = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] };
          if (event.key === "Home") { event.preventDefault(); setFraction({ x: 1, y: 1 }); }
          else if (directions[event.key]) { event.preventDefault(); moveBy(...directions[event.key]); }
        }}
      ><span aria-hidden="true">⠿</span></button>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
      >
        <span>Raster legend</span>
        <span aria-hidden="true">{collapsed ? "+" : "−"}</span>
      </button>
      </div>

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
    </div>
  );
};

export default GeoLibreLegend;
