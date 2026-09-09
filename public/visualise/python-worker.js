/* global importScripts, loadPyodide */
let runtime;
self.onmessage = async ({data}) => {
  try {
    if (!runtime) {
      self.postMessage({type: "status", text: "Preparing Python, pandas and Matplotlib…"});
      importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js");
      runtime = await loadPyodide();
      await runtime.loadPackage(["pandas", "matplotlib", "micropip"]);
      await runtime.runPythonAsync('import micropip\nawait micropip.install(["requests", "pyodide-http"])\nimport pyodide_http\npyodide_http.patch_all()\nimport matplotlib\nmatplotlib.use("agg")');
    }
    runtime.setStdout({batched: text => self.postMessage({type: "text", text})});
    runtime.setStderr({batched: text => self.postMessage({type: "text", text})});
    // Each run has fresh variables. Matplotlib's show emits PNGs to this worker's owner.
    await runtime.runPythonAsync(`import matplotlib.pyplot as plt
import io, base64
from js import postMessage
from pyodide.ffi import to_js
plt.close("all")
def _show(*args, **kwargs):
    for number in plt.get_fignums():
        buffer = io.BytesIO()
        plt.figure(number).savefig(buffer, format="png", dpi=120, bbox_inches="tight")
        postMessage(to_js({"type": "image", "url": "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()}, dict_converter=__import__("js").Object.fromEntries))
    plt.close("all")
plt.show = _show`);
    const globals = runtime.toPy({__name__: "__main__"});
    try { await runtime.runPythonAsync(data.code, {globals}); }
    finally { globals.destroy(); }
    self.postMessage({type: "done"});
  } catch(error) { self.postMessage({type: "error", text: String(error)}); }
};
