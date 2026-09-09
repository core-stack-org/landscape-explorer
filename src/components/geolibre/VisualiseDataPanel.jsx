import React, {useEffect, useMemo, useRef, useState} from "react";
import {Chart as ChartJS, BarElement, CategoryScale, LinearScale, TimeScale, PointElement, LineElement, Tooltip, Legend} from "chart.js";
import {Bar, Line} from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import {VIEWS, availableIds, chartRows, exportRows, loadVisualiseSource, pythonExample, recordId, sourceFor, toCsv, waterYear} from "./visualiseData";
import VisualisePython from "./VisualisePython";
import "./visualiseData.css";
ChartJS.register(BarElement, CategoryScale, LinearScale, TimeScale, PointElement, LineElement, Tooltip, Legend);
const colors = ["#2166ac", "#ad5200", "#29805c", "#8051a2", "#b33e57"];
const numberLabel = value => value === null || value === undefined ? "Not available" : typeof value === "number" ? value.toLocaleString(undefined, {maximumFractionDigits: 3}) : String(value);
const groups = [...new Set(VIEWS.map(view => view.group))];

function Chart({view, rows, title, fields = view.fields, category = false, stacked = false, maximum}) {
  const available = rows.some(row => category ? row.value !== null : fields.some(([field]) => row[field] !== null));
  if (!available) return <p className="vd-empty">{title}: no values available for this selection.</p>;
  const data = {labels: rows.map(row => row.period), datasets: category ? [{label: view.unit, data: rows.map(row => row.value), backgroundColor: colors[0]}] : fields.map(([key,label],i) => ({label, data: rows.map(row => row[key]), borderColor: colors[i % colors.length], backgroundColor: colors[i % colors.length], borderWidth: 2, pointRadius: rows.length > 35 ? 1 : 3, pointHitRadius: 10, spanGaps: false}))};
  const options = {responsive: true, maintainAspectRatio: false, animation: false,
    indexAxis: category ? "y" : "x", plugins: {legend: {display: stacked, position: "bottom"}},
    scales: {x: {stacked, grid: {display: false}, ticks: {maxTicksLimit: category ? 6 : 8, maxRotation: 45}, title: {display: category, text: view.unit}, ...(category ? {beginAtZero: true} : {})},
      y: {stacked, beginAtZero: true, ...(maximum ? {max: maximum} : {}), title: {display: !category, text: view.unit}}}};
  const Component = category || stacked ? Bar : Line;
  return <figure className="vd-figure"><figcaption><strong>{title}</strong><span>{view.unit}</span></figcaption>
    <div className="vd-chart" style={{height: category ? Math.max(200, rows.length * 30) : 230}}>
      <Component data={data} options={options} role="img" aria-label={`${title}. Exact values are in the chart data table.`} />
    </div></figure>;
}

function Charts({view, rows}) {
  if (view.kind === "category") return <Chart view={view} rows={rows} title={view.title} category />;
  if (view.stacked) return <Chart view={view} rows={rows} title={view.title} stacked />;
  if (view.kind === "seasonal") return <div className="vd-season-grid">{["Kharif", "Rabi", "Zaid"].map(season =>
    <div key={season}><h3>{season}</h3>{view.fields.map(([field,label]) => <Chart key={field} view={view} fields={[[field,label]]}
      rows={rows.filter(row => row.season === season).map(row => ({...row, period: row.year}))}
      title={label} maximum={Math.max(...rows.map(row => row[field] || 0)) * 1.05} />)}</div>)}</div>;
  return view.fields.map(field => <Chart key={field[0]} view={view} rows={rows} fields={[field]} title={field[1]} />);
}

function CsvDownload({csv, name}) {
  const [url,setUrl] = useState("");
  useEffect(() => {const next = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8"})); setUrl(next); return () => URL.revokeObjectURL(next);}, [csv]);
  return <a href={url} download={name}>Download chart data (.csv)</a>;
}

function Selection({view, data, source, scope}) {
  const ids = useMemo(() => availableIds(data.records, view), [data,view]);
  const [choice,setChoice] = useState("");
  const [chosenYear,setChosenYear] = useState("All years");
  const [occurrence,setOccurrence] = useState(0);
  const selected = ids.includes(choice) ? choice : ids[0];
  const matches = data.records.filter(row => String(recordId(row,view)) === selected);
  const index = occurrence < matches.length ? occurrence : 0;
  const record = matches[index];
  const rows = useMemo(() => chartRows(view,record), [view,record]);
  const years = [...new Set(rows.filter(row => row.date !== undefined).map(row => waterYear(row.date)))];
  const temporal = ["fortnight","ndvi"].includes(view.kind);
  const year = years.includes(chosenYear) ? chosenYear : "All years";
  const shown = temporal && year !== "All years" ? rows.filter(row => waterYear(row.date) === year) : rows;
  const code = pythonExample(view, scope, source.url, selected || "", year, index);
  const columns = view.kind === "category" ? [["period","Measure"],["value",view.unit]] : [["period","Period"], ...view.fields];
  const label = view.entity || "Micro-watershed";
  const labels = new Map(data.records.map(row => [String(recordId(row,view)), row[view.nameField]]));
  if (!ids.length) return <p className="vd-empty">No records with a {label.toLowerCase()} identifier are available.</p>;
  return <>
    <div className="vd-controls"><label>{label}<select aria-label={label} value={selected} onChange={e => {setChoice(e.target.value); setOccurrence(0);}}>{ids.map(id => <option key={id} value={id}>{labels.get(id) ? `${labels.get(id)} · ${id}` : id}</option>)}</select></label>
      {temporal && <label>July–June year<select aria-label="July–June year" value={year} onChange={e => setChosenYear(e.target.value)}><option>All years</option>{years.map(y => <option key={y}>{y}</option>)}</select></label>}
      {matches.length > 1 && <label>Source record<select aria-label="Source record" value={index} onChange={e => setOccurrence(Number(e.target.value))}>{matches.map((_,i) => <option key={i} value={i}>Record {i+1} of {matches.length}</option>)}</select></label>}
    </div>
    {matches.length > 1 && <p className="vd-note">This identifier has {matches.length} source records. The chart shows the selected record.</p>}
    <Charts view={view} rows={shown} />
    <p className="vd-note">{view.note}</p>
    {view.context && <dl className="vd-values">{view.context.map(key => <div key={key}><dt>{key}</dt><dd>{numberLabel(record[key])}</dd></div>)}</dl>}
    {view.surveyFields && <div className="vd-table"><table><caption>Original survey answers</caption><thead><tr><th>Survey question</th><th>Recorded answer</th></tr></thead><tbody>{view.surveyFields.map(field => <tr key={field.col}><th scope="row">{field.label}</th><td>{numberLabel(record[field.col])}</td></tr>)}</tbody></table></div>}
    <details className="vd-table"><summary>Chart data · {shown.length} {view.kind === "category" ? "measures" : "periods"}</summary><div className="vd-table-scroll"><table><thead><tr>{columns.map(([key,label]) => <th key={key}>{label}</th>)}</tr></thead><tbody>{shown.map((row,i) => <tr key={i}>{columns.map(([key]) => <td key={key}>{numberLabel(row[key])}</td>)}</tr>)}</tbody></table></div></details>
    <div className="vd-download"><CsvDownload csv={toCsv(exportRows(view,shown,scope,selected,source.url))} name={`${view.id}-${selected}.csv`} /></div>
    <VisualisePython key={`${view.id}-${selected}-${year}-${index}`} code={code} title={view.title} />
  </>;
}

export default function VisualiseDataPanel({project, scope, hidden, onClose}) {
  const [group,setGroup] = useState("Water");
  const [viewId,setViewId] = useState("annual");
  const choices = VIEWS.filter(view => view.group === group);
  const view = choices.find(view => view.id === viewId) || choices[0];
  const source = sourceFor(view,project,scope);
  const [resource,setResource] = useState({loading: true});
  const [attempt,setAttempt] = useState(0);
  const cache = useRef(new Map());
  useEffect(() => {
    const url = source.url;
    if (cache.current.has(url)) {setResource({url, data: cache.current.get(url)}); return undefined;}
    const controller = new AbortController();
    let disposed = false;
    const timer = setTimeout(() => controller.abort(),90000);
    setResource({url, loading:true});
    loadVisualiseSource(url,controller.signal).then(data => {if (!disposed) {cache.current.set(url,data); setResource({url,data});}})
      .catch(() => {if (!disposed) setResource({url,error:"This layer could not be read. It may not be available for this tehsil. Try again to reload it."});}).finally(() => clearTimeout(timer));
    return () => {disposed = true; clearTimeout(timer); controller.abort();};
  }, [source.url,attempt]);
  const heading = useRef(null), shell = useRef(null);
  const [width,setWidth] = useState(620);
  const [viewport,setViewport] = useState(window.innerWidth);
  const maximum = Math.max(360,Math.round(viewport * 0.85));
  const actualWidth = Math.min(width,maximum);
  const resize = value => setWidth(Math.max(360,Math.min(maximum,value)));
  useEffect(() => {const update = () => setViewport(window.innerWidth); window.addEventListener("resize",update); return () => window.removeEventListener("resize",update);}, []);
  useEffect(() => {if (!hidden) heading.current?.focus();}, [hidden]);
  const close = () => {onClose(); document.querySelector('[aria-controls="visualise-data-panel"]')?.focus();};
  const ready = resource.url === source.url;
  return <aside ref={shell} hidden={hidden} id="visualise-data-panel" className="visualise-data-panel" style={{width:actualWidth}} aria-label="Visualise Data">
    <div className="vd-resizer" role="separator" aria-label="Visualise Data width" aria-orientation="vertical" aria-valuemin={360} aria-valuemax={maximum} aria-valuenow={actualWidth} tabIndex={0}
      onKeyDown={e => {if (["ArrowLeft","ArrowRight"].includes(e.key)) {e.preventDefault(); resize(actualWidth + (e.key === "ArrowLeft" ? 30 : -30));}}}
      onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={e => {if (e.currentTarget.hasPointerCapture(e.pointerId)) resize(shell.current.getBoundingClientRect().right-e.clientX);}} />
    <header className="vd-header"><div><h1 ref={heading} tabIndex={-1}>Visualise Data</h1><p>{scope.tehsil} · {scope.district} · {scope.state}</p></div><button onClick={close}>Close</button></header>
    <div className="vd-picker"><label>Topic<select aria-label="Topic" value={group} onChange={e => setGroup(e.target.value)}>{groups.map(name => <option key={name}>{name}</option>)}</select></label>
      <label>Visual<select aria-label="Visual" value={view.id} onChange={e => setViewId(e.target.value)}>{choices.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
    <div className="vd-scroll"><section className="vd-card" aria-labelledby="vd-title"><p className="vd-layer">{source.name}</p><h2 id="vd-title">{view.title}</h2>
      {(!ready || resource.loading) && <p role="status" className="vd-loading">Loading data…</p>}
      {ready && resource.error && <div role="alert"><p>{resource.error}</p><button onClick={() => setAttempt(n => n+1)}>Try again</button></div>}
      {ready && resource.data && <>
        {resource.data.partial && <p className="vd-warning">Only {resource.data.received} of {resource.data.expected} records were returned. This identifier list is incomplete.</p>}
        <Selection key={view.id} view={view} data={resource.data} source={source} scope={scope} />
        <footer className="vd-source"><a href={source.url} target="_blank" rel="noopener noreferrer">View source data</a><span>Read {new Date(resource.data.fetchedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span></footer>
      </>}
    </section></div>
  </aside>;
}
