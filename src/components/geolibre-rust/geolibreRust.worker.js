/* eslint-env worker */

import {
  extractWmsSubset,
  listManifests,
  runTool,
} from "geolibre-wasm/tools";

const CURATED_TOOL_IDS = [
  "raster_summary_stats",
  "slope",
  "hillshade",
  "focal_statistics",
  "write_geoparquet",
  "reclassify_field",
  "dissolve",
];

let engineMetadata = null;
const workerScope = globalThis; // eslint-disable-line no-undef

function outputPayload(bytes, fileName, mimeType) {
  const copy = new Uint8Array(bytes).slice();
  return {
    payload: {
      kind: "file",
      bytes: copy.buffer,
      fileName,
      mimeType,
      size: copy.byteLength,
    },
    transfer: [copy.buffer],
  };
}

function toolError(toolId, result) {
  const detail = result.stdout?.join("\n").trim();
  return new Error(
    detail || `${toolId} exited with status ${result.exitCode}`
  );
}

function requireOutput(toolId, result, expectedName) {
  if (result.exitCode !== 0) {
    throw toolError(toolId, result);
  }

  const output =
    result.files[expectedName] || Object.values(result.files || {})[0];
  if (!output) {
    throw new Error(`${toolId} completed without producing an output file`);
  }
  return output;
}

async function initialize() {
  if (engineMetadata) {
    return engineMetadata;
  }

  const manifests = await listManifests();
  const selected = manifests.filter((manifest) =>
    CURATED_TOOL_IDS.includes(manifest.id)
  );
  const categories = manifests.reduce((counts, manifest) => {
    const category = manifest.category || "Other";
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});

  engineMetadata = {
    toolCount: manifests.length,
    categories,
    curatedTools: selected,
    version: "1.1.0",
  };
  return engineMetadata;
}

async function extractRaster(source, bbox, size) {
  return extractWmsSubset(source.endpoint, {
    layers: source.qualifiedName,
    styles: source.wmsStyle || "",
    bbox,
    bboxCrs: 4326,
    outputCrs: 4326,
    width: size,
    height: size,
    format: "image/geotiff",
    version: "1.1.1",
  });
}

async function runRasterWorkflow({ source, bbox, workflow, options = {} }) {
  const size = Math.max(256, Math.min(Number(options.size) || 1024, 4096));
  const sourceBytes = await extractRaster(source, bbox, size);
  const baseName = `${source.fileName}_${workflow}`;

  if (workflow === "extract") {
    return outputPayload(sourceBytes, `${baseName}.tif`, "image/tiff");
  }

  if (workflow === "summary") {
    const output = "summary.json";
    const result = await runTool("raster_summary_stats", {
      args: [
        "--input=/work/source.tif",
        `--output=/work/${output}`,
      ],
      input: { "source.tif": sourceBytes },
    });
    const bytes = requireOutput("raster_summary_stats", result, output);
    const text = new TextDecoder().decode(bytes);
    let summary;
    try {
      summary = JSON.parse(text);
    } catch {
      summary = { report: text };
    }
    return {
      payload: {
        kind: "summary",
        summary,
        sourceSize: sourceBytes.byteLength,
        stdout: result.stdout,
      },
      transfer: [],
    };
  }

  const output = `${workflow}.tif`;
  let toolId = workflow;
  let args = [
    "--input=/work/source.tif",
    `--output=/work/${output}`,
  ];

  if (workflow === "slope") {
    args.push(`--units=${options.units || "degrees"}`);
    args.push(`--z_factor=${Number(options.zFactor) || 1}`);
  } else if (workflow === "hillshade") {
    args.push(`--azimuth=${Number(options.azimuth) || 315}`);
    args.push(`--altitude=${Number(options.altitude) || 45}`);
    args.push(`--z_factor=${Number(options.zFactor) || 1}`);
  } else if (workflow === "focal") {
    toolId = "focal_statistics";
    args = [
      "--input=/work/source.tif",
      `--output=/work/${output}`,
      `--statistics=${options.statistics || "mean"}`,
      "--neighborhood=rectangle",
      `--width=${Number(options.window) || 3}`,
      `--height=${Number(options.window) || 3}`,
      "--ignore_nodata=true",
    ];
  } else {
    throw new Error(`Unsupported raster workflow: ${workflow}`);
  }

  const result = await runTool(toolId, {
    args,
    input: { "source.tif": sourceBytes },
  });
  const bytes = requireOutput(toolId, result, output);
  return outputPayload(bytes, `${baseName}.tif`, "image/tiff");
}

async function runVectorWorkflow({ source, workflow, options = {} }) {
  const sourceFile = "source.geojson";
  const sourceInput = { [sourceFile]: source.sourceUrl };
  const inputArg = `--input=/work/${sourceFile}`;
  const baseName = `${source.fileName}_${workflow}`;

  if (workflow === "geoparquet") {
    const output = "result.parquet";
    const result = await runTool("write_geoparquet", {
      args: [
        inputArg,
        `--output=/work/${output}`,
        `--compression=${options.compression || "zstd"}`,
        "--hilbert_sort=true",
      ],
      input: sourceInput,
    });
    const bytes = requireOutput("write_geoparquet", result, output);
    return outputPayload(
      bytes,
      `${baseName}.parquet`,
      "application/vnd.apache.parquet"
    );
  }

  if (workflow === "classify") {
    if (!options.field) {
      throw new Error("Choose a numeric field to classify");
    }
    const output = "classified.geojson";
    const result = await runTool("reclassify_field", {
      args: [
        inputArg,
        `--output=/work/${output}`,
        `--field=${options.field}`,
        `--method=${options.method || "natural_breaks"}`,
        `--classes=${Number(options.classes) || 5}`,
        "--class_field=kyl_class",
        "--break_field=kyl_class_max",
      ],
      input: sourceInput,
    });
    const bytes = requireOutput("reclassify_field", result, output);
    return outputPayload(
      bytes,
      `${baseName}.geojson`,
      "application/geo+json"
    );
  }

  if (workflow === "dissolve") {
    const output = "dissolved.geojson";
    const args = [inputArg, `--output=/work/${output}`];
    if (options.field) {
      args.push(`--dissolve_field=${options.field}`);
    }
    const result = await runTool("dissolve", {
      args,
      input: sourceInput,
    });
    const bytes = requireOutput("dissolve", result, output);
    return outputPayload(
      bytes,
      `${baseName}.geojson`,
      "application/geo+json"
    );
  }

  throw new Error(`Unsupported vector workflow: ${workflow}`);
}

workerScope.onmessage = async ({ data }) => {
  const { id, action, payload } = data;

  try {
    let result;
    if (action === "initialize") {
      result = { payload: await initialize(), transfer: [] };
    } else if (action === "runRasterWorkflow") {
      result = await runRasterWorkflow(payload);
    } else if (action === "runVectorWorkflow") {
      result = await runVectorWorkflow(payload);
    } else {
      throw new Error(`Unknown GeoLibre Rust worker action: ${action}`);
    }

    workerScope.postMessage(
      { id, ok: true, payload: result.payload },
      result.transfer || []
    );
  } catch (error) {
    workerScope.postMessage({
      id,
      ok: false,
      error: {
        message: error?.message || String(error),
        stack: error?.stack,
      },
    });
  }
};
