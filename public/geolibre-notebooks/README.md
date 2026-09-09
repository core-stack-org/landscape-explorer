# Learn about CoRE Stack data

Run each notebook from top to bottom. The setup is collapsed; the data reads, selections, tables and charts are visible and editable. Each notebook uses ordinary requests, GeoPandas, pandas and Matplotlib code.

1. **Start** — list layers, read a vector table, save GeoJSON and CSV, explore STAC metadata and make an API request.
2. **Know Your Micro-Watershed** — area, basin details, elevation, terrain, water connections and drainage.
3. **See Water through the Years and Seasons** — annual and seasonal water values, fortnightly water and NDVI, groundwater and aquifers.
4. **Analyse Water Storage: Surface Waterbodies** — identifiers, annual and seasonal areas, and total annual waterbody area.
5. **Analyse Agriculture through Time** — cropping areas, hectare shares and broader land-cover classes.
6. **Know Your Village** — population, services, livestock, Mission Antyodaya survey groups, agriculture and linked micro-watersheds.

## Open a notebook

In GeoLibre, choose **Learn with Notebooks**, download a notebook, then open **Processing → Jupyter Notebook → Upload Files**. Select the Python (Pyodide) kernel if asked. Downloads use the selected tehsil; the standalone templates start with Hilsa, Nalanda, Bihar.

For JupyterLab, install requests, pandas, GeoPandas, Matplotlib and IPython. API cells read `CORE_STACK_API_KEY` from the environment or ask for it with `getpass`. GeoServer and STAC reads do not need the API key.

## Data and field descriptions

The GeoServer list comes from `src/config/geolibreLayers.js`, with the additional vector summaries and NDVI layers listed in `scripts/notebooks/manifest.mjs`. `layers.json` records the complete list. URLs use the selected district and tehsil names.

Relevant notebooks display selected STAC `table:columns` descriptions alongside the data. The walkthroughs use the actual GeoJSON field names, including their case and year suffixes. Blank values remain blank.

Water values are in millimetres. Seasonal water sums group fortnight starts within each July–June year. Waterbody areas are hectares; seasonal percentages use `area_ored` as their reference footprint. Cropping shares divide each category by the sum of the four recorded cropping categories. Village survey headings and original question labels follow the village report mappings in `village-groups.json`.

## Update the notebooks

Edit `scripts/notebooks/generate.py`, then run:

```sh
npm run notebooks:generate
npm run notebooks:check
python3 scripts/notebooks/validate.py
```

The final command checks structure and Python syntax without calling data services. Generated notebooks contain no execution outputs or saved credentials.

## Browser API access

Browser notebooks make requests from their notebook host. For the embedded GeoLibre host this is `https://web.geolibre.app`, even when Landscape Explorer itself runs on localhost. The API server must allow that origin, the GET method and the `X-API-Key` request header. CORS is configured in the backend's `nrm_app/settings.py`; frontend settings cannot grant access to the API.

The backend includes `https://web.geolibre.app` in its production origins. Add other notebook deployments as exact origins in the backend's `CORS_ALLOWED_ORIGINS` environment variable, preserving existing entries. Deploy/restart the backend after changing its settings. A custom notebook host must be listed by its own origin, not just the parent map application's URL.

Until the backend change is deployed, the API examples can run in local JupyterLab with a standard Python kernel, whose requests are not subject to browser CORS. The API key cell supports both synchronous `getpass` and browser kernels returning awaitable input, and trims whitespace before constructing the header. A local frontend `.env` file is not automatically available inside browser Python.
