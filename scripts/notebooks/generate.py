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
DEFAULT_PLACE = {'state': 'Bihar', 'district': 'Nalanda', 'tehsil': 'Hilsa'}
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
            pd.set_option("display.max_colwidth", 160)
            plt.rcParams.update({"axes.spines.top": False, "axes.spines.right": False})
            ''', True),
        code('''API_URL = 'https://geoserver.core-stack.org/api/v1/'
STAC_URL = 'https://spatio-temporal-asset-catalog.s3.ap-south-1.amazonaws.com/CorestackCatalogs_merged_collection/tehsil_wise/catalog.json'
YEARS = list(range(2017, 2025))''', True)]
    reader = code((ROOT / 'scripts/notebooks/response.py').read_text(), True)
    reader['metadata']['tags'].append('corestack-io')
    cells.append(reader)
    cells.extend([md('## Choose the location\n\nThese three fields contain the selected tehsil when downloaded from GeoLibre. Edit them to explore another location, then restart the kernel and run from the top.'),
                  code('\n'.join(f'{name} = {json.dumps(value)}' for name, value in DEFAULT_PLACE.items()))])
    cells[-1]['metadata']['tags'] = ['corestack-location']
    section(cells, 'Set your API key',
        'The [public API guide](https://docs.core-stack.org/use-precomputed-data/public-apis/) explains registration and keys. This cell reuses `CORE_STACK_API_KEY` or asks privately and stores it in this kernel’s environment. The request header is `X-API-Key`.', '''
        place = {key: re.sub(r"[\\s_]+", "_", value.replace("(", "").replace(")", "")).strip("_").lower()
                 for key, value in {"state": state, "district": district, "tehsil": tehsil}.items()}
        api_key = os.environ.get("CORE_STACK_API_KEY", "").strip()
        if not api_key:
            api_key = getpass("CoRE Stack API key: ")
            if isawaitable(api_key):
                api_key = await api_key
        os.environ["CORE_STACK_API_KEY"] = str(api_key).strip()
        api_headers = {"X-API-Key": os.environ["CORE_STACK_API_KEY"]}
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
        collection_url = urljoin(STAC_URL, "{{state}}/{{district}}/{{tehsil}}/collection.json".format(**place))
        response = requests.get(collection_url, timeout=90)
        collection = read_json(response)
        items = pd.DataFrame([{{"Item": link["href"].split("/")[-1].removesuffix(".json"),
                               "URL": urljoin(collection_url, link["href"])}}
                              for link in collection["links"] if link["rel"] == "item"], columns=["Item", "URL"])
        {"display(items)" if all_items else "# Follow a relevant item link from the collection."}
        dataset = "{suffix}"
        matches = items.loc[items["Item"].str.endswith("_" + dataset)]
        item = None
        field_notes = pd.DataFrame(columns=["name", "type", "description"])
        if not matches.empty:
            item_url = matches.iloc[0]["URL"]
            response = requests.get(item_url, timeout=90)
            item = read_json(response)
            display(pd.DataFrame([item["properties"]]).reindex(columns=["title", "description", "start_datetime", "end_datetime"]).T)
            field_notes = pd.DataFrame(item["properties"].get("table:columns", []))
            display(field_notes.reindex(columns=["name", "type", "description"]).head(12))
            print("Published field count:", len(field_notes), "— use field_notes to see them all.")
            display(pd.DataFrame(item["assets"]).T.reindex(columns=["title", "type", "href"]))
        else:
            print("This dataset is not listed in the tehsil's STAC collection. Available items:")
            display(items)
        ''')


def load_tables(cells, table_name, columns, village=False):
    identifier = 'village_id' if village else 'uid'
    variable = 'village_id' if village else 'mws_id'
    section(cells, 'Read one table and choose a record',
        'The tehsil API has no table or column filter. This cell reads it once and selects a few fields. For other tables, use `pd.DataFrame(api_data[table_name])` and select `columns` from that table; the response is already in memory. The field list shows the available names.' + (' For the village example, the starting list uses identifiers that also have a service record when available.' if village else ''),
        f'''response = requests.get(API_URL + "get_tehsil_data/", params=place, headers=api_headers, timeout=180)
api_data = read_json(response)
display(pd.DataFrame({{"table": list(api_data), "rows": [len(rows) for rows in api_data.values()]}}))
table_name = {table_name!r}
table = pd.DataFrame(api_data[table_name])
{"table = table.loc[table['village_id'].notna() & (table['village_id'] != 0)]  # Exclude unassigned IDs." if village else ""}
display(pd.DataFrame({{"field": table.columns}}))
{"service_ids = pd.DataFrame(api_data['facilities_proximity'])['village_id'].astype(str)" if village else ""}
{"examples = table.loc[table['village_id'].astype(str).isin(service_ids)]  # Start with a village that also has a service record." if village else "examples = table"}
{"examples = examples if not examples.empty else table" if village else ""}
display(examples[{['village_name', identifier] if village else [identifier]!r}].head(10))
{variable} = str(examples.iloc[0]["{identifier}"])  # Replace with an identifier from the table.
selected = table.loc[table["{identifier}"].astype(str) == {variable}].iloc[0]
columns = {columns!r}
display(selected.reindex(columns).to_frame("value"))''')


def another(cells, text):
    cells.append(md('### Try another field\n\n' + text))

entry, cells = begin(1, 'start', 'Start', 'Discover available data, inspect API specifications and save your first dataset.')
section(cells, 'Choose an API from the public specification',
    'The [API specifications](https://api-doc.core-stack.org) describe each request. This cell lists all GET APIs and required parameters, then shows the selected API’s parameters and response fields as tables. Change `api_path` to inspect another API.', '''
    response = requests.get("https://geoserver.core-stack.org/?format=openapi", timeout=90)
    specification = read_json(response)
    operations = {path: details["get"] for path, details in specification["paths"].items() if "get" in details and path.startswith("/get_")}
    display(pd.DataFrame([{"path": path, "description": op.get("summary", ""),
                           "required_parameters": ", ".join(p["name"] for p in op.get("parameters", []) if p.get("required"))}
                          for path, op in operations.items()]))
    api_path = "/get_active_locations/"
    operation = operations[api_path]
    display(pd.DataFrame(operation.get("parameters", [])).reindex(columns=["name", "required", "type", "description"]))
    display(pd.json_normalize(operation.get("responses", {})).T)
    references = re.findall(r'#/definitions/([^" ]+)', json.dumps(operation.get("responses", {})))
    for name in dict.fromkeys(references):
        definition = specification.get("definitions", {}).get(name, {})
        display(pd.DataFrame(definition.get("properties", {})).T)
    ''')
section(cells, 'Make the request and inspect its records',
    'Use `{}` for active locations. For a tehsil API, set `parameters = place`. Add the identifier or coordinates required by the selected path. `record_path` selects a table inside a response, after it has been downloaded; it is not a server filter.', '''
    parameters = {}
    response = requests.get(API_URL + api_path.lstrip("/"), params=parameters, headers=api_headers, timeout=180)
    api_result = read_json(response)
    record_path = None  # For get_tehsil_data, try "mws"; for get_mws_data, "time_series".
    records = api_result[record_path] if record_path else api_result
    preview = pd.json_normalize(records)
    display(preview.head())
    ''')
stac(cells, 'terrain_vector', all_items=True)
section(cells, 'Discover available downloads',
    '`get_generated_layer_urls` lists the published dataset downloads. Choose columns from this response to inspect styles or asset locations as well. STAC supplies their dataset and field descriptions.', '''
    response = requests.get(API_URL + "get_generated_layer_urls/", params=place, headers=api_headers, timeout=180)
    downloads = pd.DataFrame(read_json(response))
    columns = ["dataset_name", "layer_type", "layer_url", "style_url"]
    display(downloads.reindex(columns=columns))
    ''')
section(cells, 'Read, inspect and save micro-watershed data',
    'Join the boundary and attribute APIs on `uid`. The first record is shown as a table; the files can be opened in QGIS or GeoLibre. All source field names remain unchanged.', '''
    response = requests.get(API_URL + "get_mws_geometries/", params=place, headers=api_headers, timeout=180)
    mws = gpd.GeoDataFrame.from_features(read_json(response)["features"], crs="EPSG:4326")
    response = requests.get(API_URL + "get_tehsil_data/", params=place, headers=api_headers, timeout=180)
    api_data = read_json(response)
    attributes = pd.DataFrame(api_data["mws"])
    mws["uid"], attributes["uid"] = mws["uid"].astype(str), attributes["uid"].astype(str)
    mws = mws.merge(attributes, on="uid", how="left", validate="one_to_one")
    display(mws.drop(columns="geometry").iloc[0].to_frame("value"))
    mws.to_file("micro_watersheds.geojson", driver="GeoJSON")
    mws.drop(columns="geometry").to_csv("micro_watersheds.csv", index=False)
    display(FileLink("micro_watersheds.geojson"), FileLink("micro_watersheds.csv"))
    ''')
another(cells, 'The tehsil response is already in `api_data`. Use `pd.DataFrame(api_data["terrain"])` or replace `"terrain"` with `"dem"`, `"hydrological_annual"`, `"croppingIntensity_annual"` or `"social_economic_indicator"`. Inspect `.columns`, then select just the columns you want. The next notebooks demonstrate these choices without downloading the same response again within a notebook.')
finish(entry, cells)

entry, cells = begin(2, 'know-your-micro-watershed', 'Know Your Micro-Watershed', 'Read a micro-watershed’s basic details, compare its terrain and see its water connections.')
load_tables(cells, 'mws', ['uid', 'area_in_ha', 'watershed_code', 'basin_code', 'sub_basin_code'])
stac(cells, 'terrain_vector')
section(cells, 'Compare terrain shares',
    'The API gives terrain shares as percentages. The table keeps those field names and adds the corresponding STAC field and published description. A doughnut is used only for complete shares totalling about 100%.', '''
    terrain = pd.DataFrame(api_data["terrain"]).set_index("uid").reindex([mws_id]).iloc[0]
    stac_fields = {"plain_area_percent": "plain_area", "slopy_area_percent": "slopy_area", "hill_slope_area_percent": "hill_slope", "ridge_area_percent": "ridge_area", "valley_area_percent": "valley_are"}
    terrain_values = pd.to_numeric(terrain.reindex(stac_fields), errors="coerce").to_frame("value")
    terrain_values["stac_field"] = pd.Series(stac_fields)
    terrain_values = terrain_values.join(field_notes.set_index("name")[["description", "type"]], on="stac_field")
    display(terrain_values)
    shares = terrain_values["value"]
    if shares.notna().all() and (shares >= 0).all() and abs(shares.sum() - 100) < 0.5:
        shares.plot.pie(figsize=(9, 5), autopct="%1.1f%%", ylabel="", wedgeprops={"width": 0.45})
    else:
        shares.dropna().plot.barh(figsize=(10, 3), xlabel="MWS area (%)")
    plt.title(f"Terrain · {mws_id}")
    plt.tight_layout()
    plt.show()
    ''')
section(cells, 'Inspect another MWS table',
    'Choose `table_name` and `columns`; this uses the response already loaded. Here, elevation is the example. Keep the same `mws_id` to compare records across tables.', '''
    table_name = "dem"
    columns = ["min_elevation_in_m", "mean_elevation_in_m", "max_elevation_in_m"]
    details = pd.DataFrame(api_data[table_name])
    display(pd.DataFrame({"field": details.columns}))
    record = details.loc[details["uid"].astype(str) == mws_id]
    display(record.reindex(columns=columns).T)
    ''')
another(cells, 'For drainage, use `table_name = "drainage_density"` and columns `drainage_density_weighted_in_km_per_km2`, `drainage_density_std_in_km_per_km2`, `stream_order_length_in_km`. For stream orders, use `"stream_order"` and `order_1_area_percent` through `order_11_area_percent`. `river` has `river_name`; `canal` has `canal_name` and `project_name`; `mws_intersect_swb` has `swb_uid`. The village intersection table uses `mws uid` instead of `uid`.')
section(cells, 'See upstream and downstream connections',
    'Read the identifiers from the connectivity table and boundaries from `get_mws_geometries`. The added `connection` column describes the map colours; source fields are retained. A missing record does not mean there are no water connections.', '''
    connections = pd.DataFrame(api_data["mws_connectivity"])
    match = connections.loc[connections["uid"].astype(str) == mws_id]
    upstream, downstream = [], []
    if not match.empty:
        connection = match.iloc[0]
        upstream = ast.literal_eval(connection["upstream_mws"]) if pd.notna(connection["upstream_mws"]) else []
        downstream = [connection["downstream_mws"]] if pd.notna(connection["downstream_mws"]) and connection["downstream_mws"] else []
        display(match[["uid", "upstream_mws", "downstream_mws"]])
    else:
        print("No connectivity record was returned for this MWS.")
    response = requests.get(API_URL + "get_mws_geometries/", params=place, headers=api_headers, timeout=180)
    boundaries = gpd.GeoDataFrame.from_features(read_json(response)["features"], crs="EPSG:4326")
    boundaries["uid"] = boundaries["uid"].astype(str)
    related = boundaries.loc[boundaries["uid"].isin(upstream + downstream + [mws_id])].copy()
    related["connection"] = "selected"
    related.loc[related["uid"].isin(upstream), "connection"] = "upstream"
    related.loc[related["uid"].isin(downstream), "connection"] = "downstream"
    if not related.empty:
        related.plot(column="connection", legend=True, edgecolor="white", figsize=(6, 5))
        plt.axis("off")
        plt.show()
    display(pd.DataFrame({"uid_outside_returned_boundaries": sorted(set(upstream + downstream) - set(boundaries["uid"]))}))
    ''')
section(cells, 'Look up indicators and a report',
    '`get_mws_kyl_indicators` reads one MWS. Change `columns` to any field in `indicators.columns`. `get_mws_report` returns a report link when available.', '''
    response = requests.get(API_URL + "get_mws_kyl_indicators/", params={**place, "mws_id": mws_id}, headers=api_headers, timeout=180)
    indicators = pd.json_normalize(read_json(response))
    display(pd.DataFrame({"field": indicators.columns}))
    columns = list(indicators.columns[:8])
    display(indicators[columns].T)
    response = requests.get(API_URL + "get_mws_report/", params={**place, "mws_id": mws_id}, headers=api_headers, timeout=90)
    report = read_json(response) if response.ok else {"status": response.status_code, "detail": response.text[:500]}
    display(pd.json_normalize(report))
    ''')
section(cells, 'Find the MWS at a coordinate', 'Use a point inside the selected boundary, or edit `latitude` and `longitude` to look up another point.', '''
    selected_boundary = boundaries.loc[boundaries["uid"] == mws_id]
    if not selected_boundary.empty:
        point = selected_boundary.geometry.iloc[0].representative_point()
        coordinates = {"latitude": point.y, "longitude": point.x}
        response = requests.get(API_URL + "get_mwsid_by_latlon/", params=coordinates, headers=api_headers, timeout=90)
        result = read_json(response) if response.ok else {"status": response.status_code, "detail": response.text[:500]}
        display(pd.json_normalize(result))
    ''')
finish(entry, cells)

entry, cells = begin(3, 'water-through-time', 'See Water through the Years and Seasons', 'Explore rainfall across years and seasons, then compare fortnightly water and vegetation.')
load_tables(cells, 'hydrological_annual', ['uid', 'precipitation_in_mm_2017-2018', 'et_in_mm_2017-2018', 'runoff_in_mm_2017-2018'])
stac(cells, 'water_balance_fortnightly_vector')
section(cells, 'Annual and seasonal rainfall',
    'Change `measure` to `et` or `runoff` for the other water measures. The source field names stay in the table. Each chart uses millimetres and the same year positions; the annual and seasonal summaries are published separately.', '''
    measure = "precipitation"
    annual = pd.DataFrame(api_data["hydrological_annual"]).set_index("uid").reindex([mws_id]).iloc[0]
    seasonal = pd.DataFrame(api_data["hydrological_seasonal"]).set_index("uid").reindex([mws_id]).iloc[0]
    fig, axes = plt.subplots(4, 1, figsize=(9, 7), sharex=True, sharey=True)
    values = []
    for ax, period in zip(axes, ["annual", "kharif", "rabi", "zaid"]):
        fields = [f"{measure}{'' if period == 'annual' else '_' + period}_in_mm_{y}-{y+1}" for y in YEARS]
        record = annual if period == "annual" else seasonal
        series = pd.to_numeric(record.reindex(fields), errors="coerce")
        values.append(series)
        ax.plot(YEARS, series, marker="o")
        ax.set(title=f"{measure} · {period}", ylabel="mm", ylim=(0, None))
        ax.grid(alpha=0.2)
    display(pd.concat(values).to_frame("value"))
    axes[-1].set_xticks(YEARS, [f"{y}–{str(y+1)[-2:]}" for y in YEARS], rotation=45)
    plt.tight_layout()
    plt.show()
    ''')
section(cells, 'One MWS time series',
    '`get_mws_data` fetches only the selected MWS. Choose `water_field` and `ndvi_field` to explore other measures; the actual dates returned by the API are used for both.', '''
    response = requests.get(API_URL + "get_mws_data/", params={**place, "mws_id": mws_id}, headers=api_headers, timeout=180)
    series = pd.DataFrame(read_json(response)["time_series"])
    series["date"] = pd.to_datetime(series["date"])
    series = series.set_index("date").sort_index()
    display(pd.DataFrame({"field": series.columns}))
    water_field, ndvi_field = "precipitation", "ndvi_crop"
    view = series.loc["2017-07-01":"2025-06-30", [water_field, ndvi_field]].apply(pd.to_numeric, errors="coerce")
    display(view.head())
    fig, axes = plt.subplots(2, 1, figsize=(10, 5), sharex=True)
    view[water_field].plot(ax=axes[0], title=water_field, ylabel="mm")
    view[ndvi_field].plot(ax=axes[1], title=ndvi_field, ylabel="NDVI (unitless)", ylim=(-1, 1))
    plt.tight_layout()
    plt.show()
    ''')
another(cells, 'Set `water_field` to `et` or `runoff`, and `ndvi_field` to `ndvi_tree` or `ndvi_shrub`. To inspect groundwater using the earlier table example, choose `table_name = "soge_vector"` with `soge_dev_percent` and `class_name`, or `"aquifer_vector"` and inspect its columns. Annual `welldepth_in_m_2017-2018` and `deltag_in_mm_2017-2018` use different units; give them separate axes when plotting.')
finish(entry, cells)

entry, cells = begin(4, 'surface-waterbodies', 'Analyse Water Storage: Surface Waterbodies', 'Read a published waterbody asset, plot its water extent and explore individual API records.')
stac(cells, 'surface_water_bodies_vector')
section(cells, 'Choose a waterbody from the STAC asset',
    'Follow the GeoJSON asset link published in STAC. Choose a `waterbody_id` from its `UID` column. The selected values appear with their original field names and any published descriptions.', '''
    waterbodies = gpd.GeoDataFrame()
    waterbody = pd.Series(dtype=object)
    if item is not None:
        response = requests.get(urljoin(item_url, item["assets"]["data"]["href"]), timeout=180)
        waterbodies = gpd.GeoDataFrame.from_features(read_json(response)["features"], crs="EPSG:4326")
        display(waterbodies[["UID"]].head(10))
        waterbody_id = str(waterbodies.iloc[0]["UID"])
        waterbody = waterbodies.loc[waterbodies["UID"].astype(str) == waterbody_id].iloc[0]
        columns = ["UID", "area_ored", "area_17-18", "k_17-18", "kr_17-18", "krz_17-18"]
        display(waterbody.reindex(columns).to_frame("value").join(field_notes.set_index("name")[["description", "type"]]))
    ''')
section(cells, 'Water extent through time',
    'The annual `area_YY-YY` fields are hectares. The seasonal `k_`, `kr_` and `krz_` fields are percentages of `area_ored`, also in hectares. Keep the raw values and add a calculated hectare column for plotting.', '''
    if not waterbody.empty:
        prefix = "area"  # Try "k", "kr" or "krz" for a seasonal view.
        fields = [f"{prefix}_{y%100:02d}-{(y+1)%100:02d}" for y in YEARS]
        extent = pd.to_numeric(waterbody.reindex(fields), errors="coerce").to_frame("value")
        extent = extent.join(field_notes.set_index("name")[["description", "type"]])
        extent["area_in_ha"] = extent["value"] if prefix == "area" else extent["value"] * waterbody["area_ored"] / 100
        display(extent)
        plt.figure(figsize=(9, 3))
        plt.plot(YEARS, extent["area_in_ha"], marker="o", label=prefix)
        plt.ylabel("Water area (ha)")
        plt.title(f"{prefix} · {waterbody_id}")
        plt.grid(alpha=0.2)
        plt.show()
    ''')
another(cells, 'Change `prefix` to compare the seasonal fields without changing the identifier. To inspect annual totals across the tehsil, use `waterbodies[fields].sum(min_count=1)` with `prefix = "area"`, and `waterbodies[fields].count()` to check how many records supply each year. These are mapped areas, not storage volumes.')
section(cells, 'Read one waterbody from the API',
    'First obtain the API’s own identifiers with `get_waterbodies_data_by_admin`. Use one of those in `get_waterbody_data`; STAC and API identifiers are not assumed to match. Select a property group and display it as a table.', '''
    response = requests.get(API_URL + "get_waterbodies_data_by_admin/", params=place, headers=api_headers, timeout=180)
    inventory = read_json(response)
    display(pd.DataFrame({"uid": list(inventory)}).head(10))
    properties = {}
    if inventory:
        api_waterbody_id = next(iter(inventory))
        response = requests.get(API_URL + "get_waterbody_data/", params={**place, "uid": api_waterbody_id}, headers=api_headers, timeout=180)
        api_waterbody = read_json(response)[api_waterbody_id]
        display(pd.DataFrame({"property_group": list(api_waterbody)}))
        property_group = "zoi_properties"
        properties = api_waterbody.get(property_group, {})
        display(pd.DataFrame({"field": list(properties)}))
        columns = list(properties)[:8]
        display(pd.Series(properties, dtype=object).reindex(columns).to_frame("value"))
    ''')
section(cells, 'Read a dated property',
    'Some property groups store a time series inside a JSON string. This example reads `NDVI_2017` into a DataFrame before plotting it. Change `field` to another dated field from the list above.', '''
    field = "NDVI_2017"
    dated_values = properties.get(field)
    if dated_values:
        dated_values = json.loads(dated_values, parse_constant=lambda value: None) if isinstance(dated_values, str) else dated_values
        dated = pd.Series(dated_values, name=field).to_frame()
        dated.index = pd.to_datetime(dated.index)
        dated[field] = pd.to_numeric(dated[field], errors="coerce")
        display(dated.head())
        dated.sort_index().plot(figsize=(9, 3), ylabel="NDVI (unitless)", ylim=(-1, 1))
        plt.show()
    else:
        print("This property group does not contain the selected dated field. Choose another field from the table above.")
    ''')
finish(entry, cells)

entry, cells = begin(5, 'agriculture-through-time', 'Analyse Agriculture through Time', 'Explore a cropping category over time and compare land-cover areas for one year.')
load_tables(cells, 'croppingIntensity_annual', ['uid', 'area_in_ha', 'single_kharif_cropped_area_in_ha_2017-2018', 'doubly_cropped_area_in_ha_2017-2018'])
stac(cells, 'cropping_intensity_vector')
section(cells, 'One cropping category through time',
    'Change `field_prefix` to explore a different cropping category. Source values are already hectares; no conversion or multiplication by crop count is needed.', '''
    field_prefix = "single_kharif_cropped_area_in_ha"
    fields = [f"{field_prefix}_{y}-{y+1}" for y in YEARS]
    cropping = pd.to_numeric(selected.reindex(fields), errors="coerce").to_frame("value")
    display(cropping)
    plt.figure(figsize=(10, 3))
    plt.plot(YEARS, cropping["value"], marker="o")
    plt.ylabel("Area (ha)")
    plt.title(field_prefix)
    plt.grid(alpha=0.2)
    plt.show()
    ''')
another(cells, 'Other prefixes are `single_non_kharif_cropped_area_in_ha`, `doubly_cropped_area_in_ha` and `triply_cropped_area_in_ha`. For cropping intensity, use `cropping_intensity_unit_less` and change the axis unit. Fallow or uncropped land should only be shown when a field explicitly records it; do not calculate it as an unexplained remainder.')
section(cells, 'Land-cover areas in one year',
    'Read `lulc_vector` from the response already in memory. Change `year` or `columns` to explore another year or class. The table and chart keep the API field names.', '''
    land = pd.DataFrame(api_data["lulc_vector"]).set_index("uid").reindex([mws_id]).iloc[0]
    display(pd.DataFrame({"field": land.index}))
    year = 2017
    columns = [f"{field}_area_in_ha_{year}" for field in ["cropland", "tree_forest", "shrub_scrub", "barrenlands", "built-up"]]
    areas = pd.to_numeric(land.reindex(columns), errors="coerce").to_frame("value")
    display(areas)
    areas["value"].dropna().plot.barh(figsize=(10, 4), xlabel="Area (ha)", title=f"Land-cover areas · {year}")
    plt.tight_layout()
    plt.show()
    ''')
another(cells, 'For a cropping composition table, select the four cropping area fields for one year from `selected`. Add a separate share column using `values / values.sum() * 100` only when all four values are present. This share describes the recorded cropping categories, not the whole MWS. Change `dataset` in the STAC cell to `land_use_land_cover_vector` to read its field descriptions; API names and asset names may differ.')
finish(entry, cells)

entry, cells = begin(6, 'know-your-village', 'Know Your Village', 'Read village statistics, compare distances to services and explore one village survey topic.')
load_tables(cells, 'social_economic_indicator', ['village_id', 'village_name', 'total_population_count', 'total_sc_population_count', 'total_st_population_count', 'literacy_rate_percent'], village=True)
stac(cells, 'admin_boundaries_vector')
section(cells, 'How far away are services?',
    'Select the distance fields to compare. The API provides kilometres, not compass directions. The extra `description` column identifies the facility represented by each distance. Field names are retained on the chart.', '''
    facilities = pd.DataFrame(api_data["facilities_proximity"])
    matches = facilities.loc[facilities["village_id"].astype(str) == village_id]
    facility = matches.iloc[0] if not matches.empty else pd.Series(dtype=object)
    display(pd.DataFrame({"field": facilities.columns}))
    categories = ["essential_education", "essential_health", "apmc_markets", "agri_support_infra"]
    fields = [f"{category}_cat_distance_in_km" for category in categories]
    distances = pd.to_numeric(facility.reindex(fields), errors="coerce").to_frame("value")
    distances["description"] = [facility.get(f"{category}_facility_label") for category in categories]
    display(distances)
    available = distances["value"].dropna().sort_values()
    if not available.empty:
        fig, ax = plt.subplots(figsize=(12, 3))
        ax.hlines(available.index, 0, available, color="#a9d3cb", linewidth=3)
        ax.scatter(available, available.index, color="#227b71", s=50)
        ax.set(xlabel="Distance (km)", xlim=(0, None), title="Village service distances")
        plt.tight_layout()
        plt.show()
    else:
        print("No distances were returned for these fields.")
    ''')
another(cells, 'Try `higher_education`, `advanced_health`, `financial_inclusion`, `post_harvest`, `cooperative` or `livestock` in `categories`. For livestock counts, use `statistics = pd.DataFrame(api_data["livestock"])`, select the same `village_id`, and choose columns `all_livestock_total`, `cattle_total`, `buffalo_total`, `sheep_total`, `goat_total`, `pig_total`. Reuse `api_data` to select the table; no additional request is needed.')
cells.extend([md('## Choose a village survey topic\n\nThe collapsed reference lists the original survey fields and the village report’s descriptions. Choose one group below; the same example works for the other groups.'), code('survey_groups = ' + pformat(GROUPS, width=110, sort_dicts=False), True)])
section(cells, 'Read a category value and its survey answers',
    'The table keeps the API fields and adds descriptions. Plot only answers with the same unit; category values and other survey answers remain in the table.', '''
    display(pd.DataFrame({"group": list(survey_groups)}))
    group = "agriculture_land_cultivation"
    survey = pd.DataFrame(api_data["antyodaya"])
    matches = survey.loc[survey["village_id"].astype(str) == village_id]
    if not matches.empty:
        answers = matches.iloc[0]
        questions = survey_groups[group]
        fields = [group + "_cat_value", *[question["col"] for question in questions]]
        results = answers.reindex(fields).to_frame("value")
        results["description"] = ["Published category value", *[question["label"] for question in questions]]
        display(results)
        plot_unit = "(ha)"
        values = pd.to_numeric(results.loc[results["description"].str.contains(plot_unit, regex=False), "value"], errors="coerce").dropna()
        if not values.empty:
            values.plot.barh(figsize=(11, 4), xlabel=plot_unit, title=group)
            plt.tight_layout()
            plt.show()
    else:
        print("No village survey record was returned for this identifier.")
    ''')
another(cells, 'Change `group` to `agriculture_support_services`, `agricultural_markets`, `water_sanitation` or another group from the table. Change `plot_unit` only to a unit shared by the fields you want to compare. To combine agricultural answers with service distances, select those columns from `survey` and `facilities`, and merge on `village_id`; retain both source field names.')
section(cells, 'Read the village boundary and linked MWS',
    '`get_village_geometries` supplies `vill_ID` and `vill_name`. The intersection table records linked MWS using `mws uid` and `village ids`. Keep these original identifiers when selecting records.', '''
    response = requests.get(API_URL + "get_village_geometries/", params=place, headers=api_headers, timeout=180)
    boundaries = gpd.GeoDataFrame.from_features(read_json(response)["features"], crs="EPSG:4326")
    boundary = boundaries.loc[boundaries["vill_ID"].astype(str) == village_id]
    display(boundary.drop(columns="geometry"))
    links = pd.DataFrame(api_data["mws_intersect_villages"])
    links["village ids"] = links["village ids"].map(ast.literal_eval)
    linked = links.explode("village ids")
    display(linked.loc[linked["village ids"].astype(str) == village_id, ["mws uid", "area_in_ha"]])
    ''')
section(cells, 'Find administrative names at a point',
    '`get_admin_details_by_latlon` returns the administrative names for a latitude and longitude. Use a point inside this village or enter your own coordinates.', '''
    if not boundary.empty:
        point = boundary.geometry.iloc[0].representative_point()
        coordinates = {"latitude": point.y, "longitude": point.x}
        response = requests.get(API_URL + "get_admin_details_by_latlon/", params=coordinates, headers=api_headers, timeout=90)
        result = read_json(response) if response.ok else {"status": response.status_code, "detail": response.text[:500]}
        display(pd.json_normalize(result))
    ''')
finish(entry, cells)
write(OUT / 'catalog.json', json.dumps(CATALOG, ensure_ascii=False, indent=2) + '\n')
write(ROOT / 'src/components/geolibre/notebookCatalogue.json', json.dumps(CATALOG, ensure_ascii=False, indent=2) + '\n')
print('Checked six notebooks.' if CHECK else 'Generated six notebooks.')
