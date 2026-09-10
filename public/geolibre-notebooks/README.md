# Learn about CoRE Stack data

Six short, editable walkthroughs use the public APIs and STAC. Each notebook combines loading, a record preview and the first selection in one step. The analysis uses ordinary pandas, GeoPandas and Matplotlib code in visible cells. Imports, the small JSON reader and the village survey field reference are collapsed.

1. **Start** — discover APIs and required parameters from the public specification, inspect a response schema, make a configurable request, explore STAC, and save MWS GeoJSON and CSV.
2. **Know Your Micro-Watershed** — area, basin and elevation, terrain composition, a map of water connections, drainage, stream orders and related API records.
3. **See Water through the Years and Seasons** — aligned annual and seasonal charts, fortnightly water and NDVI, and groundwater context.
4. **Analyse Water Storage: Surface Waterbodies** — individual annual and seasonal water extent, total mapped annual area, and the waterbody API’s own inventory and property groups.
5. **Analyse Agriculture through Time** — cropping area and composition, land-cover trends and cropping intensity.
6. **Know Your Village** — population, a service-distance plot, livestock, one editable survey-topic example, boundaries and linked MWS.

## Open a notebook

Choose **Learn with Notebooks** in GeoLibre, download a notebook, then open **Processing → Jupyter Notebook → Upload Files**. Choose the Python (Pyodide) kernel if asked. Downloads use the selected tehsil. Standalone templates start with Hilsa, Nalanda, Bihar; edit `SCOPE`, restart the kernel and run from the top to change place.

For local JupyterLab, install `requests pandas geopandas matplotlib ipython`. Each notebook reuses `CORE_STACK_API_KEY` from the kernel environment or asks for it privately with `getpass`. The setup supports synchronous and awaitable input. The [public API guide](https://docs.core-stack.org/use-precomputed-data/public-apis/) explains registration and API keys. A frontend `.env` file is not automatically available in a notebook kernel.

## Data and descriptions

`get_tehsil_data` supplies the analytical tables; geometry and time-series APIs supply the relevant boundaries and dated records. Notebook 1 reads the GET API catalogue and parameters from [the public OpenAPI document](https://geoserver.core-stack.org/?format=openapi). The human-readable specification is at [api-doc.core-stack.org](https://api-doc.core-stack.org).

STAC supplies dataset discovery, descriptions, field documentation and asset links. The notebooks follow item links from the selected tehsil collection and resolve relative URLs. Notebook 4 opens the GeoJSON asset published by its STAC item. That asset may be hosted on GeoServer; no notebook constructs WFS URLs or maintains a separate GeoServer layer catalogue. API field names can differ from STAC asset fields.

The two waterbody request paths are `get_waterbodies_data_by_admin/` and `get_waterbody_data/`. Both require state, district and tehsil; the second also requires `uid`. Its identifier is selected from the API inventory, independently of STAC asset identifiers.

## Read the charts

- Water values are millimetres. Annual and seasonal panels share a scale within each measure. Fortnightly NDVI uses its own unitless axis and the dates returned by the API.
- Waterbody `area_YY-YY` and `area_ored` values are hectares. Seasonal `k_`, `kr_` and `krz_` percentages use `area_ored` as their reference footprint. The total-area chart sums feature areas and includes a count of records with values for each year. It does not measure water volume.
- Cropping API areas are already hectares. Shares divide the four categories by their sum. Incomplete years are omitted from stacked charts and identified below them. Fallow area is shown only when explicitly supplied.
- Service distances are kilometres. Distance fields alone do not supply compass bearings. Missing distances are omitted from the plot and remain blank in the table.
- Mission Antyodaya questions and headings follow the village report mappings in `village-groups.json`. Category values accompany original survey answers.

`read_json(response)` reads the response text, handles a byte-order mark and JSON-encoded documents, and converts bare `NaN` and `Infinity` tokens to missing values without changing text containing those words. It raises HTTP or parsing errors rather than replacing failures with empty data. The original `response.text` remains available. Optional report and coordinate lookups display unsuccessful HTTP responses explicitly.

## Browser access

Browser kernels are subject to the API and asset hosts’ CORS settings. For embedded GeoLibre notebooks the origin is `https://web.geolibre.app`, even when the parent explorer runs on localhost. The API backend must allow that origin and the `X-API-Key` header; frontend settings cannot grant that access. Local JupyterLab with a standard Python kernel is not subject to browser CORS. These notebooks do not change server settings.

## Update and check

Edit `scripts/notebooks/generate.py`. `scripts/notebooks/response.py` supplies the small response reader embedded in every notebook.

```sh
npm run notebooks:generate
npm run notebooks:check
python3 scripts/notebooks/validate.py
python3 scripts/notebooks/test_response.py
```

The checks validate generated content, structure, syntax and JSON handling without downloading data. To execute a template locally after setting your key:

```sh
jupyter nbconvert --execute --to notebook --output-dir=.local/notebook-runs public/geolibre-notebooks/01_start.ipynb
```

Keep executed outputs, credentials and downloaded data outside the public templates. Coverage can vary by location and dataset.
