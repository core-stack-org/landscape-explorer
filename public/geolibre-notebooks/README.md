# Learn about CoRE Stack data

Six short, editable walkthroughs use the public APIs and STAC. Each notebook combines loading, a record preview and the first selection in one step. The analysis uses ordinary pandas, GeoPandas and Matplotlib code in visible cells. Imports, the small JSON reader and the village survey field reference are collapsed.

1. **Start** — list all public APIs and required parameters, inspect a schema, make a configurable request, explore STAC and save MWS data.
2. **Know Your Micro-Watershed** — terrain composition and water connections, with table choices for elevation, drainage and related records; use indicator, report and coordinate APIs.
3. **See Water through the Years and Seasons** — one annual/seasonal water measure and one pair of fortnightly water/NDVI fields; change variables for the other measures.
4. **Analyse Water Storage: Surface Waterbodies** — one annual or seasonal area series and one dated API property; choose fields or property groups to explore further.
5. **Analyse Agriculture through Time** — one cropping category through time and a land-cover comparison; change category, year or columns.
6. **Know Your Village** — population, selected service distances, one survey group, village geometry and administrative lookups; table choices cover the remaining village statistics.

## Open a notebook

Choose **Learn with Notebooks** in GeoLibre, download a notebook, then open **Processing → Jupyter Notebook → Upload Files**. Choose the Python (Pyodide) kernel if asked. Downloads use the selected tehsil. Standalone templates start with Hilsa, Nalanda, Bihar; edit the visible `state`, `district` and `tehsil` assignments, restart the kernel and run from the top to change place. The downloaded assignments contain the selected tehsil, without encoded JSON or map bounds.

For local JupyterLab, install `requests pandas geopandas matplotlib ipython`. Each notebook reuses `CORE_STACK_API_KEY` from the kernel environment or asks for it privately with `getpass`. The setup supports synchronous and awaitable input. The [public API guide](https://docs.core-stack.org/use-precomputed-data/public-apis/) explains registration and API keys. A frontend `.env` file is not automatically available in a notebook kernel.

## Data and descriptions

`get_tehsil_data` supplies the analytical tables; geometry and time-series APIs supply the relevant boundaries and dated records. Notebook 1 reads the GET API catalogue and parameters from [the public OpenAPI document](https://geoserver.core-stack.org/?format=openapi). The human-readable specification is at [api-doc.core-stack.org](https://api-doc.core-stack.org).

STAC supplies dataset discovery, descriptions, field documentation and asset links. The notebooks follow item links from the selected tehsil collection and resolve relative URLs. Notebook 4 opens the GeoJSON asset published by its STAC item. That asset may be hosted on GeoServer; no notebook constructs WFS URLs or maintains a separate GeoServer layer catalogue. API field names can differ from STAC asset fields.

The two waterbody request paths are `get_waterbodies_data_by_admin/` and `get_waterbody_data/`. Both require state, district and tehsil; the second also requires `uid`. Its identifier is selected from the API inventory, independently of STAC asset identifiers.

## Explore other fields

Each topic has one or two worked visual examples, followed by variable choices for related data. Original field names remain in tables, indexes and chart labels. Descriptions, STAC field references and calculated values are added as separate columns. STAC descriptions are joined only where fields correspond; an API field is not silently renamed to an asset field.

`get_tehsil_data` currently accepts location parameters, with no table or field filter. It is called once per standalone notebook. Select another table using `pd.DataFrame(api_data[table_name])` and then its columns; this reuses the response already in memory. The MWS time-series and individual waterbody APIs accept identifiers for narrower requests. Separate notebook kernels do not share downloaded data.

Water fields are millimetres; NDVI is unitless and uses a separate axis. Waterbody `area_YY-YY` and `area_ored` are hectares; seasonal percentages are multiplied by the `area_ored` footprint. Cropping API areas are already hectares. Service distances are kilometres, without compass bearings. Missing values remain missing, including years that are absent from the source.

Survey fields retain their API names, with the village report's question descriptions beside them. Plot fields with the same unit, and keep category values separate from the original survey answers.

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
python3 scripts/notebooks/test_views.py
```

The checks validate generated content, structure, syntax, JSON handling, unchanged field names and selected chart calculations without downloading data. To execute a template locally after setting your key:

```sh
jupyter nbconvert --execute --to notebook --output-dir=.local/notebook-runs public/geolibre-notebooks/01_start.ipynb
```

Keep executed outputs, credentials and downloaded data outside the public templates. Coverage can vary by location and dataset.
