import React, {useEffect, useRef, useState} from "react";

export default function VisualisePython({code, title}) {
  const [edited, setEdited] = useState(code);
  const [outputs, setOutputs] = useState([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const worker = useRef(null);
  const stop = () => { worker.current?.terminate(); worker.current = null; setRunning(false); setStatus("Stopped. Run again to start a fresh Python session."); };
  useEffect(() => () => worker.current?.terminate(), []);
  const run = () => {
    setRunning(true); setOutputs([]); setStatus("Running Python…");
    if (!worker.current) worker.current = new Worker(`${process.env.PUBLIC_URL || ""}/visualise/python-worker.js`);
    worker.current.onmessage = ({data}) => {
      if (data.type === "status") setStatus(data.text);
      else if (data.type === "done") {setRunning(false); setStatus("Finished");}
      else if (data.type === "error") {setRunning(false); setStatus(data.text);}
      else setOutputs(old => [...old, data]);
    };
    worker.current.onerror = event => {setRunning(false); setStatus(event.message || "Python could not start. Try again."); worker.current?.terminate(); worker.current = null;};
    worker.current.postMessage({code: edited});
  };
  return <details className="vd-code"><summary>Python code</summary>
    <p>Read the same data and reproduce this visual with pandas and Matplotlib. Edit or copy the code, or run it here. Python starts on the first run.</p>
    <textarea aria-label={`Python code — ${title}`} spellCheck={false} value={edited} onChange={event => setEdited(event.target.value)} />
    <div className="vd-controls"><button onClick={run} disabled={running}>Run Python</button><button onClick={stop} disabled={!running}>Stop</button>
      <button onClick={() => {setEdited(code); setOutputs([]);}} disabled={running}>Reset code</button>
      <button onClick={async () => {try {await navigator.clipboard.writeText(edited); setStatus("Code copied");} catch {setStatus("Select the code and copy it with your keyboard.");}}}>Copy code</button></div>
    <p role="status" className="vd-python-status">{status}</p>
    {outputs.map((output,index) => output.type === "image" ? <img key={index} src={output.url} alt={`${title} — Python output`} /> : <pre key={index}>{output.text}</pre>)}
  </details>;
}
