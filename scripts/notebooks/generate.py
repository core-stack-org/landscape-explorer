"""Build six compact, editable walkthroughs using the public APIs and STAC."""
import hashlib
import json
from pathlib import Path
from pprint import pformat
import sys
import textwrap

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/geolibre-notebooks'
CHECK = '--check' in sys.argv
CATALOG = []
SCOPE = {'state': 'Bihar', 'district': 'Nalanda', 'tehsil': 'Hilsa'}
GROUPS = json.loads((ROOT / 'scripts/notebooks/village-groups.json').read_text())


def write(path, content):
    if CHECK:
        if not path.exists() or path.read_text() != content:
            raise SystemExit(f'Out of date: {path}')
    else:
        path.write_text(content)


def cell(kind, source, hidden=False):
    source = textwrap.dedent(source).strip() + '\n'
    result = {'cell_type': kind, 'id': hashlib.sha256((kind + source).encode()).hexdigest()[:12],
              'metadata': {}, 'source': source.splitlines(True)}
    if kind == 'code':
        result.update(execution_count=None, outputs=[])
    if hidden:
        result['metadata'] = {'tags': ['corestack-hidden'], 'jupyter': {'source_hidden': True}}
    return result


def md(source): return cell('markdown', source)
def code(source, hidden=False): return cell('code', source, hidden)


def section(cells, title, text, source):
    cells.extend([md(f'## {title}\n\n{text}'), code(source)])


def begin(number, slug, title, summary):
    entry = {'id': slug, 'filename': f'{number:02d}_{slug.replace("-", "_")}.ipynb',
             'title': f'{number}. {title}', 'summary': summary, 'featured': True}
    CATALOG.append(entry)
    cells = [md(f'# {title}\n\n{summary}\n\nRun the cells in order. Change the place, identifier or columns to explore other records. Downloads from GeoLibre use your selected tehsil; these templates start with Hilsa, Nalanda, Bihar.'),
        md('## Set up Python\n\nRun the collapsed setup cells. They import the libraries and define `read_json`, a small response reader. It reads JSON text, treats non-standard `NaN` and `Infinity` numbers as missing, and also accepts JSON returned inside a string. HTTP errors and malformed responses remain visible. Expand the cells to read the code.'),
        code('''
            import sys
            if sys.platform == "emscripten":
                import micropip
                await micropip.install(["geopandas", "matplotlib", "requests", "pyodide-http"])
                import pyodide_http
                pyodide_http.patch_all()

            import os
            import re
            import ast
            import json
            from getpass import getpass
            from inspect import isawaitable
            from urllib.parse import urljoin
            import requests
            import pandas as pd
            import geopandas as gpd
            import matplotlib.pyplot as plt
            from IPython.display import display, Markdown, FileLink
            plt.rcParams.update({"axes.spines.top": False, "axes.spines.right": False})
            ''', True),
        code(f'''SCOPE = json.loads({json.dumps(json.dumps(SCOPE))})
API_URL = 'https://geoserver.core-stack.org/api/v1/'
STAC_URL = 'https://spatio-temporal-asset-catalog.s3.ap-south-1.amazonaws.com/CorestackCatalogs_merged_collection/tehsil_wise/catalog.json'
YEARS = list(range(2017, 2025))''', True)]
    reader = code((ROOT / 'scripts/notebooks/response.py').read_text(), True)
    reader['metadata']['tags'].append('corestack-io')
    cells.append(reader)
    section(cells, 'Choose the place and set your API key',
        'Edit `SCOPE` in the setup cell to change the place. The [public API guide](https://docs.core-stack.org/use-precomputed-data/public-apis/) explains registration and API keys. This cell reuses `CORE_STACK_API_KEY` or asks for it privately, then stores it in this kernel’s environment. The key is sent only to the API, in the `X-API-Key` header. Restart the kernel and run from the top after changing places.', '''
        place = {key: re.sub(r"[\\s_]+", "_", SCOPE[key].replace("(", "").replace(")", "")).strip("_").lower()
                 for key in ["state", "district", "tehsil"]}
        state, district, tehsil = place["state"], place["district"], place["tehsil"]
        api_key = os.environ.get("CORE_STACK_API_KEY", "").strip()
        if not api_key:
            api_key = getpass("CoRE Stack API key: ")
            if isawaitable(api_key):
                api_key = await api_key
        os.environ["CORE_STACK_API_KEY"] = str(api_key).strip()
        api_headers = {"X-API-Key": os.environ["CORE_STACK_API_KEY"]}
        display(place)
        ''')
    return entry, cells


def finish(entry, cells):
    for i, c in enumerate(cells):
        c['id'] = f'{i:03d}-' + c['id']
    nb = {'nbformat': 4, 'nbformat_minor': 5,
          'metadata': {'kernelspec': {'display_name': 'Python 3 (ipykernel)', 'language': 'python', 'name': 'python3'},
                       'language_info': {'name': 'python', 'version': '3.10'},
                       'corestack': {'id': entry['id'], 'purpose': 'Learn about CoRE Stack data'}}, 'cells': cells}
    write(OUT / entry['filename'], json.dumps(nb, ensure_ascii=False, indent=2) + '\n')


def stac(cells, suffix, all_items=False):
    section(cells, 'Discover data and descriptions in STAC',
        'STAC lists published datasets, field descriptions, downloads and styles. Change `dataset` to another item from the collection. Asset links are used as published, wherever the files are hosted. STAC describes asset fields; API tables may use different names and units, which are shown explicitly in the examples below.', f'''
        collection_url = urljoin(STAC_URL, f"{{state}}/{{district}}/{{tehsil}}/collection.json")
        response = requests.get(collection_url, timeout=90)
        collection = read_json(response)
        items = pd.DataFrame([{{"Item": link["href"].split("/")[-1].removesuffix(".json"),
                               "URL": urljoin(collection_url, link["href"])}}
                              for link in collection["links"] if link["rel"] == "item"], columns=["Item", "URL"])
        {"display(items)" if all_items else "# Follow a relevant item link from the collection."}
        dataset = "{suffix}"
        matches = items.loc[items["Item"].str.endswith("_" + dataset)]
        item = None
        if not matches.empty:
            item_url = matches.iloc[0]["URL"]
            response = requests.get(item_url, timeout=90)
            item = read_json(response)
            display(Markdown(item["properties"].get("description", "No description published.")))
            field_notes = pd.DataFrame(item["properties"].get("table:columns", []))
            display(field_notes.reindex(columns=["name", "type", "description"]).head(12))
            print("Published field count:", len(field_notes), "— use field_notes to see them all.")
            display(pd.DataFrame(item["assets"]).T.reindex(columns=["title", "type", "href"]))
        else:
            print("This dataset is not listed in the tehsil's STAC collection. Available items:")
            display(items)
        ''')


def load_tables(cells, names, primary='mws', village=False):
    selection = '''
        villages = tables["social_economic_indicator"]
        villages = villages.loc[villages["village_id"].notna() & (villages["village_id"] != 0)]  # Exclude unassigned IDs.
        display(villages[["village_name", "village_id"]])
        village_id = str(villages.iloc[0]["village_id"])  # Choose another ID from the list.
        village = villages.loc[villages["village_id"].astype(str) == village_id].iloc[0]
        display(village.to_frame("Recorded value"))
    ''' if village else f'''
        mws_table = tables[{primary!r}]
        display(mws_table[["uid"]])
        mws_id = str(mws_table.iloc[0]["uid"])  # Choose another ID from the list.
        selected = mws_table.loc[mws_table["uid"].astype(str) == mws_id].iloc[0]
        display(selected.iloc[:10].to_frame("First 10 fields"))
    '''
    section(cells, 'Read the tehsil and choose a village' if village else 'Read the tehsil and choose a micro-watershed',
        'One request returns the tehsil’s tables. The cell keeps the tables used here, lists identifiers and shows the first record’s first ten fields. Change the selected identifier, then rerun the following cells. Blank fields mean the source did not supply a value.',
        f'''response = requests.get(API_URL + "get_tehsil_data/", params=place, headers=api_headers, timeout=180)
api_data = read_json(response)
required_tables = {names!r}
tables = {{name: pd.DataFrame(api_data.get(name, [])) for name in required_tables}}
display(pd.DataFrame({{"Table": required_tables, "Rows": [len(tables[name]) for name in required_tables]}}))
''' + textwrap.dedent(selection).strip())


def mws_row(table, variable):
    return f'{variable} = tables["{table}"].set_index("uid").reindex([mws_id]).iloc[0]'


entry, cells = begin(1, 'start', 'Start', 'Discover CoRE Stack datasets, make your first API request and save data to explore in a map or spreadsheet.')
section(cells, 'See the available APIs',
    'Read the specifications at [api-doc.core-stack.org](https://api-doc.core-stack.org). This public OpenAPI document lists the GET APIs and their required parameters without an API key.', '''
    response = requests.get("https://geoserver.core-stack.org/?format=openapi", timeout=90)
    specification = read_json(response)
    operations = {path: details["get"] for path, details in specification["paths"].items()
                  if "get" in details and path.startswith("/get_")}
    display(pd.DataFrame([{"API": path, "Purpose": operation.get("summary", ""),
                           "Required parameters": ", ".join(p["name"] for p in operation.get("parameters", []) if p.get("required"))}
                          for path, operation in operations.items()]))
    ''')
section(cells, 'Choose an API and inspect its schema',
    'Change `api_path` to one of the paths above. Parameter names, descriptions and response definitions come from the public specification. A `$ref` points to a named definition, included below.', '''
    api_path = "/get_active_locations/"
    operation = operations[api_path]
    display(pd.DataFrame(operation.get("parameters", [])).reindex(columns=["name", "required", "type", "description"]))
    display(operation.get("responses", {}))
    response_schema = operation.get("responses", {}).get("200", {}).get("schema", {})
    references = re.findall(r'#/definitions/([^" ]+)', json.dumps(response_schema))
    display({name: specification.get("definitions", {}).get(name) for name in references})
    ''')
section(cells, 'Make the request',
    'Use `{}` for active locations or `place` for a tehsil API. Add `mws_id`, `uid`, or coordinates when the selected API requires them. The response stays in `api_result` for further exploration.', '''
    parameters = {}  # For get_tehsil_data, use: parameters = place
    response = requests.get(API_URL + api_path.lstrip("/"), params=parameters, headers=api_headers, timeout=180)
    api_result = read_json(response)
    display(pd.json_normalize(api_result).head() if isinstance(api_result, list) else api_result)
    ''')
stac(cells, 'terrain_vector', all_items=True)
section(cells, 'Read and save micro-watershed data',
    'The geometry API supplies boundaries; `get_tehsil_data` supplies attributes. Join them on `uid`, inspect the first record and save GeoJSON and CSV. Open the GeoJSON in QGIS or GeoLibre to explore its fields.', '''
    response = requests.get(API_URL + "get_mws_geometries/", params=place, headers=api_headers, timeout=180)
    mws = gpd.GeoDataFrame.from_features(read_json(response)["features"], crs="EPSG:4326")
    response = requests.get(API_URL + "get_tehsil_data/", params=place, headers=api_headers, timeout=180)
    api_data = read_json(response)
    attributes = pd.DataFrame(api_data["mws"])
    mws["uid"], attributes["uid"] = mws["uid"].astype(str), attributes["uid"].astype(str)
    mws = mws.merge(attributes, on="uid", how="left", validate="one_to_one")
    display(mws.drop(columns="geometry").iloc[0].to_frame("First MWS"))
    mws.to_file("micro_watersheds.geojson", driver="GeoJSON")
    mws.drop(columns="geometry").to_csv("micro_watersheds.csv", index=False)
    display(FileLink("micro_watersheds.geojson"), FileLink("micro_watersheds.csv"))
    ''')
section(cells, 'Choose another table',
    'The same response includes water, agriculture and village tables. Change `table_name` below; there is no need to download the tehsil again.', '''
    display(pd.DataFrame({"Table": api_data.keys(), "Rows": [len(rows) for rows in api_data.values()]}))
    table_name = "terrain"
    table = pd.DataFrame(api_data[table_name])
    display(table.iloc[0].to_frame("First record"))
    ''')
finish(entry, cells)

entry, cells = begin(2, 'know-your-micro-watershed', 'Know Your Micro-Watershed', 'Read a micro-watershed’s area, elevation, terrain, drainage and upstream and downstream connections.')
load_tables(cells, ['mws', 'dem', 'terrain', 'mws_connectivity', 'drainage_density', 'stream_order', 'river', 'canal', 'mws_intersect_villages', 'mws_intersect_swb'])
stac(cells, 'terrain_vector')
section(cells, 'Area, basin and elevation', 'Areas are hectares and elevations are metres. Basin codes describe the source’s basin hierarchy.', '''
    display(selected.reindex(["area_in_ha", "watershed_code", "basin_code", "sub_basin_code"]).to_frame("Value"))
    elevation = tables["dem"].set_index("uid").reindex([mws_id])
    display(elevation.reindex(columns=["min_elevation_in_m", "mean_elevation_in_m", "max_elevation_in_m"]))
    ''')
section(cells, 'How much is plain, slope, ridge or valley?',
    'These API fields give each terrain class as a percentage of MWS area. The doughnut shows a complete set of shares totalling about 100%. Otherwise, a bar chart shows the available values without rescaling them.', mws_row('terrain', 'terrain') + '''
terrain_fields = {"plain_area_percent": "Plains", "slopy_area_percent": "Broad slopes",
                  "hill_slope_area_percent": "Hill slopes", "ridge_area_percent": "Ridges", "valley_area_percent": "Valleys"}
terrain_shares = pd.to_numeric(terrain.reindex(terrain_fields), errors="coerce").rename(index=terrain_fields)
display(terrain_shares.to_frame("MWS area (%)"))
print("Reported total (%):", terrain_shares.sum(min_count=1))
if terrain_shares.notna().all() and (terrain_shares >= 0).all() and abs(terrain_shares.sum() - 100) < 0.5:
    terrain_shares.dropna().plot.pie(figsize=(6, 5), autopct="%1.1f%%", ylabel="", startangle=90,
                                   wedgeprops={"width": 0.45}, title=f"Terrain · {mws_id}")
    plt.show()
else:
    terrain_shares.dropna().plot.barh(figsize=(7, 3), xlabel="Reported MWS area (%)", title="Available terrain shares")
    plt.tight_layout()
    plt.show()
''')
section(cells, 'Where does the water flow?',
    'Select the published upstream and downstream identifiers, then highlight them on the boundary map. A missing connectivity record does not mean that no connections exist.', '''
    connections = tables["mws_connectivity"]
    connection = connections.loc[connections["uid"].astype(str) == mws_id]
    upstream_ids, downstream_ids = [], []
    if not connection.empty:
        record = connection.iloc[0]
        upstream_ids = ast.literal_eval(record["upstream_mws"]) if pd.notna(record["upstream_mws"]) else []
        downstream_ids = [record["downstream_mws"]] if pd.notna(record["downstream_mws"]) and record["downstream_mws"] else []
        display(pd.Series({"Upstream MWS": upstream_ids, "Downstream MWS": downstream_ids}).to_frame("Identifiers"))
    else:
        print("No connectivity record was returned for this MWS.")
    response = requests.get(API_URL + "get_mws_geometries/", params=place, headers=api_headers, timeout=180)
    boundaries = gpd.GeoDataFrame.from_features(read_json(response)["features"], crs="EPSG:4326")
    boundaries["uid"] = boundaries["uid"].astype(str)
    related = boundaries.loc[boundaries["uid"].isin(upstream_ids + downstream_ids + [mws_id])].copy()
    related["Connection"] = "Selected MWS"
    related.loc[related["uid"].isin(upstream_ids), "Connection"] = "Upstream"
    related.loc[related["uid"].isin(downstream_ids), "Connection"] = "Downstream"
    if not related.empty:
        related.plot(column="Connection", categorical=True, legend=True, edgecolor="white", figsize=(7, 6))
        plt.title(f"Water connections · {mws_id}")
        plt.axis("off")
        plt.show()
    print("Connected IDs outside these returned boundaries:", sorted(set(upstream_ids + downstream_ids) - set(boundaries["uid"])))
    ''')
section(cells, 'Drainage and stream orders',
    'Compare the recorded drainage-density measures and stream-order shares. Stream-order fields are labelled as area percentages in the API; they are not percentages of stream length.', mws_row('drainage_density', 'drainage') + '\n' + mws_row('stream_order', 'streams') + '''
display(drainage.reindex(["drainage_density_weighted_in_km_per_km2", "drainage_density_std_in_km_per_km2", "stream_order_length_in_km"]).to_frame("Value"))
orders = [f"order_{n}_area_percent" for n in range(1, 12)]
shares = pd.to_numeric(streams.reindex(orders), errors="coerce")
shares.index = range(1, 12)
shares.dropna().plot.bar(figsize=(8, 3), color="#287d8e", xlabel="Stream order", ylabel="Area (%)", title=f"Stream orders · {mws_id}")
plt.tight_layout()
plt.show()
''')
section(cells, 'Inspect rivers, canals and linked records',
    'Change `table_name` to `canal`, `mws_intersect_villages` or `mws_intersect_swb`. These tables retain their published field names; the village intersection table uses `mws uid`.', '''
    table_name = "river"
    table = tables[table_name]
    id_column = "mws uid" if table_name == "mws_intersect_villages" else "uid"
    display(table.loc[table[id_column].astype(str) == mws_id].T)
    ''')
section(cells, 'Get a compact indicator record', 'The KYL indicator API offers another view of this MWS. Its own field names remain visible.', '''
    response = requests.get(API_URL + "get_mws_kyl_indicators/", params={**place, "mws_id": mws_id}, headers=api_headers, timeout=180)
    indicators = pd.json_normalize(read_json(response))
    display(indicators.T)
    ''')
section(cells, 'Look up the MWS from a point', 'Use a point inside the selected boundary, or replace the coordinates with your own latitude and longitude.', '''
    selected_boundary = boundaries.loc[boundaries["uid"] == mws_id]
    if not selected_boundary.empty:
        point = selected_boundary.geometry.iloc[0].representative_point()
        coordinates = {"latitude": point.y, "longitude": point.x}
        response = requests.get(API_URL + "get_mwsid_by_latlon/", params=coordinates, headers=api_headers, timeout=90)
        display(read_json(response) if response.ok else {"HTTP status": response.status_code, "Response": response.text[:500]})
    ''')
section(cells, 'Open an available MWS report', 'This API returns a report link when one is available. A missing report does not prevent the data examples above from running.', '''
    response = requests.get(API_URL + "get_mws_report/", params={**place, "mws_id": mws_id}, headers=api_headers, timeout=90)
    display(read_json(response) if response.ok else {"HTTP status": response.status_code, "Response": response.text[:500]})
    ''')
finish(entry, cells)

entry, cells = begin(3, 'water-through-time', 'See Water through the Years and Seasons', 'Compare annual and seasonal water values, fortnightly vegetation and water, and groundwater context.')
load_tables(cells, ['hydrological_annual', 'hydrological_seasonal', 'soge_vector', 'aquifer_vector'], primary='hydrological_annual')
stac(cells, 'water_balance_fortnightly_vector')
section(cells, 'Annual and seasonal water together',
    'Each column shows one water measure. Annual values sit above Kharif, Rabi and Zaid, with the same scale within each column. All water values are millimetres; years run July–June. Missing years remain gaps. These are separately published annual and seasonal summaries; this cell does not calculate one from the other.', '''
    annual = selected
    seasonal = tables["hydrological_seasonal"].set_index("uid").reindex([mws_id]).iloc[0]
    measures = {"precipitation": "Rainfall", "et": "Evapotranspiration", "runoff": "Runoff"}
    periods = ["Annual", "Kharif", "Rabi", "Zaid"]
    water = pd.DataFrame([{ "Year": year, "Period": period, "Measure": label,
                           "Water (mm)": (annual if period == "Annual" else seasonal).get(
                               f"{field}{'' if period == 'Annual' else '_' + period.lower()}_in_mm_{year}-{year + 1}")}
                          for year in YEARS for period in periods for field, label in measures.items()])
    water["Water (mm)"] = pd.to_numeric(water["Water (mm)"], errors="coerce")
    display(water.pivot(index="Year", columns=["Period", "Measure"], values="Water (mm)"))
    fig, axes = plt.subplots(4, 3, figsize=(12, 9), sharex=True, sharey="col")
    for row, period in enumerate(periods):
        for col, label in enumerate(measures.values()):
            values = water.loc[(water["Period"] == period) & (water["Measure"] == label)]
            axes[row, col].plot(values["Year"], values["Water (mm)"], marker="o", color=["#247ba0", "#df9c32", "#528a64"][col])
            axes[row, col].set_title(f"{period} · {label}")
            axes[row, col].set_ylim(bottom=0)
            axes[row, col].grid(alpha=0.2)
        axes[row, 0].set_ylabel("mm")
    for ax in axes[-1]:
        ax.set_xticks(YEARS, [f"{y}–{str(y+1)[-2:]}" for y in YEARS], rotation=45)
    fig.suptitle(f"Water through the years · {mws_id}")
    plt.tight_layout()
    plt.show()
    ''')
section(cells, 'Fortnightly water and vegetation',
    'The MWS API returns water and NDVI with their actual dates. NDVI is unitless, so it has its own axis. Change the date slice to look closely at a season.', '''
    response = requests.get(API_URL + "get_mws_data/", params={**place, "mws_id": mws_id}, headers=api_headers, timeout=180)
    series = pd.DataFrame(read_json(response)["time_series"])
    series["date"] = pd.to_datetime(series["date"])
    series = series.set_index("date").sort_index()
    columns = ["precipitation", "et", "runoff", "ndvi_crop", "ndvi_tree", "ndvi_shrub"]
    series = series.reindex(columns=columns).apply(pd.to_numeric, errors="coerce")
    view = series.loc["2017-07-01":"2025-06-30"]
    display(view.head())
    fig, axes = plt.subplots(2, 1, figsize=(12, 6), sharex=True)
    view[["precipitation", "et", "runoff"]].rename(columns={"precipitation": "Rainfall", "et": "ET", "runoff": "Runoff"}).plot(ax=axes[0], ylabel="Water (mm)")
    view[["ndvi_crop", "ndvi_tree", "ndvi_shrub"]].rename(columns={"ndvi_crop": "Crops", "ndvi_tree": "Trees", "ndvi_shrub": "Shrubs"}).plot(ax=axes[1], ylabel="NDVI (unitless)")
    axes[1].set_ylim(-1, 1)
    axes[0].set_title(f"Fortnightly water and vegetation · {mws_id}")
    plt.tight_layout()
    plt.show()
    ''')
section(cells, 'Groundwater and aquifers',
    'Well depth and change in groundwater storage use separate units. The extraction class and aquifer composition provide context; they are not annual measurements.', mws_row('soge_vector', 'extraction') + '\n' + mws_row('aquifer_vector', 'aquifer') + '''
display(extraction.reindex(["soge_dev_percent", "class_name"]).to_frame("Groundwater extraction"))
display(aquifer.to_frame("Aquifer record"))
groundwater = pd.DataFrame({"Well depth (m)": [annual.get(f"welldepth_in_m_{y}-{y+1}") for y in YEARS],
                            "Change in storage (mm)": [annual.get(f"deltag_in_mm_{y}-{y+1}") for y in YEARS]}, index=YEARS).apply(pd.to_numeric, errors="coerce")
fig, axes = plt.subplots(1, 2, figsize=(10, 3))
for ax, column in zip(axes, groundwater):
    groundwater[column].plot(ax=ax, marker="o", title=column, ylabel=column)
    ax.axhline(0, color="gray", linewidth=0.6)
plt.tight_layout()
plt.show()
''')
finish(entry, cells)

entry, cells = begin(4, 'surface-waterbodies', 'Analyse Water Storage: Surface Waterbodies', 'Inspect individual waterbodies, seasonal water extent and the tehsil’s total mapped water area.')
stac(cells, 'surface_water_bodies_vector')
section(cells, 'Read the STAC asset and choose a waterbody',
    'Use the GeoJSON download published by this STAC item. The same cell lists identifiers and selects the first waterbody. Change `waterbody_id` to explore another one.', '''
    waterbodies = gpd.GeoDataFrame()
    waterbody = pd.Series(dtype=object)
    if item is not None:
        asset_url = urljoin(item_url, item["assets"]["data"]["href"])
        response = requests.get(asset_url, timeout=180)
        waterbodies = gpd.GeoDataFrame.from_features(read_json(response)["features"], crs="EPSG:4326")
        display(waterbodies[["UID"]])
        waterbody_id = str(waterbodies.iloc[0]["UID"])
        waterbody = waterbodies.loc[waterbodies["UID"].astype(str) == waterbody_id].iloc[0]
        display(waterbody.drop(labels="geometry").iloc[:12].to_frame("First 12 fields"))
    ''')
section(cells, 'Water area across years and seasons',
    'Annual `area_YY-YY` values are hectares. Seasonal `k_`, `kr_` and `krz_` values are percentages of the `area_ored` reference footprint, also in hectares. Multiply that footprint by the seasonal percentage divided by 100. Missing years remain blank.', '''
    if not waterbody.empty:
        area = pd.DataFrame({"Annual": [waterbody.get(f"area_{y%100:02d}-{(y+1)%100:02d}") for y in YEARS]}, index=YEARS)
        footprint_ha = pd.to_numeric(waterbody.get("area_ored"), errors="coerce")
        for prefix, season in [("k", "Kharif"), ("kr", "Rabi"), ("krz", "Zaid")]:
            shares = pd.to_numeric(pd.Series([waterbody.get(f"{prefix}_{y%100:02d}-{(y+1)%100:02d}") for y in YEARS], index=YEARS), errors="coerce")
            area[season] = footprint_ha * shares / 100
        area = area.apply(pd.to_numeric, errors="coerce")
        display(area.rename_axis("Starting year").round(3))
        area.plot(figsize=(10, 4), marker="o", ylabel="Water area (ha)", title=f"Water extent · {waterbody_id}")
        plt.tight_layout()
        plt.show()
    ''')
section(cells, 'Total mapped water area through time',
    'Sum annual areas across the waterbody features in this STAC asset. This is water extent, not storage volume. The record count helps identify years with incomplete reporting; missing areas are not filled with zero.', '''
    if not waterbodies.empty:
        year_fields = [f"area_{y%100:02d}-{(y+1)%100:02d}" for y in YEARS]
        annual_areas = waterbodies.reindex(columns=year_fields).apply(pd.to_numeric, errors="coerce")
        annual_areas.columns = YEARS
        totals = pd.DataFrame({"Water area (ha)": annual_areas.sum(min_count=1), "Records with area": annual_areas.count()})
        display(totals)
        totals["Water area (ha)"].plot(figsize=(9, 3), marker="o", ylabel="Water area (ha)", title=f"Total mapped water area · {tehsil}")
        plt.tight_layout()
        plt.show()
    ''')
section(cells, 'Explore the waterbody API',
    'The API has its own waterbody inventory. Select an identifier returned by `get_waterbodies_data_by_admin` before calling `get_waterbody_data`; do not assume it matches the STAC asset’s identifiers. The response lists whichever property groups are available.', '''
    response = requests.get(API_URL + "get_waterbodies_data_by_admin/", params=place, headers=api_headers, timeout=180)
    inventory = read_json(response)
    display(pd.DataFrame({"API waterbody ID": list(inventory)}))
    api_waterbody = {}
    if inventory:
        api_waterbody_id = next(iter(inventory))
        response = requests.get(API_URL + "get_waterbody_data/", params={**place, "uid": api_waterbody_id}, headers=api_headers, timeout=180)
        api_waterbody = read_json(response)[api_waterbody_id]
        display(pd.DataFrame({"Property group": list(api_waterbody), "Fields": [list(value) if isinstance(value, dict) else value for value in api_waterbody.values()]}))
    ''')
section(cells, 'Inspect a property group',
    'Change `property_group` to another name above. Zone-of-influence NDVI describes vegetation around the waterbody, not water area. Its yearly fields contain date/value JSON that can be read as a time series.', '''
    property_group = "zoi_properties"
    properties = api_waterbody.get(property_group, {})
    display(pd.Series(properties, dtype=object).head(12).to_frame("First 12 fields"))
    ndvi = {}
    for year in YEARS:
        values = properties.get(f"NDVI_{year}")
        if values:
            ndvi.update(json.loads(values, parse_constant=lambda value: None) if isinstance(values, str) else values)
    if ndvi:
        vegetation = pd.to_numeric(pd.Series(ndvi), errors="coerce")
        vegetation.index = pd.to_datetime(vegetation.index)
        vegetation.sort_index().plot(figsize=(10, 3), ylabel="NDVI (unitless)", ylim=(-1, 1), title=f"Zone-of-influence vegetation · {api_waterbody_id}")
        plt.tight_layout()
        plt.show()
    ''')
finish(entry, cells)

entry, cells = begin(5, 'agriculture-through-time', 'Analyse Agriculture through Time', 'Compare cropping patterns, their shares of recorded cropped area, and broader land cover through the years.')
load_tables(cells, ['croppingIntensity_annual', 'lulc_vector'], primary='croppingIntensity_annual')
stac(cells, 'cropping_intensity_vector')
section(cells, 'Cropping area and composition',
    'API area fields are already hectares. The four categories describe land cropped once, twice or three times; do not multiply area by the crop count. Shares use the sum of these categories, not total MWS area. These categories do not establish fallow area.', '''
    crop_fields = {"single_kharif_cropped_area_in_ha": "Single Kharif", "single_non_kharif_cropped_area_in_ha": "Single non-Kharif",
                   "doubly_cropped_area_in_ha": "Double cropped", "triply_cropped_area_in_ha": "Triple cropped"}
    cropping = pd.DataFrame({label: [selected.get(f"{field}_{y}-{y+1}") for y in YEARS] for field, label in crop_fields.items()}, index=YEARS).apply(pd.to_numeric, errors="coerce")
    display(cropping.rename_axis("Starting year"))
    # Only complete years enter stacked charts; missing categories are not zero.
    complete = cropping.dropna()
    shares = complete.div(complete.sum(axis=1).replace(0, float("nan")), axis=0) * 100
    fig, axes = plt.subplots(2, 1, figsize=(10, 7))
    if not complete.empty:
        complete.plot.bar(stacked=True, ax=axes[0], ylabel="Area (ha)", rot=0, title=f"Cropping patterns · {mws_id}")
        shares.plot.bar(stacked=True, ax=axes[1], ylabel="Recorded cropped area (%)", rot=0, legend=False)
        axes[1].set_ylim(0, 100)
    plt.tight_layout()
    plt.show()
    print("Years omitted from stacked charts:", cropping.index[cropping.isna().any(axis=1)].tolist())
    fallow_fields = [name for name in selected.index if "fallow" in name or "uncropped" in name]
    display(selected.reindex(fallow_fields).to_frame("Recorded fallow / uncropped values"))
    ''')
section(cells, 'Broader land cover',
    'Compare the main land-cover area fields for the same years. LULC columns use the starting year alone. Water-season categories are excluded here because they overlap in time.', mws_row('lulc_vector', 'land') + '''
land_fields = {"cropland": "Cropland", "tree_forest": "Trees / forest", "shrub_scrub": "Shrub / scrub", "barrenlands": "Barren land", "built-up": "Built-up"}
land_cover = pd.DataFrame({label: [land.get(f"{field}_area_in_ha_{y}") for y in YEARS] for field, label in land_fields.items()}, index=YEARS).apply(pd.to_numeric, errors="coerce")
display(land_cover)
land_cover.plot(subplots=True, layout=(2, 3), figsize=(12, 6), marker="o", legend=False, ylabel="Area (ha)", sharey=False)
plt.suptitle(f"Land-cover area · {mws_id}")
plt.tight_layout()
plt.show()
''')
section(cells, 'Cropping intensity', 'Cropping intensity is a unitless value reported by the API. Compare its variation with the area charts above.', '''
    intensity = pd.Series([selected.get(f"cropping_intensity_unit_less_{y}-{y+1}") for y in YEARS], index=YEARS, dtype=float)
    intensity.plot(figsize=(8, 3), marker="o", ylabel="Cropping intensity (unitless)", title=f"Cropping intensity · {mws_id}")
    plt.tight_layout()
    plt.show()
    ''')
finish(entry, cells)

entry, cells = begin(6, 'know-your-village', 'Know Your Village', 'Explore population, distances to services, livestock and village survey answers, and find linked micro-watersheds.')
load_tables(cells, ['social_economic_indicator', 'facilities_proximity', 'livestock', 'antyodaya', 'mws_intersect_villages'], village=True)
stac(cells, 'admin_boundaries_vector')
section(cells, 'Population and literacy', 'Population, Scheduled Caste and Scheduled Tribe values are counts. Literacy is a percentage. Keep the different units visible.', '''
    population_fields = {"total_population_count": "Population", "total_sc_population_count": "Scheduled Caste population", "total_st_population_count": "Scheduled Tribe population", "literacy_rate_percent": "Literacy (%)"}
    display(village.reindex(population_fields).rename(index=population_fields).to_frame("Recorded value"))
    ''')
section(cells, 'How far away are services?',
    'Compare the reported distances in kilometres. These fields give distances, not compass directions. Each point labels a service category; missing distances stay blank in the table and are omitted from the plot.', '''
    facilities = tables["facilities_proximity"]
    facility = facilities.loc[facilities["village_id"].astype(str) == village_id]
    categories = {"essential_education": "Essential education", "higher_education": "Higher education", "essential_health": "Essential health", "advanced_health": "Advanced health", "essential_services": "Essential services", "financial_inclusion": "Financial services", "apmc_markets": "Agricultural markets", "post_harvest": "Post-harvest services", "cooperative": "Cooperatives", "livestock": "Livestock services", "agri_support_infra": "Agricultural support"}
    facility = facility.iloc[0] if not facility.empty else pd.Series(dtype=object)
    distances = pd.DataFrame({"Service": list(categories.values()),
                              "Distance (km)": [facility.get(f"{name}_cat_distance_in_km") for name in categories],
                              "Facility": [facility.get(f"{name}_facility_label") for name in categories]}).set_index("Service")
    distances["Distance (km)"] = pd.to_numeric(distances["Distance (km)"], errors="coerce")
    display(distances)
    available = distances["Distance (km)"].dropna().sort_values()
    if not available.empty:
        fig, ax = plt.subplots(figsize=(9, 5))
        ax.hlines(available.index, 0, available, color="#b3d9d3", linewidth=3)
        ax.scatter(available, available.index, color="#227b71", s=50)
        for label, value in available.items():
            ax.annotate(f"{value:g} km", (value, label), xytext=(5, 0), textcoords="offset points", va="center")
        ax.set(xlabel="Distance (km)", title=f"Access to services · {village['village_name']}")
        ax.set_xlim(left=0, right=available.max() * 1.2 if available.max() > 0 else 1)
        plt.tight_layout()
        plt.show()
    else:
        print("No service distances were returned for this village.")
    ''')
section(cells, 'Livestock counts', 'Show animal types separately. The all-livestock total is a reference value, not another category to add to the chart.', '''
    livestock = tables["livestock"]
    records = livestock.loc[livestock["village_id"].astype(str) == village_id]
    if not records.empty:
        animals = records.iloc[0]
        fields = {"cattle_total": "Cattle", "buffalo_total": "Buffalo", "sheep_total": "Sheep", "goat_total": "Goats", "pig_total": "Pigs"}
        counts = pd.to_numeric(animals.reindex(fields), errors="coerce").rename(index=fields)
        display(animals.reindex(["all_livestock_total", *fields]).to_frame("Count"))
        counts.dropna().plot.barh(figsize=(7, 3), xlabel="Animals", color="#a47b48", title="Livestock by type")
        plt.tight_layout()
        plt.show()
    else:
        print("No livestock record was returned for this village.")
    ''')
cells.extend([md('## Explore a village survey topic\n\nThe collapsed reference lists the original Mission Antyodaya fields under the village report’s headings. Change `group` in the next cell to read a different topic. The category value is shown beside its source answers; values from different topics are not assumed to share a scale.'), code('survey_groups = ' + pformat(GROUPS, width=110, sort_dicts=False), True)])
section(cells, 'Choose a survey topic',
    'Try `agriculture_land_cultivation`, `agriculture_support_services`, `agricultural_markets`, `water_sanitation` or another group listed below. The same cell shows the category value and the original questions and answers.', '''
    display(pd.DataFrame({"Available group": list(survey_groups)}))
    group = "agriculture_land_cultivation"
    survey = tables["antyodaya"]
    matches = survey.loc[survey["village_id"].astype(str) == village_id]
    if not matches.empty:
        answers = matches.iloc[0]
        print("Category value:", answers.get(group + "_cat_value"))
        questions = pd.DataFrame(survey_groups[group])
        questions["Answer"] = [answers.get(field) for field in questions["col"]]
        display(questions[["label", "col", "Answer"]].rename(columns={"label": "Question", "col": "API field"}))
        # Choose one unit for the plot; other answers remain in the table.
        plot_unit = "(ha)"  # Change this to a unit in the displayed question labels.
        numeric = questions.loc[(questions["repr"] == "numeric") & questions["label"].str.contains(plot_unit, regex=False)].set_index("label")["Answer"]
        numeric = pd.to_numeric(numeric, errors="coerce").dropna()
        if not numeric.empty:
            numeric.plot.barh(figsize=(9, 4), xlabel=f"Recorded value {plot_unit}", title=group.replace("_", " ").title())
            plt.tight_layout()
            plt.show()
    else:
        print("No Mission Antyodaya record was returned for this village.")
    ''')
section(cells, 'Agricultural land and access to services',
    'Join the survey and service tables on `village_id`. Change the selected columns to combine other fields from the examples above. Source matches remain separate rows.', '''
    agriculture_columns = ["village_id", "agriculture_land_cultivation_cat_value", "agricultural_markets_cat_value", "net_sown_area_in_hac"]
    service_columns = ["village_id", "apmc_markets_cat_distance_in_km", "agri_support_infra_cat_distance_in_km"]
    agriculture = survey.loc[survey["village_id"].astype(str) == village_id].reindex(columns=agriculture_columns).copy()
    access = tables["facilities_proximity"].reindex(columns=service_columns).copy()
    agriculture["village_id"], access["village_id"] = agriculture["village_id"].astype(str), access["village_id"].astype(str)
    display(agriculture.merge(access, on="village_id", how="left"))
    ''')
section(cells, 'Find the village boundary and linked MWS',
    'The geometry API calls the village identifier `vill_ID`. Use it to select the boundary. The tehsil’s intersection table supplies the linked MWS identifiers; it does not allocate population or livestock between them.', '''
    response = requests.get(API_URL + "get_village_geometries/", params=place, headers=api_headers, timeout=180)
    boundaries = gpd.GeoDataFrame.from_features(read_json(response)["features"], crs="EPSG:4326")
    boundary = boundaries.loc[boundaries["vill_ID"].astype(str) == village_id]
    if not boundary.empty:
        boundary.plot(figsize=(5, 5), color="#d7e9f5", edgecolor="#376987")
        plt.title(str(village["village_name"]))
        plt.axis("off")
        plt.show()
    links = tables["mws_intersect_villages"].copy()
    links["village ids"] = links["village ids"].map(ast.literal_eval)
    linked = links.explode("village ids")
    display(linked.loc[linked["village ids"].astype(str) == village_id, ["mws uid", "area_in_ha"]])
    ''')
section(cells, 'Look up administrative names from coordinates', 'Use a point inside the village, or supply your own latitude and longitude.', '''
    if not boundary.empty:
        point = boundary.geometry.iloc[0].representative_point()
        response = requests.get(API_URL + "get_admin_details_by_latlon/", params={"latitude": point.y, "longitude": point.x}, headers=api_headers, timeout=90)
        display(read_json(response) if response.ok else {"HTTP status": response.status_code, "Response": response.text[:500]})
    ''')
finish(entry, cells)
write(OUT / 'catalog.json', json.dumps(CATALOG, ensure_ascii=False, indent=2) + '\n')
write(ROOT / 'src/components/geolibre/notebookCatalogue.json', json.dumps(CATALOG, ensure_ascii=False, indent=2) + '\n')
print('Checked six notebooks.' if CHECK else 'Generated six notebooks.')
