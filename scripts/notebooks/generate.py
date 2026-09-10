"""Build six teaching notebooks. Generated code uses standard libraries directly."""
import ast
import hashlib
import re
import json
from pathlib import Path
import subprocess
import sys
import textwrap
from pprint import pformat

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/geolibre-notebooks'
LAYERS = json.loads(subprocess.check_output(['node', 'scripts/notebooks/manifest.mjs'], cwd=ROOT))
BY_ID = {layer['id']: layer for layer in LAYERS}
GROUPS = json.loads((ROOT / 'scripts/notebooks/village-groups.json').read_text())
CHECK = '--check' in sys.argv
CATALOG = []
SCOPE = {'state': 'Bihar', 'district': 'Nalanda', 'tehsil': 'Hilsa'}

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

def section(cells, heading, explanation, source):
    cells.extend([md(f'## {heading}\n\n{explanation}'), code(source)])

def begin(number, slug, title, summary):
    entry = {'id': slug, 'filename': f'{number:02d}_{slug.replace("-", "_")}.ipynb',
             'title': f'{number}. {title}', 'summary': summary, 'featured': True}
    CATALOG.append(entry)
    cells = [md(f'# {title}\n\n{summary}\n\nRun the cells in order. Each step uses data from the previous cells. You can edit the place, identifier, columns and chart settings as you go.'),
        md('## Set up Python\n\nRun these two collapsed cells once. They load the libraries and starting location. Expand them to see or change the setup.'),
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
            from urllib.parse import urljoin
            import requests
            import pandas as pd
            import geopandas as gpd
            import matplotlib.pyplot as plt
            from IPython.display import display, FileLink
            ''', True),
        code(f'''SCOPE = json.loads({json.dumps(json.dumps(SCOPE))})
GEOSERVER = 'https://geoserver.core-stack.org:8443/geoserver/'
API_URL = 'https://geoserver.core-stack.org/api/v1/'
STAC_URL = 'https://spatio-temporal-asset-catalog.s3.ap-south-1.amazonaws.com/CorestackCatalogs_merged_collection/tehsil_wise/catalog.json'
YEARS = list(range(2017, 2025))''', True)]
    section(cells, 'Choose the tehsil', 'The template defaults to Hilsa, Nalanda, Bihar. GeoLibre downloads use your selected place instead. Edit `SCOPE` in the setup cell to change tehsil, then restart the kernel and run from the top. Layer coverage can differ between places.', '''
        state = re.sub(r"[\\s_]+", "_", SCOPE["state"].replace("(", "").replace(")", "")).strip("_").lower()
        district = re.sub(r"[\\s_]+", "_", SCOPE["district"].replace("(", "").replace(")", "")).strip("_").lower()
        tehsil = re.sub(r"[\\s_]+", "_", SCOPE["tehsil"].replace("(", "").replace(")", "")).strip("_").lower()
        place = {"state": state, "district": district, "tehsil": tehsil}
        place
        ''')
    section(cells, 'Set your API key for this session', 'The [public API guide](https://docs.core-stack.org/use-precomputed-data/public-apis/) explains how to register, generate an API key and use it. The key goes in the `X-API-Key` header. This cell stores `CORE_STACK_API_KEY` in the current Python kernel’s environment, so later API cells can reuse it. An existing key is reused without prompting. You can skip this cell when exploring only GeoServer or STAC data. Restarting the kernel may require entering the key again.', '''
        from inspect import isawaitable

        api_key = os.environ.get("CORE_STACK_API_KEY", "").strip()
        if not api_key:
            api_key = getpass("CoRE Stack API key: ")
            if isawaitable(api_key):
                api_key = await api_key

        os.environ["CORE_STACK_API_KEY"] = str(api_key).strip()
        ''')
    return entry, cells

def api_guard(source):
    # Preserve notebook display of the last expression inside a conditional block.
    lines = source.splitlines()
    tree = ast.parse(source)
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        last = tree.body[-1]
        end = last.end_lineno - 1
        lines[end] = lines[end][:last.end_col_offset] + ')' + lines[end][last.end_col_offset:]
        lines[last.lineno - 1] = 'display(' + lines[last.lineno - 1]
    return 'if api_payload is not None:\n' + textwrap.indent('\n'.join(lines), '    ')

def finish(entry, cells):
    # Keep HTTP, permissive JSON decoding and data exploration separate for learners.
    expanded = []
    in_api_section = False
    for notebook_cell in cells:
        source = ''.join(notebook_cell['source'])
        if notebook_cell['cell_type'] == 'code' and ('requests.get(API_URL' in source or 'requests.get(request_url' in source):
            response_name = 'api_response' if 'api_response = requests.get' in source else 'response'
            token = response_name + '.json()'
            if token in source:
                lines = source.splitlines()
                split = next(i for i, line in enumerate(lines) if token in line)
                expanded.append(code('\n'.join(lines[:split]).replace(response_name + '.raise_for_status()', '# The next cell checks the HTTP status and reads the response.')))
                in_api_section = True
                expanded.append(code(f'''raw_api_data_string = {response_name}.text
api_payload = None
if {response_name}.ok:
    try:
        api_payload = json.loads(raw_api_data_string.lstrip("\\ufeff"))
    except ValueError:
        print("The API returned a response that is not valid JSON. Preview:", raw_api_data_string[:500])
else:
    print(f"API returned HTTP {{{response_name}.status_code}} for {{{response_name}.url}}")
    print("This request did not return data. Other API examples can still be run.")
    print(raw_api_data_string[:500])''', True))
                expanded.append(code(api_guard('\n'.join(lines[split:]).replace(token, 'api_payload'))))
                continue
        if in_api_section and notebook_cell["cell_type"] == "code":
            notebook_cell = code(api_guard(source))
        expanded.append(notebook_cell)
    cells = expanded
    for index, notebook_cell in enumerate(cells):
        notebook_cell["id"] = f"{index:03d}-" + notebook_cell["id"]
    nb = {'nbformat': 4, 'nbformat_minor': 5,
          'metadata': {'kernelspec': {'display_name': 'Python 3 (ipykernel)', 'language': 'python', 'name': 'python3'},
                       'language_info': {'name': 'python', 'version': '3.10'},
                       'corestack': {'id': entry['id'], 'purpose': 'Learn about CoRE Stack data'}}, 'cells': cells}
    write(OUT / entry['filename'], json.dumps(nb, ensure_ascii=False, indent=2) + '\n')

def sources(cells, specs, note=''):
    # Resolve the shared catalogue at build time, leaving ordinary editable URLs in each notebook.
    lines = ['layer_urls = {']
    for variable, layer_id in specs:
        layer = BY_ID[layer_id]
        workspace, name = layer['workspace'], layer['layerNameTemplate']
        lines.append(f'    "{variable}": f"{{GEOSERVER}}{workspace}/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames={workspace}:{name}&outputFormat=application/json&srsName=EPSG:4326",')
    lines += ['}', 'pd.DataFrame(layer_urls.items(), columns=["Layer", "GeoJSON URL"])']
    section(cells, 'The layers we will use', 'Each link reads a vector layer as GeoJSON. GeoJSON contains a feature list; each feature has a shape and its data fields. ' + note, '\n'.join(lines))

METADATA = {
    'terrain': ('terrain_vector', ['uid', 'plain_area', 'hill_slope', 'ridge_area', 'slopy_area', 'valley_are']),
    'connectivity': ('mws_connectivity_vector', ['uid', 'upstream', 'downstream', 'direction']),
    'annual_water': ('change_in_well_depth_vector', ['uid', '2017_2018', '2024_2025']),
    'fortnightly_water': ('water_balance_fortnightly_vector', ['uid', '2017-07-01']),
    'soge': ('stage_of_groundwater_extraction_vector', ['sgw_dev_pe', 'class', 'agwd_tot', 'ar_gwr_tot']),
    'aquifer': ('aquifer_vector', ['Major_Aqui', 'Principal_', 'Age']),
    'waterbodies': ('surface_water_bodies_vector', ['UID', 'area_ored', 'area_17-18', 'k_17-18', 'kr_17-18', 'krz_17-18']),
    'cropping': ('cropping_intensity_vector', ['uid', 'cropping_intensity_2017', 'single_kharif_cropped_area_2017', 'doubly_cropped_area_2017']),
    'population': ('admin_boundaries_vector', ['vill_ID', 'TOT_P', 'P_SC', 'P_ST', 'P_LIT'])
}

def read(cells, variable, title, note):
    section(cells, title, note, f'''
        {variable}_response = requests.get(layer_urls["{variable}"], timeout=90)
        {variable}_response.raise_for_status()
        {variable}_geojson = {variable}_response.json()
        {variable} = gpd.GeoDataFrame.from_features({variable}_geojson["features"], crs="EPSG:4326")
        {variable}.drop(columns="geometry").head()
        ''')


    if variable in METADATA:
        suffix, fields = METADATA[variable]
        section(cells, 'Read the field descriptions', 'STAC records describe the published fields. This table selects the fields used below and keeps their original descriptions.', f'''
            item_name = f"{{state}}_{{district}}_{{tehsil}}_{suffix}"
            item_url = urljoin(STAC_URL, f"{{state}}/{{district}}/{{tehsil}}/{{item_name}}/{{item_name}}.json")
            item_response = requests.get(item_url, timeout=90)
            item_response.raise_for_status()
            item = item_response.json()
            field_notes = pd.DataFrame(item["properties"]["table:columns"])
            field_notes.loc[field_notes["name"].isin({fields!r}), ["name", "type", "description"]]
            ''')

def select_mws(cells, variable):
    section(cells, 'Choose one micro-watershed', '`uid` is the MWS identifier in this layer. Start with the first one, or replace `mws_id` with another identifier from the displayed list.', f'''
        mws_ids = {variable}["uid"].sort_values().tolist()
        display(pd.DataFrame({{"MWS identifier": mws_ids}}))
        mws_id = mws_ids[0]
        mws_id
        ''')

def api_setup(cells):
    section(cells, 'Connect to the CoRE Stack API', 'Read endpoint specifications at [api-doc.core-stack.org](https://api-doc.core-stack.org). The [public API guide](https://docs.core-stack.org/use-precomputed-data/public-apis/) explains how to register, generate an API key and use it. The key goes in the `X-API-Key` header. This cell reads `CORE_STACK_API_KEY` from your environment, or asks for it without showing it. The key is not written into the notebook. After each API request, run the collapsed parsing cell: it keeps the raw response text and reads it with `json.loads`, which accepts `NaN` as a missing numeric value. It also shows HTTP errors and skips dependent API cells if the request fails. Expand the cell to inspect the code.', '''
        from inspect import isawaitable

        api_key = os.environ.get("CORE_STACK_API_KEY", "").strip()
        if not api_key:
            api_key = getpass("CoRE Stack API key: ")
            if isawaitable(api_key):
                api_key = await api_key

        api_headers = {"X-API-Key": str(api_key).strip()}
        ''')

def api_tehsil(cells):
    section(cells, 'Read the tehsil tables from the API', '`get_tehsil_data` returns a dictionary of tables for the same place. Here we make the request once and reuse the returned tables below.', '''
        api_response = requests.get(API_URL + "get_tehsil_data/", params=place, headers=api_headers, timeout=180)
        api_response.raise_for_status()
        api_data = api_response.json()
        pd.DataFrame({"Table": api_data.keys(), "Rows": [len(rows) for rows in api_data.values()]})
        ''')

def api_mws(cells, group, variable, heading, columns=None, key='uid'):
    fields = repr(columns) if columns else 'None'
    source = f'{variable} = pd.DataFrame(api_data[{group!r}])\n{variable} = {variable}.loc[{variable}[{key!r}] == mws_id]\n'
    source += f'{variable}.reindex(columns={fields}).T' if columns else f'{variable}.T'
    section(cells, heading, 'Read the API table for the same MWS. The column names identify the units.', source)

# 1. Start
entry, cells = begin(1, 'start', 'Start', 'List the layers, open a vector table, explore a tehsil STAC collection and make your first API request.')
registry = [(x['label'], x['service'], x['workspace'], x['layerNameTemplate']) for x in LAYERS]
cells += [md('## List the GeoServer layers\n\nThe reference list below contains layer names and services. WFS links return vector data; WMS links show map images. Expand the reference cell to inspect the names.'),
          code('layer_reference = [\n' + '\n'.join('    ' + repr(row) + ',' for row in registry) + '\n]', True),
          code('''
            layer_list = pd.DataFrame(layer_reference, columns=["Layer", "Service", "Workspace", "Layer name"])
            layer_list["Layer name"] = layer_list["Layer name"].str.replace("{district}", district, regex=False).str.replace("{tehsil}", tehsil, regex=False)
            with pd.option_context("display.max_rows", None):
                display(layer_list)
            ''' )]
section(cells, 'See the vector download links', 'The request names a workspace and layer, asks for features, and chooses GeoJSON as the output format.', '''
    vector_layers = layer_list.loc[layer_list["Service"] == "WFS"].copy()
    vector_layers["GeoJSON URL"] = (GEOSERVER + "ows?service=WFS&version=2.0.0&request=GetFeature&typeNames="
        + vector_layers["Workspace"] + ":" + vector_layers["Layer name"]
        + "&outputFormat=application/json&srsName=EPSG:4326")
    with pd.option_context("display.max_rows", None):
        display(vector_layers[["Layer", "GeoJSON URL"]])
    ''')
section(cells, 'Open the micro-watershed layer', 'Read one specific link. The JSON response contains `features`, which GeoPandas turns into rows and a geometry column.', '''
    mws_url = f"{GEOSERVER}mws/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=mws:mws_{district}_{tehsil}&outputFormat=application/json&srsName=EPSG:4326"
    response = requests.get(mws_url, timeout=90)
    response.raise_for_status()
    mws_geojson = response.json()
    mws = gpd.GeoDataFrame.from_features(mws_geojson["features"], crs="EPSG:4326")
    mws.head()
    ''')
section(cells, 'Read a few columns', '`uid` identifies a micro-watershed. `area_in_ha` gives its area in hectares. Change the column list to inspect other fields.', '''
    mws.drop(columns="geometry").iloc[:10, :10]
    ''')
section(cells, 'Save the data', 'GeoJSON keeps the shapes; CSV keeps the table. Download the saved files from the notebook file browser. Open the GeoJSON using [GeoLibre’s Add Data tools](https://geolibre.app/user-guide/interface/) or follow the [CoRE Stack QGIS guide](https://docs.google.com/document/d/1jet4EEBbbKgpNrPnuNJJDRuAJUiR2pIMFQp9JTlygAQ/edit).', '''
    # GeoPandas writes GeoJSON directly, without a separate GIS file driver.
    with open("micro-watersheds.geojson", "w") as file:
        file.write(mws.to_json())
    mws.drop(columns="geometry").to_csv("micro-watersheds.csv", index=False)
    display(FileLink("micro-watersheds.geojson"), FileLink("micro-watersheds.csv"))
    ''')
section(cells, 'Open the tehsil STAC collection', 'A STAC collection describes a group of datasets. This URL follows the state/district/tehsil folders in the [CoRE Stack catalogue](https://stac.core-stack.org/tehsil_wise/catalog.json).', '''
    collection_url = urljoin(STAC_URL, f"{state}/{district}/{tehsil}/collection.json")
    collection = requests.get(collection_url, timeout=90).json()
    print(collection_url)
    display(pd.Series(collection)[["id", "description", "extent", "license"]])
    ''')
section(cells, 'List the items in this collection', 'Each `item` link describes a dataset. Relative links are resolved against the collection URL.', '''
    collection_links = pd.DataFrame(collection["links"])
    items = collection_links.loc[collection_links["rel"] == "item", ["href", "type"]].copy()
    items["Item URL"] = [urljoin(collection_url, href) for href in items["href"]]
    with pd.option_context("display.max_rows", None):
        display(items[["Item URL", "type"]])
    ''')
section(cells, 'Read one item’s metadata', 'Here we inspect the change-in-cropping-intensity item. Its metadata describes a raster dataset; this step reads only the metadata, not the raster. Choose another item from the preceding list to explore its description.', '''
    item_name = f"{state}_{district}_{tehsil}_change_cropping_intensity_raster"
    item_url = urljoin(collection_url, f"{item_name}/{item_name}.json")
    item = requests.get(item_url, timeout=90).json()
    print(item_url)
    display(pd.Series(item["properties"], name="Value").to_frame())
    ''')
section(cells, 'Find the item’s assets', 'An item’s `assets` dictionary gives links to its data. Read the media type and description before downloading an asset.', '''
    assets = pd.DataFrame.from_dict(item["assets"], orient="index")
    assets["href"] = [urljoin(item_url, href) for href in assets["href"]]
    assets
    ''')
section(cells, 'Explore the public APIs', 'The [API specifications](https://api-doc.core-stack.org) describe each endpoint. Follow the [public API guide](https://docs.core-stack.org/use-precomputed-data/public-apis/) to generate your API key. This public OpenAPI document lists the callable paths, required parameters and response descriptions; reading it does not require your key.', '''
    API_SCHEMA_URL = "https://geoserver.core-stack.org/?format=openapi"
    schema_response = requests.get(API_SCHEMA_URL, timeout=90)
    schema_response.raise_for_status()
    api_spec = schema_response.json()
    api_paths = {path: methods["get"] for path, methods in api_spec["paths"].items() if path.startswith("/get_")}
    api_catalogue = pd.DataFrame([
        {"API path": path,
         "Required parameters": ", ".join(p["name"] for p in operation["parameters"] if p["in"] == "query" and p.get("required")),
         "Optional parameters": ", ".join(p["name"] for p in operation["parameters"] if p["in"] == "query" and not p.get("required"))}
        for path, operation in api_paths.items()
    ])
    with pd.option_context("display.max_rows", None, "display.max_colwidth", None):
        display(api_catalogue)
    ''')
section(cells, 'Choose an API and inspect its specification', 'Change `api_path` to any path in the table. The parameter table shows types and descriptions. The response definitions include documented schemas or examples.', '''
    api_path = "/get_active_locations/"
    operation = api_paths[api_path]
    print(operation.get("description", operation.get("summary", "")))
    parameters = pd.DataFrame(operation["parameters"])
    display(parameters.reindex(columns=["name", "in", "required", "type", "description"]))
    print(json.dumps(operation["responses"], indent=2))
    ''')
api_setup(cells)
section(cells, 'Set parameters for the chosen API', 'The same base URL and API key header work for all the listed APIs. Edit `request_params` to match the chosen specification: use `{}` for active locations, `place.copy()` for tehsil APIs, or `{**place, "mws_id": mws_id}` for one MWS. Coordinate APIs take `latitude` and `longitude`; the single-waterbody API takes `place` and a `uid` from Notebook 4.', '''
    mws_id = mws["uid"].sort_values().iloc[0]
    request_params = {}  # get_active_locations needs no query parameters.
    request_url = API_URL.rstrip("/") + api_path
    print(request_url)
    request_params
    ''')
section(cells, 'Request the data', 'Run this cell after changing the API path and parameters. The JSON response stays available as `api_result` for your next cell. No API key is included in the displayed URL.', '''
    api_response = requests.get(request_url, params=request_params, headers=api_headers, timeout=180)
    api_response.raise_for_status()
    api_result = api_response.json()
    print(json.dumps(api_result, indent=2)[:4000])  # Preview; api_result contains the full response.
    ''')
section(cells, 'Find the generated layer links', '`get_generated_layer_urls` lists published layer links for this tehsil, including styling information where supplied.', '''
    response = requests.get(API_URL + "get_generated_layer_urls/", params=place, headers=api_headers, timeout=90)
    response.raise_for_status()
    api_layers = pd.DataFrame(response.json())
    api_layers.head(10)
    ''')
api_tehsil(cells)
section(cells, 'Choose a tehsil table', 'Change `table_name` to any table in the preceding list. Start with the MWS records.', '''
    table_name = "mws"
    api_table = pd.DataFrame(api_data[table_name])
    api_table.head(10)
    ''')
section(cells, 'Find an MWS from a point', 'Use a point inside the first MWS, or change the latitude and longitude to your own location.', '''
    point = mws.geometry.iloc[0].representative_point()
    coordinates = {"latitude": point.y, "longitude": point.x}
    response = requests.get(API_URL + "get_mwsid_by_latlon/", params=coordinates, headers=api_headers, timeout=90)
    response.raise_for_status()
    response.json()
    ''')
finish(entry, cells)

# 2. Know Your Micro-Watershed
entry, cells = begin(2, 'know-your-micro-watershed', 'Know Your Micro-Watershed', 'Read the area, basin fields, elevation, terrain and drainage of one MWS, then map its upstream and downstream links.')
specs = [('mws','mws'),('connectivity','mws_connectivity'),('terrain','terrain_vector'),('elevation','dem_vector'),('rivers','river'),('canals','canal'),('drainage','drainage_density'),('stream_order','stream_order'),('villages','administrative_boundaries'),('waterbodies','remote_sensed_waterbodies')]
sources(cells, specs, 'Village and waterbody intersection tables will be made from these vector shapes.')
read(cells, 'mws', 'Read the MWS boundaries', 'Read the shapes and their published fields.')
select_mws(cells,'mws')
section(cells, 'Area and basin details', 'Select the MWS by its exact `uid`. The basin fields are `wsconc`, `bacode` and `sbcode`. Fields without a recorded value remain blank.', '''
    selected_mws = mws.loc[mws["uid"] == mws_id]
    selected_mws.reindex(columns=["uid", "area_in_ha", "wsconc", "bacode", "sbcode"]).rename(columns={
        "area_in_ha": "Area (ha)", "wsconc": "Watershed code", "bacode": "Basin code", "sbcode": "Sub-basin code"
    }).T
    ''')
read(cells,'elevation','Read the elevation summary','This vector layer gives the minimum, maximum and mean elevation for each MWS.')
section(cells,'Elevation in metres','Read the three elevation columns for the selected MWS.', '''
    elevation.loc[elevation["uid"] == mws_id, ["min_elevation", "max_elevation", "mean_elevation"]].rename(columns={
        "min_elevation": "Minimum (m)", "max_elevation": "Maximum (m)", "mean_elevation": "Mean (m)"
    }).T
    ''')
read(cells,'terrain','Read the terrain layer','The terrain columns describe shares of the MWS area.')
section(cells,'Terrain shares','These five fields are already percentages. They do not need to be divided by the MWS area.', '''
    terrain_columns = {"plain_area": "Plains (%)", "slopy_area": "Sloping land (%)", "hill_slope": "Hill slopes (%)",
                       "ridge_area": "Ridges (%)", "valley_are": "Valleys (%)"}
    terrain.loc[terrain["uid"] == mws_id, list(terrain_columns)].rename(columns=terrain_columns).T
    ''')
read(cells,'connectivity','Read MWS connections','`upstream` contains a list stored as text. `downstream` contains an identifier, or an empty string where no link is recorded.')
section(cells,'List upstream and downstream MWS','Use `ast.literal_eval` to read the upstream list. Keep the downstream identifier as a string, including its underscore.', '''
    connection_rows = connectivity.loc[connectivity["uid"] == mws_id]
    upstream_ids, downstream_ids = [], []
    if connection_rows.empty:
        print(f"No connectivity record is available for {mws_id}. This does not mean it has no connections.")
    else:
        connection = connection_rows.iloc[0]
        upstream_ids = ast.literal_eval(connection["upstream"]) if pd.notna(connection["upstream"]) else []
        downstream = connection["downstream"]
        downstream_ids = [downstream] if pd.notna(downstream) and downstream else []
        display(pd.DataFrame({"Upstream MWS": upstream_ids}))
        display(pd.DataFrame({"Downstream MWS": downstream_ids}))
    ''')
section(cells,'Map the connections','Blue MWS contribute water to the selected MWS. Orange MWS receive it. Only shapes in the loaded tehsil layer can be drawn.', '''
    if not connection_rows.empty:
        upstream_mws = mws.loc[mws["uid"].isin(upstream_ids)]
        downstream_mws = mws.loc[mws["uid"].isin(downstream_ids)]
        ax = selected_mws.plot(color="grey", edgecolor="black", figsize=(7, 6))
        if not upstream_mws.empty:
            upstream_mws.plot(ax=ax, color="steelblue", edgecolor="white")
        if not downstream_mws.empty:
            downstream_mws.plot(ax=ax, color="darkorange", edgecolor="white")
        ax.set(title="Selected: grey · upstream: blue · downstream: orange", xlabel="Longitude", ylabel="Latitude")
        plt.show()
    ''')
read(cells,'drainage','Read drainage density','Drainage density describes stream length relative to area.')
section(cells,'Drainage-density values','Read the published weighted value and standard deviation in km/km².', '''
    drainage.loc[drainage["uid"] == mws_id, ["drainage_density_weighted", "drainage_density_std"]].rename(columns={
        "drainage_density_weighted": "Weighted drainage density (km/km²)",
        "drainage_density_std": "Standard deviation (km/km²)"
    }).T
    ''')
read(cells,'stream_order','Read stream-order shares','Columns `1` through `11` give the published area shares for the stream orders.')
section(cells,'Stream-order shares','Turn the selected row into a short table and bar chart.', '''
    order_columns = [str(order) for order in range(1, 12)]
    order_shares = stream_order.loc[stream_order["uid"] == mws_id].reindex(columns=order_columns).reset_index(drop=True).reindex([0]).iloc[0]
    display(order_shares.rename_axis("Stream order").to_frame("Area share (%)"))
    order_shares.plot.bar(figsize=(8, 3), xlabel="Stream order", ylabel="Area share (%)")
    plt.show()
    ''')
read(cells,'rivers','Read the rivers','Inspect the river features provided for the tehsil.')
read(cells,'canals','Read the canals','Inspect the canal features provided for the tehsil.')
read(cells,'villages','Read the village boundaries','The census boundary layer uses `vill_ID` and `vill_name`.')
section(cells,'Villages intersecting this MWS','Use the selected MWS shape to find intersecting village shapes. A village can intersect more than one MWS.', '''
    mws_shape = selected_mws.geometry.iloc[0]
    mws_intersect_villages = villages.loc[villages.intersects(mws_shape), ["vill_ID", "vill_name"]]
    mws_intersect_villages
    ''')
read(cells,'waterbodies','Read the surface waterbodies','The surface-waterbody identifier is `UID`, with capital letters.')
section(cells,'Waterbodies intersecting this MWS','The result lists waterbody identifiers; it does not divide waterbody area between MWS.', '''
    mws_intersect_swb = waterbodies.loc[waterbodies.intersects(mws_shape), ["UID"]]
    mws_intersect_swb
    ''')
api_setup(cells)
section(cells, 'Read MWS boundaries from the API', '`get_mws_geometries` returns the tehsil boundaries as GeoJSON. Select the same MWS identifier used above.', '''
    response = requests.get(API_URL + "get_mws_geometries/", params=place, headers=api_headers, timeout=90)
    response.raise_for_status()
    api_mws_boundaries = gpd.GeoDataFrame.from_features(response.json()["features"], crs="EPSG:4326")
    api_mws_boundaries.loc[api_mws_boundaries["uid"] == mws_id]
    ''')
section(cells, 'Read the MWS indicator summary', '`get_mws_kyl_indicators` provides a compact indicator record. Inspect the column names to choose the indicators you want to explore next.', '''
    response = requests.get(API_URL + "get_mws_kyl_indicators/", params={**place, "mws_id": mws_id}, headers=api_headers, timeout=90)
    response.raise_for_status()
    api_indicators = pd.DataFrame(response.json())
    api_indicators.T
    ''')
section(cells, 'Find the MWS report', '`get_mws_report` returns the report link for this MWS.', '''
    response = requests.get(API_URL + "get_mws_report/", params={**place, "mws_id": mws_id}, headers=api_headers, timeout=90)
    response.raise_for_status()
    response.json()
    ''')

api_tehsil(cells)
section(cells, 'Compare the MWS tables', 'Choose `mws`, `dem`, `terrain`, `drainage_density` or `stream_order` to inspect this MWS. Change `table_name` and rerun this cell.', "table_name = 'terrain'\napi_table = pd.DataFrame(api_data[table_name])\napi_table.loc[api_table['uid'] == mws_id].T")
section(cells, 'Try another MWS API', 'Change `mws_api` to `get_mws_data` for time series or `get_mws_kyl_indicators` for its summary. Notebook 3 plots the time-series response. Coordinate lookup is demonstrated in Start.', "mws_api = 'get_mws_data'\nresponse = requests.get(API_URL + mws_api + '/', params={**place, 'mws_id': mws_id}, headers=api_headers, timeout=90)\nresponse.raise_for_status()\nmws_result = response.json()\nprint(json.dumps(mws_result, indent=2)[:2000])")
finish(entry,cells)

# 3. Water through the years and seasons
entry,cells = begin(3,'water-through-time','See Water through the Years and Seasons','Follow annual and seasonal rainfall, evapotranspiration and runoff, then read fortnightly water and vegetation values.')
sources(cells,[('annual_water','mws_layers'),('fortnightly_water','mws_layers_fortnight'),('soge','soge'),('aquifer','aquifer'),('ndvi_crop','ndvi_crop'),('ndvi_tree','ndvi_tree'),('ndvi_shrub','ndvi_shrub')], 'The seasonal table is calculated from the fortnightly water layer. NDVI has separate crop, tree and shrub vector layers.')
read(cells,'annual_water','Read annual water data','Each year is a JSON object stored in a field such as `2017_2018`. The object contains `Precipitation`, `ET` and `RunOff`, all in millimetres.')
select_mws(cells,'annual_water')
section(cells,'Make an annual table','Read the selected MWS, open each year’s JSON object and keep the three water values.', '''
    water_row = annual_water.loc[annual_water["uid"] == mws_id].iloc[0]
    annual_records = [json.loads(water_row[f"{year}_{year + 1}"]) for year in YEARS]
    annual = pd.DataFrame(annual_records, index=YEARS)[["Precipitation", "ET", "RunOff"]]
    annual = annual.rename(columns={"Precipitation": "Rainfall", "RunOff": "Runoff"})
    annual.index.name = "July–June year starting"
    annual
    ''')
section(cells,'Plot annual rainfall, ET and runoff','The three series share a millimetre axis. Change the figure size, colours or selected columns to try another presentation.', '''
    ax = annual.plot(marker="o", figsize=(10, 4))
    ax.set(title="Annual water balance", xlabel="July–June year starting", ylabel="Water depth (mm)")
    ax.grid(axis="y", alpha=0.2)
    plt.show()
    ''')
read(cells,'fortnightly_water','Read fortnightly water data','The date fields contain JSON objects. Use the published dates: interval starts can differ between tehsils.')
section(cells,'Make a table of fortnightly water values','Use the date fields for 2017–18 through 2024–25. Converting the index to dates makes time-series plotting and seasonal grouping straightforward.', '''
    fortnight_row = fortnightly_water.loc[fortnightly_water["uid"] == mws_id].reset_index(drop=True).reindex([0]).iloc[0]
    date_fields = sorted(fortnightly_water.filter(regex=r"^\\d{4}-\\d{2}-\\d{2}$").columns)
    fortnightly = pd.DataFrame({date: json.loads(fortnight_row[date]) if pd.notna(fortnight_row[date]) else {} for date in date_fields}).T
    fortnightly = fortnightly.reindex(columns=["Precipitation", "ET", "RunOff"])
    fortnightly = fortnightly[["Precipitation", "ET", "RunOff"]].rename(columns={"Precipitation": "Rainfall", "RunOff": "Runoff"})
    fortnightly.index = pd.to_datetime(fortnightly.index)
    fortnightly = fortnightly.loc["2017-07-01":"2025-06-30"]
    fortnightly.index.name = "Date"
    fortnightly.head(12)
    ''')
section(cells,'Group the values into seasons','Kharif is July–October, Rabi November–February, and Zaid March–June. These sums use the available recorded intervals, so incomplete seasons are not full-season totals. Each interval belongs to the season of its start date, as in the tehsil API. Annual and fortnightly layers are separate estimates, so their totals can differ.', '''
    seasonal_rows = fortnightly.copy()
    month = seasonal_rows.index.month
    seasonal_rows["Year"] = seasonal_rows.index.year - (month < 7).astype(int)
    seasonal_rows["Season"] = pd.Series(month, index=seasonal_rows.index).map({
        7: "Kharif", 8: "Kharif", 9: "Kharif", 10: "Kharif",
        11: "Rabi", 12: "Rabi", 1: "Rabi", 2: "Rabi", 3: "Zaid", 4: "Zaid", 5: "Zaid", 6: "Zaid"
    })
    seasonal = seasonal_rows.groupby(["Year", "Season"])[["Rainfall", "ET", "Runoff"]].sum(min_count=1)
    seasonal
    ''')
section(cells,'Align annual and seasonal charts','Each column follows one water variable. Annual values are above Kharif, Rabi and Zaid. The four rows share a scale within each column.', '''
    fig, axes = plt.subplots(4, 3, figsize=(12, 10), sharex=True, sharey="col")
    for column, variable in enumerate(["Rainfall", "ET", "Runoff"]):
        axes[0, column].plot(YEARS, annual[variable], marker="o")
        axes[0, column].set(title=variable, ylabel="Annual (mm)")
        for row, season in enumerate(["Kharif", "Rabi", "Zaid"], start=1):
            values = seasonal.xs(season, level="Season")[variable].reindex(YEARS)
            axes[row, column].plot(YEARS, values, marker="o")
            axes[row, column].set_ylabel(f"{season} (mm)")
        axes[3, column].set_xlabel("July–June year starting")
    plt.tight_layout()
    plt.show()
    ''')
section(cells,'Plot the fortnightly water series','These are water depths for each recorded interval. Separate plots make the different ranges easier to read.', '''
    axes = fortnightly.plot(subplots=True, figsize=(11, 7), sharex=True, legend=False)
    for ax, variable in zip(axes, ["Rainfall", "ET", "Runoff"]):
        ax.set_ylabel(f"{variable} (mm)")
    plt.tight_layout()
    plt.show()
    ''')
for kind in ['crop','tree','shrub']:
    read(cells,'ndvi_'+kind,'Read NDVI on '+{'crop':'crops','tree':'trees','shrub':'shrubs'}[kind], 'NDVI is a unitless measure of vegetation greenness. The date fields contain numeric values directly.')
section(cells,'Put the three NDVI series together','Read each layer’s own date columns for the same MWS. Pandas aligns the series by date and leaves a gap where a layer has no value.', '''
    crop_ndvi = ndvi_crop.loc[ndvi_crop["uid"] == mws_id].reset_index(drop=True).reindex([0]).iloc[0].filter(regex=r"^\\d{4}-\\d{2}-\\d{2}$")
    tree_ndvi = ndvi_tree.loc[ndvi_tree["uid"] == mws_id].reset_index(drop=True).reindex([0]).iloc[0].filter(regex=r"^\\d{4}-\\d{2}-\\d{2}$")
    shrub_ndvi = ndvi_shrub.loc[ndvi_shrub["uid"] == mws_id].reset_index(drop=True).reindex([0]).iloc[0].filter(regex=r"^\\d{4}-\\d{2}-\\d{2}$")
    ndvi = pd.DataFrame({"Crops": crop_ndvi, "Trees": tree_ndvi, "Shrubs": shrub_ndvi})
    ndvi.index = pd.to_datetime(ndvi.index)
    ndvi = ndvi.sort_index().loc["2017-07-01":"2025-06-30"]
    ndvi.head(12)
    ''')
section(cells,'Plot vegetation greenness','The three plots share the NDVI scale and date axis.', '''
    axes = ndvi.plot(subplots=True, figsize=(11, 7), sharex=True, sharey=True, legend=False)
    for ax, cover in zip(axes, ["Crops", "Trees", "Shrubs"]):
        ax.set_ylabel(f"{cover} NDVI")
    plt.tight_layout()
    plt.show()
    ''')
read(cells,'soge','Read groundwater extraction data','This layer describes the stage of groundwater extraction and the assessment category.')
section(cells,'Groundwater assessment for this MWS','Read the published extraction percentage and class.', '''
    soge.loc[soge["uid"] == mws_id, ["sgw_dev_pe", "class"]].rename(columns={"sgw_dev_pe": "Groundwater extraction (%)", "class": "Assessment class"}).T
    ''')
read(cells,'aquifer','Read the aquifer layer','The aquifer class identifies the main aquifer material. It is context for the water series, not an annual measurement.')
section(cells,'Aquifer description','Read the classification and the published aquifer description for the same identifier.', '''
    aquifer.loc[aquifer["uid"] == mws_id, ["aquifer_class", "Major_Aqui", "Principal_", "Age"]].T
    ''')
api_setup(cells)
section(cells,'Fortnightly water and NDVI from the API','`get_mws_data` returns these time series for one MWS. Read its `time_series` list as a table.', '''
    response = requests.get(API_URL + "get_mws_data/", params={**place, "mws_id": mws_id}, headers=api_headers, timeout=90)
    response.raise_for_status()
    api_time_series = pd.DataFrame(response.json()["time_series"])
    api_time_series[["date", "precipitation", "runoff", "et", "ndvi_crop", "ndvi_tree", "ndvi_shrub"]].head(12)
    ''')
section(cells, 'Plot the API time series', 'Rainfall, runoff and ET share millimetre units. NDVI is shown separately. Change the selected columns to explore another series.', '''
    api_time_series["date"] = pd.to_datetime(api_time_series["date"])
    api_series = api_time_series.set_index("date").sort_index()
    api_series[["precipitation", "runoff", "et"]].plot(subplots=True, figsize=(10, 7), ylabel="mm")
    plt.tight_layout()
    plt.show()
    api_series[["ndvi_crop", "ndvi_tree", "ndvi_shrub"]].plot(figsize=(10, 4), ylabel="NDVI")
    plt.show()
    ''')

api_tehsil(cells)
section(cells, 'Read a water table from the API', 'The first ten MWS identifiers are shown below. Choose `hydrological_annual`, `hydrological_seasonal`, `soge_vector` or `aquifer_vector`, then select the same MWS used above.', "display(pd.DataFrame(api_data['mws'])[['uid']].head(10))\ntable_name = 'hydrological_annual'\napi_water_table = pd.DataFrame(api_data[table_name])\napi_water_table.loc[api_water_table['uid'] == mws_id].T")
finish(entry,cells)

# 4. Surface waterbodies
entry,cells=begin(4,'surface-waterbodies','Analyse Water Storage: Surface Waterbodies','List waterbodies and read their annual and seasonal water-spread areas from 2017–18 to 2024–25.')
sources(cells,[('waterbodies','remote_sensed_waterbodies'),('mws','mws'),('rivers','river'),('canals','canal'),('stream_order','stream_order')])
read(cells,'waterbodies','Read the surface-waterbody layer','`UID` identifies a waterbody. Annual `area_YY-YY` fields are hectares. `area_ored` is its combined detected footprint in hectares.')
for var,title,note in [('mws','Read MWS boundaries','These shapes provide the MWS context.'),('rivers','Read rivers','Inspect the tehsil’s river features.'),('canals','Read canals','Inspect the tehsil’s canal features.'),('stream_order','Read stream-order shares','This vector layer describes stream-order area shares for each MWS.')]:read(cells,var,title,note)
section(cells,'List the waterbody identifiers','Choose the first identifier, or copy another value from the list into `waterbody_id`.', '''
    waterbody_ids = waterbodies["UID"].sort_values().tolist()
    display(pd.DataFrame({"Waterbody identifier": waterbody_ids}))
    waterbody_id = waterbody_ids[0]
    waterbody = waterbodies.loc[waterbodies["UID"] == waterbody_id].iloc[0]
    waterbody_id
    ''')
section(cells,'Read annual and seasonal values','The seasonal fields `k`, `kr` and `krz` are the Kharif, Rabi and Zaid percentages of `area_ored`. Keep these source percentages beside the hectare values.', '''
    year_suffixes = [f"{y%100:02d}-{(y+1)%100:02d}" for y in YEARS]
    water_area = pd.DataFrame({
        "Annual area (ha)": [waterbody[f"area_{year}"] for year in year_suffixes],
        "Kharif (%)": [waterbody[f"k_{year}"] for year in year_suffixes],
        "Rabi (%)": [waterbody[f"kr_{year}"] for year in year_suffixes],
        "Zaid (%)": [waterbody[f"krz_{year}"] for year in year_suffixes]
    }, index=[f"{y}–{y+1}" for y in YEARS])
    # Convert the recorded seasonal percentages to hectares using their reference footprint.
    water_area["Kharif area (ha)"] = water_area["Kharif (%)"] * waterbody["area_ored"] / 100
    water_area["Rabi area (ha)"] = water_area["Rabi (%)"] * waterbody["area_ored"] / 100
    water_area["Zaid area (ha)"] = water_area["Zaid (%)"] * waterbody["area_ored"] / 100
    water_area
    ''')
section(cells,'Total annual waterbody area','Sum each annual area column across the waterbody records. Each waterbody is counted once. These values describe water-spread area, not storage volume.', '''
    annual_area_columns = [f"area_{year}" for year in year_suffixes]
    total_area = waterbodies[annual_area_columns].sum(min_count=len(waterbodies))
    total_area.index = water_area.index
    display(total_area.to_frame("Total annual area (ha)"))
    total_area.plot(marker="o", figsize=(10, 4), ylabel="Total waterbody area (ha)", xlabel="Year")
    plt.show()
    ''')
api_setup(cells)
section(cells,'Read the waterbody API for this tehsil','`get_waterbodies_data_by_admin` returns records keyed by waterbody identifier. Inspect the keys and the available properties.', '''
    response = requests.get(API_URL + "get_waterbodies_data_by_admin/", params=place, headers=api_headers, timeout=180)
    response.raise_for_status()
    api_waterbodies = response.json()
    api_waterbody_table = pd.DataFrame.from_dict(api_waterbodies, orient="index")
    api_waterbody_table.head()
    ''')
section(cells,'Read its annual and seasonal area fields','Select the same annual and seasonal field names. `reindex` keeps the requested columns visible even when a value is not supplied.', '''
    area_fields = [f"{prefix}_{year}" for year in year_suffixes for prefix in ["area", "k", "kr", "krz"]]
    api_area = api_waterbody_table.reindex(index=[waterbody_id], columns=["area_ored"] + area_fields).iloc[0]
    api_water_area = pd.DataFrame({
        "Annual area (ha)": [api_area[f"area_{year}"] for year in year_suffixes],
        "Kharif area (ha)": [api_area[f"k_{year}"] * api_area["area_ored"] / 100 for year in year_suffixes],
        "Rabi area (ha)": [api_area[f"kr_{year}"] * api_area["area_ored"] / 100 for year in year_suffixes],
        "Zaid area (ha)": [api_area[f"krz_{year}"] * api_area["area_ored"] / 100 for year in year_suffixes]
    }, index=water_area.index)
    api_water_area
    ''')
section(cells,'Request the selected waterbody','Pass the same identifier to `get_waterbody_data`. The HTTP status and response show what the service returned.', '''
    response = requests.get(API_URL + "get_waterbody_data/", params={**place, "uid": waterbody_id}, headers=api_headers, timeout=90)
    print("HTTP status:", response.status_code)
    api_waterbody_response = response.json()
    pd.DataFrame.from_dict(api_waterbody_response, orient="index")
    ''')
finish(entry,cells)

# 5. Agriculture through time
entry,cells=begin(5,'agriculture-through-time','Analyse Agriculture through Time','Read cropping areas and land-cover classes for one micro-watershed from 2017–18 to 2024–25.')
sources(cells,[('cropping','cropping_intensity'),('land_cover','lulc_vector')])
read(cells,'cropping','Read the cropping-intensity layer','The area fields are hectares. Their year suffix is the starting year of the July–June period.')
select_mws(cells,'cropping')
section(cells,'List the years','Read the published cropping-intensity field for each requested year.', '''
    crop_row = cropping.loc[cropping["uid"] == mws_id].iloc[0]
    pd.DataFrame({"Year": [f"{y}–{y+1}" for y in YEARS],
                  "Cropping intensity": [crop_row[f"cropping_intensity_{y}"] for y in YEARS]})
    ''')
section(cells,'Area under each cropping category','The four categories separate single Kharif, single non-Kharif, double and triple cropping. Edit the selected columns to explore them.', '''
    crop_area = pd.DataFrame({
        "Single Kharif": [crop_row[f"single_kharif_cropped_area_{y}"] for y in YEARS],
        "Single non-Kharif": [crop_row[f"single_non_kharif_cropped_area_{y}"] for y in YEARS],
        "Double cropping": [crop_row[f"doubly_cropped_area_{y}"] for y in YEARS],
        "Triple cropping": [crop_row[f"triply_cropped_area_{y}"] for y in YEARS]
    }, index=[f"{y}–{y+1}" for y in YEARS])
    crop_area.index.name = "Year"
    crop_area
    ''')
section(cells,'Uncropped or fallow land','Show these explicitly named fields when supplied. Do not infer fallow land by subtracting the four categories from the MWS area.', '''
    uncropped_fields = [f"uncropped_area_{y}" for y in YEARS]
    fallow_fields = [f"fallow_area_{y}" for y in YEARS]
    available_fields = cropping.columns.intersection(uncropped_fields + fallow_fields)
    cropping.loc[cropping["uid"] == mws_id, available_fields].T
    ''')
section(cells,'Plot the hectare values','The stacked columns show the recorded area in each category.', '''
    crop_area.plot.bar(stacked=True, figsize=(10, 4), ylabel="Area (ha)")
    plt.legend(title="Cropping category", bbox_to_anchor=(1, 1))
    plt.tight_layout()
    plt.show()
    ''')
section(cells,'Show the cropping shares','Divide each category by the sum of the four recorded cropping areas for that year. These are shares of recorded cropped land, not of the whole MWS.', '''
    cropped_total = crop_area.sum(axis=1, min_count=4).replace(0, float("nan"))
    crop_share = crop_area.div(cropped_total, axis=0) * 100
    display(crop_share)
    crop_share.plot.bar(stacked=True, figsize=(10, 4), ylabel="Share of recorded cropped area (%)")
    plt.legend(title="Cropping category", bbox_to_anchor=(1, 1))
    plt.tight_layout()
    plt.show()
    ''')
read(cells,'land_cover','Read the land-cover summary','This vector layer records the areas of broader land-cover classes and cropping classes for each year.')
section(cells,'Read broader land-cover areas','Read the selected MWS using the exact field prefixes below. The values are hectares.', '''
    cover_row = land_cover.loc[land_cover["uid"] == mws_id].reset_index(drop=True).reindex([0]).iloc[0]
    cover_area = pd.DataFrame({
        "Built-up": [cover_row[f"built-up_area_{y}"] for y in YEARS],
        "Trees and forest": [cover_row[f"tree_forest_area_{y}"] for y in YEARS],
        "Shrubs and scrub": [cover_row[f"shrub_scrub_area_{y}"] for y in YEARS],
        "Barren land": [cover_row[f"barrenlands_area_{y}"] for y in YEARS],
        "Cropland": [cover_row[f"cropland_area_{y}"] for y in YEARS]
    }, index=crop_area.index)
    cover_area
    ''')
section(cells,'Plot the land-cover areas','Each line follows one published land-cover class. Cropping-category areas remain in the table above.', '''
    cover_area.plot(marker="o", figsize=(10, 4), ylabel="Area (ha)", xlabel="Year")
    plt.legend(bbox_to_anchor=(1, 1))
    plt.tight_layout()
    plt.show()
    ''')
api_setup(cells);api_tehsil(cells)
section(cells,'Cropping areas from the API','The API table is named `croppingIntensity_annual`. Its area fields include `in_ha` and the full year range.', '''
    api_crop_rows = pd.DataFrame(api_data["croppingIntensity_annual"])
    api_crop_row = api_crop_rows.loc[api_crop_rows["uid"] == mws_id].reset_index(drop=True).reindex([0]).iloc[0]
    api_crop_area = pd.DataFrame({
        "Single Kharif": [api_crop_row[f"single_kharif_cropped_area_in_ha_{y}-{y+1}"] for y in YEARS],
        "Single non-Kharif": [api_crop_row[f"single_non_kharif_cropped_area_in_ha_{y}-{y+1}"] for y in YEARS],
        "Double cropping": [api_crop_row[f"doubly_cropped_area_in_ha_{y}-{y+1}"] for y in YEARS],
        "Triple cropping": [api_crop_row[f"triply_cropped_area_in_ha_{y}-{y+1}"] for y in YEARS]
    }, index=crop_area.index)
    api_crop_area
    ''')
section(cells,'Land-cover areas from the API','Read the corresponding hectare fields in `lulc_vector`.', '''
    api_cover_rows = pd.DataFrame(api_data["lulc_vector"])
    api_cover_row = api_cover_rows.loc[api_cover_rows["uid"] == mws_id].reset_index(drop=True).reindex([0]).iloc[0]
    api_cover_area = pd.DataFrame({
        "Built-up": [api_cover_row[f"built-up_area_in_ha_{y}"] for y in YEARS],
        "Trees and forest": [api_cover_row[f"tree_forest_area_in_ha_{y}"] for y in YEARS],
        "Shrubs and scrub": [api_cover_row[f"shrub_scrub_area_in_ha_{y}"] for y in YEARS],
        "Barren land": [api_cover_row[f"barrenlands_area_in_ha_{y}"] for y in YEARS],
        "Cropland": [api_cover_row[f"cropland_area_in_ha_{y}"] for y in YEARS]
    }, index=crop_area.index)
    api_cover_area
    ''')
finish(entry,cells)

# 6. Village
entry, cells = begin(6, 'know-your-village', 'Know Your Village', 'Explore population, services, livestock, village survey records and nearby micro-watersheds.')
sources(cells, [('facilities','facilities'),('population','demographics'),('livestock','livestock'),('survey','antyodaya'),('mws','mws')])
read(cells,'facilities','Read village services','The facilities layer contains village names, identifiers and distances in kilometres.')
section(cells,'Choose a village','Choose from the village name and identifier list. Replace `village_id` to explore another village.', '''
    villages = facilities[["village_name", "village_id"]].dropna(subset=["village_id"]).sort_values("village_id")
    display(villages)
    village_id = int(villages.iloc[0]["village_id"])
    village_services = facilities.loc[facilities["village_id"] == village_id].iloc[0]
    village_id
    ''')
read(cells,'population','Read population and literacy','The census layer uses `vill_ID` for the village identifier. Population and literacy fields below are counts of people.')
section(cells,'Population and literacy','Read the total population, Scheduled Caste and Scheduled Tribe counts, and recorded literacy counts.', '''
    selected_village = population.loc[population["vill_ID"] == village_id]
    population_fields = {"TOT_P": "Population", "TOT_M": "Male population", "TOT_F": "Female population",
                         "P_SC": "Scheduled Caste population", "P_ST": "Scheduled Tribe population",
                         "P_LIT": "Literate people", "M_LIT": "Literate men", "F_LIT": "Literate women", "P_ILL": "Illiterate people"}
    selected_village[list(population_fields)].rename(columns=population_fields).T
    ''')
service_names = {'essential_education':'Essential education','higher_education':'Higher education','essential_health':'Essential health','advanced_health':'Advanced health','essential_services':'Essential services','financial_inclusion':'Financial services','apmc_access':'Agricultural markets','post_harvest':'Post-harvest services','cooperative':'Cooperatives','livestock':'Livestock services','agri_support_infra':'Agricultural support infrastructure'}
service_fields = {f'l2_{k}_distance_km':v for k,v in service_names.items()}
section(cells,'Distances to services','These are the recorded service distances in kilometres.', f'service_fields = {pformat(service_fields, width=88, sort_dicts=False)}\nservice_distances = village_services[list(service_fields)].rename(index=service_fields).astype(float)\nservice_distances.to_frame("Distance (km)")')
section(cells,'Compare service distances','Longer bars indicate services farther from the village.', 'service_distances.plot.barh(figsize=(9, 5), xlabel="Distance (km)")\nplt.tight_layout()\nplt.show()')
read(cells,'livestock','Read livestock counts','The livestock layer uses the same `village_id`.')
section(cells,'Livestock in the village','Compare the recorded counts for the main animal groups.', '''
    village_livestock = livestock.loc[livestock["village_id"] == village_id]
    livestock_fields = {"all_livestock_total": "All livestock", "cattle_total": "Cattle", "buffalo_total": "Buffalo",
                        "sheep_total": "Sheep", "goat_total": "Goats", "pig_total": "Pigs"}
    village_livestock[list(livestock_fields)].rename(columns=livestock_fields).T
    ''')
read(cells,'survey','Read Mission Antyodaya records','Mission Antyodaya records describe village facilities and livelihoods. The following tables pair category values with the original survey fields. Survey answers retain their published values.')
section(cells,'Select the village survey','Use the same village identifier to read its survey record.', 'village_survey = survey.loc[survey["village_id"] == village_id].reset_index(drop=True).reindex([0]).iloc[0]\nvillage_survey[["village_name", "village_id"]]')
survey_reference = {group: {p['col']: p['label'] for p in params} for group, params in GROUPS.items()}
cells += [md('## Survey field reference\n\nThis collapsed reference pairs each survey group with its original fields and question labels. Run it once, then choose a group below.'),
          code('survey_groups = ' + pformat(survey_reference, width=100, sort_dicts=False), True)]
section(cells, 'Choose a survey group', 'The list shows the available groups and their category values. Change `survey_group` to another name in the list, such as `energy_access`, `agriculture_land_cultivation` or `agricultural_markets`, then rerun the next cells.', '''
    group_list = pd.DataFrame({"Group": list(survey_groups),
        "Category value": [village_survey[g + "_cat_value"] for g in survey_groups]})
    display(group_list)
    survey_group = "road_connectivity"
    ''')
section(cells, 'Read the category and original answers', 'This table keeps the exact source field, question label and answer together. The category summarises the group; the survey answers describe the recorded details.', '''
    fields = {survey_group + "_cat_value": "Category value",
              survey_group + "_cat_cluster": "Category group", **survey_groups[survey_group]}
    survey_answers = pd.DataFrame({"Field": list(fields), "Question": list(fields.values()),
        "Recorded answer": village_survey.reindex(list(fields)).values})
    with pd.option_context("display.max_colwidth", None):
        display(survey_answers)
    ''')
section(cells, 'Compare category values', 'The chart summarises the published categories. Use the group selector above to inspect their original survey answers.', '''
    group_list.set_index("Group")["Category value"].plot.barh(figsize=(10, 8), xlabel="Category value")
    plt.tight_layout()
    plt.show()
    ''')
section(cells, 'Explore agricultural services', 'Choose `agriculture_land_cultivation`, `agriculture_support_services` or `agricultural_markets` above to read their survey answers. Here are the service distances from the facilities layer.', '''
    service_distances.loc[["Agricultural markets", "Post-harvest services", "Agricultural support infrastructure"]].to_frame("Distance (km)")
    ''')
section(cells, 'Bring agricultural services and survey data together', 'Join on the village identifier. Then change `agriculture_columns` to inspect other fields listed in the survey reference or facilities table. Multiple source matches remain separate rows.', '''
    agriculture_columns = ["village_id", "agriculture_land_cultivation_cat_value", "agricultural_markets_cat_value"]
    market_columns = ["village_id", "l2_apmc_access_distance_km", "l2_agri_support_infra_distance_km"]
    agriculture = survey.loc[survey["village_id"] == village_id, agriculture_columns].merge(
        facilities.loc[facilities["village_id"] == village_id, market_columns], on="village_id", how="left")
    agriculture
    ''')
read(cells,'mws','Read micro-watersheds','Use the village boundary to find intersecting MWS. An intersection does not allocate village population or livestock to an MWS.')
section(cells,'Micro-watersheds linked to the village','List MWS whose geometry intersects the selected village boundary.', 'village_boundary = selected_village.geometry.union_all()\nmws.loc[mws.intersects(village_boundary), ["uid", "area_in_ha"]]')
api_setup(cells)
section(cells, 'Read village boundaries from the API', '`get_village_geometries` returns GeoJSON boundaries with `vill_ID` and `vill_name`. Read the tehsil once, then select the village used above.', '''
    response = requests.get(API_URL + "get_village_geometries/", params=place, headers=api_headers, timeout=90)
    response.raise_for_status()
    api_villages = gpd.GeoDataFrame.from_features(response.json()["features"], crs="EPSG:4326")
    display(api_villages[["vill_ID", "vill_name"]])
    api_village = api_villages.loc[api_villages["vill_ID"] == village_id]
    api_village.plot(figsize=(6, 6), edgecolor="black", color="#d7e9f5")
    plt.show()
    ''')
section(cells, 'Look up a place from coordinates', 'Take a point inside the village and ask `get_admin_details_by_latlon` for its administrative names. You can replace the latitude and longitude with another location.', '''
    point = selected_village.geometry.iloc[0].representative_point()
    coordinates = {"latitude": point.y, "longitude": point.x}
    response = requests.get(API_URL + "get_admin_details_by_latlon/", params=coordinates, headers=api_headers, timeout=90)
    response.raise_for_status()
    response.json()
    ''')

api_tehsil(cells)
section(cells, 'Read village records from the API', 'Choose `social_economic_indicator`, `facilities_proximity`, `livestock` or `antyodaya`. The same village identifier selects the record for each table.', "table_name = 'social_economic_indicator'\napi_village_table = pd.DataFrame(api_data[table_name])\napi_village_table.loc[api_village_table['village_id'] == village_id].T")
finish(entry,cells)
write(OUT / 'layers.json', json.dumps(LAYERS, ensure_ascii=False, indent=2) + '\n')
write(OUT / 'catalog.json', json.dumps(CATALOG, ensure_ascii=False, indent=2) + '\n')
write(ROOT / 'src/components/geolibre/notebookCatalogue.json', json.dumps(CATALOG, ensure_ascii=False, indent=2) + '\n')
print('Checked six notebooks.' if CHECK else 'Generated six notebooks.')
