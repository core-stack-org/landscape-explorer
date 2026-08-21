#!/usr/bin/env python3
"""Validate and summarize asserted KYL/GeoLibre memory-profile JSON runs."""

from __future__ import annotations

import argparse
import json
import math
import statistics
from collections import defaultdict
from datetime import datetime
from html import escape
from pathlib import Path


MIB = 1024 * 1024
STAGES = [
    ("Home", "01-home-stabilized:stable-3"),
    ("Default project", "04-full-default-project:stable-3"),
    ("Raster on · 1", "05-raster-cycle-1:on"),
    ("Raster off · 1", "05-raster-cycle-1:off"),
    ("Raster on · 2", "05-raster-cycle-2:on"),
    ("Raster off · 2", "05-raster-cycle-2:off"),
    ("Raster on · 3", "05-raster-cycle-3:on"),
    ("Raster off · 3", "05-raster-cycle-3:off"),
    ("Mixed layers", "06-multiple:CLART:on"),
    ("Notebook panel", "07-notebook:panel-open:stable-2"),
    ("Python executed", "07-notebook:python-executed:stable-3"),
    ("Notebook closed", "07-notebook:closed:stable-2"),
    ("Warm reload", "08-warm-reload:stable-3"),
    ("Cold reload", "08-cold-reload:stable-3"),
    ("GeoLibre closed", "09-close-geolibre:stable-3"),
    ("Reopen 1", "10-reopen-close:1:open"),
    ("Close 1", "10-reopen-close:1:closed-home:stable-2"),
    ("Reopen 2", "10-reopen-close:2:open"),
    ("Close 2", "10-reopen-close:2:closed-home:stable-2"),
    ("Final home", "final-home"),
]
COMPOSITION_STAGES = [
    ("Home", "01-home-stabilized:stable-3"),
    ("Default", "04-full-default-project:stable-3"),
    ("Mixed", "06-multiple:CLART:on"),
    ("Python", "07-notebook:python-executed:stable-3"),
    ("Closed", "09-close-geolibre:stable-3"),
]
COLORS = {
    "browser": "#5B5BD6",
    "renderer": "#22A699",
    "gpu": "#F59E0B",
    "network-service": "#EC4899",
    "storage-service": "#8B5CF6",
    "zygote": "#94A3B8",
    "utility": "#64748B",
    "other": "#CBD5E1",
}


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def median(values):
    values = [value for value in values if value is not None]
    return statistics.median(values) if values else None


def range_stats(values):
    values = [value for value in values if value is not None]
    return {
        "median": median(values),
        "min": min(values) if values else None,
        "max": max(values) if values else None,
        "values": values,
    }


def sample_map(run):
    return {sample["label"]: sample for sample in run["samples"]}


def frame(sample, role):
    return next((item for item in sample.get("frames", []) if item and item.get("role") == role), None)


def run_duration_ms(run):
    return (parse_time(run["generatedAt"]) - parse_time(run["run"]["startedAt"])).total_seconds() * 1000


def scenario_duration_ms(run, scenario):
    samples = run["samples"]
    return (
        parse_time(samples[scenario["afterSampleIndex"]]["timestamp"])
        - parse_time(samples[scenario["beforeSampleIndex"]]["timestamp"])
    ).total_seconds() * 1000


def validate(runs):
    failures = []
    for index, run in enumerate(runs, 1):
        prefix = f"run {index}"
        if run.get("schemaVersion") != 2:
            failures.append(f"{prefix}: schema is not 2")
        if run.get("run", {}).get("engine") != "chromium":
            failures.append(f"{prefix}: engine is not Chromium")
        failed_scenarios = [s["id"] for s in run.get("scenarios", []) if s.get("status") != "passed"]
        failed_assertions = [a["name"] for a in run.get("assertions", []) if not a.get("passed")]
        if failed_scenarios:
            failures.append(f"{prefix}: failed scenarios {failed_scenarios}")
        if failed_assertions:
            failures.append(f"{prefix}: failed assertions {failed_assertions}")
        labels = sample_map(run)
        missing = [label for _, label in STAGES if label not in labels]
        if missing:
            failures.append(f"{prefix}: missing samples {missing}")
    hashes = {json.dumps(run["run"].get("buildHashes"), sort_keys=True) for run in runs}
    if len(hashes) != 1:
        failures.append("runs do not share one build hash")
    if failures:
        raise SystemExit("Validation failed:\n- " + "\n- ".join(failures))


def stage_summary(runs):
    result = []
    for display, label in STAGES:
        samples = [sample_map(run)[label] for run in runs]
        pss = [sample["processMemory"].get("totalPssBytes") for sample in samples]
        rss = [sample["processMemory"].get("totalRssBytes") for sample in samples]
        private = [sample["processMemory"].get("totalPrivateBytes") for sample in samples]
        disk = [sample["processMemory"].get("profileDiskBytes") for sample in samples]
        workers = [len(sample.get("workers", [])) for sample in samples]
        result.append({
            "name": display,
            "label": label,
            "pssMiB": range_stats([v / MIB for v in pss]),
            "rssMiB": range_stats([v / MIB for v in rss]),
            "privateMiB": range_stats([v / MIB for v in private]),
            "profileDiskMiB": range_stats([v / MIB for v in disk]),
            "workers": range_stats(workers),
        })
    return result


def composition_summary(runs):
    roles = list(COLORS)
    result = []
    for display, label in COMPOSITION_STAGES:
        samples = [sample_map(run)[label] for run in runs]
        role_values = {}
        for role in roles:
            role_values[role] = median([
                sample["processMemory"].get("byRole", {}).get(role, {}).get("pssBytes", 0) / MIB
                for sample in samples
            ])
        result.append({"name": display, "rolesMiB": role_values})
    return result


def network_summary(runs):
    per_run = []
    negative_counts = []
    for run in runs:
        categories = defaultdict(int)
        negative = 0
        for record in run["networkRecords"]:
            size = record.get("responseBodyBytes") or 0
            if size < 0:
                negative += 1
                size = record.get("contentLengthBytes") or 0
            categories[record.get("category", "other")] += size
        per_run.append(categories)
        negative_counts.append(negative)
    categories = sorted(set().union(*(entry.keys() for entry in per_run)))
    return {
        "categoriesMiB": {
            category: range_stats([entry.get(category, 0) / MIB for entry in per_run])
            for category in categories
        },
        "negativeSizeRecords": negative_counts,
    }


def notebook_summary(runs):
    panel_label = "07-notebook:panel-open:stable-2"
    python_label = "07-notebook:python-executed:stable-3"
    closed_label = "07-notebook:closed:stable-2"
    records = []
    for run in runs:
        labels = sample_map(run)
        panel, python, closed = labels[panel_label], labels[python_label], labels[closed_label]
        before = labels["07-notebook-real-python:before"]
        panel_origin = (frame(panel, "geolibre") or {}).get("storageEstimate") or {}
        python_origin = (frame(python, "geolibre") or {}).get("storageEstimate") or {}
        panel_details = panel_origin.get("usageDetails") or {}
        python_details = python_origin.get("usageDetails") or {}
        py_requests = [r for r in run["networkRecords"] if r.get("category") == "jupyter-pyodide"]
        wasm = [r for r in py_requests if ".wasm" in r.get("url", "").lower()]
        records.append({
            "pssBeforeMiB": before["processMemory"]["totalPssBytes"] / MIB,
            "pssPanelMiB": panel["processMemory"]["totalPssBytes"] / MIB,
            "pssPythonMiB": python["processMemory"]["totalPssBytes"] / MIB,
            "pssClosedMiB": closed["processMemory"]["totalPssBytes"] / MIB,
            "diskBeforeMiB": before["processMemory"]["profileDiskBytes"] / MIB,
            "diskPanelMiB": panel["processMemory"]["profileDiskBytes"] / MIB,
            "diskPythonMiB": python["processMemory"]["profileDiskBytes"] / MIB,
            "diskClosedMiB": closed["processMemory"]["profileDiskBytes"] / MIB,
            "originUsagePanelMiB": (panel_origin.get("usage") or 0) / MIB,
            "originUsagePythonMiB": (python_origin.get("usage") or 0) / MIB,
            "originUsageDeltaKiB": ((python_origin.get("usage") or 0) - (panel_origin.get("usage") or 0)) / 1024,
            "originCachePanelMiB": (panel_details.get("caches") or 0) / MIB,
            "originIndexedDbPanelMiB": (panel_details.get("indexedDB") or 0) / MIB,
            "workersBefore": before.get("workers", []),
            "workersPanel": panel.get("workers", []),
            "workersPython": python.get("workers", []),
            "workersClosed": closed.get("workers", []),
            "pythonKernelStatus": (frame(python, "jupyter") or {}).get("jupyterKernelStatus"),
            "jupyterResponseMiB": sum(max(0, r.get("responseBodyBytes") or 0) for r in py_requests) / MIB,
            "jupyterAccountedMiB": sum(
                (r.get("responseBodyBytes") or 0)
                if (r.get("responseBodyBytes") or 0) >= 0
                else (r.get("contentLengthBytes") or 0)
                for r in py_requests
            ) / MIB,
            "wasmResponseMiB": sum(
                (r.get("responseBodyBytes") or 0)
                if (r.get("responseBodyBytes") or 0) >= 0
                else (r.get("contentLengthBytes") or 0)
                for r in wasm
            ) / MIB,
            "wasmUrls": sorted({r["url"] for r in wasm}),
        })
    numeric = {}
    for key in records[0]:
        if isinstance(records[0][key], (int, float)):
            numeric[key] = range_stats([record[key] for record in records])
    return {"runs": records, "aggregate": numeric}


def scenario_summary(runs):
    ids = [scenario["id"] for scenario in runs[0]["scenarios"]]
    return {
        scenario_id: range_stats([
            scenario_duration_ms(run, next(s for s in run["scenarios"] if s["id"] == scenario_id)) / 1000
            for run in runs
        ])
        for scenario_id in ids
    }


def residual_summary(runs):
    records = []
    for run in runs:
        labels = sample_map(run)
        baseline = labels["01-home-stabilized:stable-3"]
        closed = labels["09-close-geolibre:stable-3"]
        final = labels["final-home"]
        records.append({
            "baselinePssMiB": baseline["processMemory"]["totalPssBytes"] / MIB,
            "closedPssMiB": closed["processMemory"]["totalPssBytes"] / MIB,
            "finalPssMiB": final["processMemory"]["totalPssBytes"] / MIB,
            "finalMinusBaselineMiB": (final["processMemory"]["totalPssBytes"] - baseline["processMemory"]["totalPssBytes"]) / MIB,
            "baselineRendererCount": baseline["processMemory"]["byRole"]["renderer"]["count"],
            "finalRendererCount": final["processMemory"]["byRole"]["renderer"]["count"],
            "baselineRendererPssMiB": baseline["processMemory"]["byRole"]["renderer"]["pssBytes"] / MIB,
            "finalRendererPssMiB": final["processMemory"]["byRole"]["renderer"]["pssBytes"] / MIB,
        })
    return {
        "runs": records,
        "aggregate": {key: range_stats([record[key] for record in records]) for key in records[0]},
    }


def svg_start(width, height, title, subtitle):
    return [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">',
        f'<title id="title">{escape(title)}</title>',
        f'<desc id="desc">{escape(subtitle)}</desc>',
        '<rect width="100%" height="100%" fill="#FFFFFF"/>',
        f'<text x="40" y="38" font-family="sans-serif" font-size="22" font-weight="700" fill="#111827">{escape(title)}</text>',
        f'<text x="40" y="61" font-family="sans-serif" font-size="12" fill="#475569">{escape(subtitle)}</text>',
    ]


def write_timeline(stages, output):
    width, height = 1280, 620
    left, right, top, bottom = 75, 35, 85, 135
    plot_w, plot_h = width - left - right, height - top - bottom
    max_y = math.ceil(max(stage["pssMiB"]["max"] for stage in stages) / 100) * 100
    svg = svg_start(width, height, "Chromium process-tree memory by tested state", "Median proportional set size (PSS); whiskers show the three-run range.")
    for tick in range(0, max_y + 1, 100):
        y = top + plot_h - (tick / max_y) * plot_h
        svg += [f'<line x1="{left}" y1="{y:.1f}" x2="{width-right}" y2="{y:.1f}" stroke="#E2E8F0"/>', f'<text x="{left-10}" y="{y+4:.1f}" text-anchor="end" font-family="sans-serif" font-size="11" fill="#64748B">{tick}</text>']
    points = []
    for index, stage in enumerate(stages):
        x = left + index * plot_w / (len(stages) - 1)
        med, low, high = (stage["pssMiB"][key] for key in ("median", "min", "max"))
        y = top + plot_h - med / max_y * plot_h
        y1 = top + plot_h - low / max_y * plot_h
        y2 = top + plot_h - high / max_y * plot_h
        svg += [f'<line x1="{x:.1f}" y1="{y1:.1f}" x2="{x:.1f}" y2="{y2:.1f}" stroke="#94A3B8" stroke-width="2"/>', f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#5B5BD6"/>']
        points.append(f"{x:.1f},{y:.1f}")
        label = escape(stage["name"])
        svg.append(f'<text transform="translate({x+3:.1f},{top+plot_h+16}) rotate(55)" font-family="sans-serif" font-size="10" fill="#334155">{label}</text>')
    svg.insert(-len(stages) * 1, f'<polyline points="{" ".join(points)}" fill="none" stroke="#5B5BD6" stroke-width="3"/>')
    svg += [f'<text transform="translate(18,{top+plot_h/2}) rotate(-90)" font-family="sans-serif" font-size="12" fill="#334155">PSS (MiB)</text>', '</svg>']
    output.write_text("\n".join(svg), encoding="utf-8")


def write_composition(composition, output):
    width, height = 1000, 560
    left, right, top, bottom = 80, 240, 90, 75
    plot_w, plot_h = width-left-right, height-top-bottom
    totals = [sum(stage["rolesMiB"].values()) for stage in composition]
    max_y = math.ceil(max(totals) / 100) * 100
    svg = svg_start(width, height, "Where Chromium memory resides", "Median PSS by Linux browser-process role. Headless GPU is SwiftShader software WebGL RAM, not physical VRAM.")
    bar_w = plot_w / len(composition) * 0.62
    roles = [role for role in COLORS if any(stage["rolesMiB"].get(role, 0) for stage in composition)]
    for index, stage in enumerate(composition):
        x = left + (index + .5) * plot_w / len(composition) - bar_w/2
        y = top + plot_h
        for role in roles:
            value = stage["rolesMiB"].get(role, 0)
            h = value/max_y*plot_h
            y -= h
            svg.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w:.1f}" height="{h:.1f}" fill="{COLORS[role]}"/>')
        svg += [f'<text x="{x+bar_w/2:.1f}" y="{top+plot_h+20}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#334155">{escape(stage["name"])}</text>', f'<text x="{x+bar_w/2:.1f}" y="{y-7:.1f}" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="#111827">{sum(stage["rolesMiB"].values()):.0f}</text>']
    for index, role in enumerate(roles):
        y = top + index*24
        svg += [f'<rect x="{width-right+35}" y="{y-11}" width="14" height="14" fill="{COLORS[role]}"/>', f'<text x="{width-right+57}" y="{y}" font-family="sans-serif" font-size="12" fill="#334155">{escape(role)}</text>']
    svg += [f'<text transform="translate(22,{top+plot_h/2}) rotate(-90)" font-family="sans-serif" font-size="12" fill="#334155">PSS (MiB)</text>', '</svg>']
    output.write_text("\n".join(svg), encoding="utf-8")


def write_network(network, output):
    items = sorted(network["categoriesMiB"].items(), key=lambda item: item[1]["median"], reverse=True)
    width, height = 1000, 120 + len(items)*38
    left, right, top = 210, 110, 82
    plot_w = width-left-right
    max_x = max(value["max"] for _, value in items) or 1
    svg = svg_start(width, height, "Response bytes by resource category", "Median response-body bytes; Content-Length is the fallback for cached responses where Playwright reports a negative size sentinel.")
    for index, (category, stats) in enumerate(items):
        y = top + index*38
        bar = stats["median"]/max_x*plot_w
        low = left + stats["min"]/max_x*plot_w
        high = left + stats["max"]/max_x*plot_w
        svg += [f'<text x="{left-12}" y="{y+15}" text-anchor="end" font-family="sans-serif" font-size="12" fill="#334155">{escape(category)}</text>', f'<rect x="{left}" y="{y}" width="{bar:.1f}" height="20" rx="3" fill="#22A699"/>', f'<line x1="{low:.1f}" y1="{y+10}" x2="{high:.1f}" y2="{y+10}" stroke="#0F766E" stroke-width="2"/>', f'<text x="{left+bar+8:.1f}" y="{y+15}" font-family="sans-serif" font-size="11" fill="#0F172A">{stats["median"]:.1f} MiB</text>']
    svg.append('</svg>')
    output.write_text("\n".join(svg), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    runs = [json.loads(path.read_text(encoding="utf-8")) for path in args.inputs]
    validate(runs)
    args.output.mkdir(parents=True, exist_ok=True)
    stages = stage_summary(runs)
    composition = composition_summary(runs)
    network = network_summary(runs)
    summary = {
        "schemaVersion": 1,
        "generatedAt": datetime.now().astimezone().isoformat(),
        "inputFiles": [str(path.resolve()) for path in args.inputs],
        "validation": {
            "runCount": len(runs),
            "allScenariosPassed": True,
            "allAssertionsPassed": True,
            "scenarioEntriesPerRun": [len(run["scenarios"]) for run in runs],
            "assertionsPerRun": [len(run["assertions"]) for run in runs],
        },
        "provenance": [{
            "branch": run["run"]["branch"],
            "commit": run["run"]["commit"],
            "gitStatusAtStart": run["run"]["gitStatusAtStart"],
            "buildHashes": run["run"]["buildHashes"],
            "browserVersion": run["run"]["browserVersion"],
            "executablePath": run["run"]["executablePath"],
            "durationSeconds": run_duration_ms(run)/1000,
        } for run in runs],
        "stages": stages,
        "processComposition": composition,
        "network": network,
        "notebook": notebook_summary(runs),
        "residual": residual_summary(runs),
        "scenariosSeconds": scenario_summary(runs),
        "webgl": [{
            "vendor": (frame(sample_map(run)["04-full-default-project:stable-3"], "geolibre") or {}).get("webgl", {}).get("vendor"),
            "renderer": (frame(sample_map(run)["04-full-default-project:stable-3"], "geolibre") or {}).get("webgl", {}).get("renderer"),
        } for run in runs],
        "pageErrors": [run.get("errors", []) for run in runs],
    }
    (args.output / "analysis-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    write_timeline(stages, args.output / "memory-timeline.svg")
    write_composition(composition, args.output / "process-composition.svg")
    write_network(network, args.output / "network-categories.svg")
    print(json.dumps({
        "output": str(args.output.resolve()),
        "runs": len(runs),
        "allScenariosPassed": True,
        "allAssertionsPassed": True,
    }, indent=2))


if __name__ == "__main__":
    main()
