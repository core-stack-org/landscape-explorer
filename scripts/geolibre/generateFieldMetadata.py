"""Build public GeoLibre field metadata from the local STAC column dictionary.

Only field names, descriptions and units are published. Source samples and
feature values remain in .local. Run from the Landscape Explorer repository:

    python3 scripts/geolibre/generateFieldMetadata.py
"""

import csv
import json
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / ".local/units/stac_vector_column_descriptions.csv"
OUTPUT = ROOT / "src/config/geolibreFieldMetadata.json"

SOURCES = {
    "admin_boundary", "facilities_proximity", "cs_antyodaya_2020",
    "cs_village_livestock_census_20", "well_depth_net_value",
    "filtered_delta_g_annual_uid", "filtered_delta_g_fortnight_uid",
    "terrain_clusters", "soil_type", "drainage_lines", "river_vector",
    "canal_vector", "swb3", "soge_vector", "aquifer_vector",
    "cropping_intensity_2017-23", "drought_2017_2022", "nrega_assets",
    "green_credits_vector", "land_conflict_watch_vector",
    "factory_csr_vector", "mining_vector", "soil_health_vector",
    "change_vector_Afforestation", "change_vector_Deforestation",
    "change_vector_Degradation", "change_vector_Urbanization",
    "change_vector_CropIntensity", "change_vector_ShrubChange",
    "restoration_vector", "lulc_vector", "tree_in_grassland", "forest_fringe",
}

# Resolve inconsistent older STAC descriptions against the actual generated
# data. The restoration and ShrubChange vector calculations sum pixel area in
# hectares (computing/local_compute_helper.py), not percentages.
UNIT_OVERRIDES = {
    ("canal_vector", "cn_purp"): "NA",
    ("canal_vector", "cn_st"): "NA",
    ("canal_vector", "prjcode"): "NA",
    ("canal_vector", "prjname"): "NA",
    ("canal_vector", "status_yr"): "year",
    ("river_vector", "bacode"): "NA",
    ("tree_in_grassland", "area_in_ha"): "ha",
    **{
        ("restoration_vector", field): "ha"
        for field in ("Excluded Areas", "Mosaic Restoration", "Protection", "Wide-scale Restoration")
    },
    **{
        ("change_vector_ShrubChange", field): "ha"
        for field in ("sh_sh", "sh_fa", "sh_tr", "sh_bu", "sh_wa", "sh_ba", "total_change")
    },
}

ALIASES = {
    "restoration_vector": {
        "Excluded A": "Excluded Areas",
        "Mosaic Res": "Mosaic Restoration",
        "Wide-scale": "Wide-scale Restoration",
    },
}


def main():
    if not SOURCE.is_file():
        raise SystemExit(f"Missing source column dictionary: {SOURCE}")
    grouped = defaultdict(lambda: defaultdict(list))
    with SOURCE.open(newline="", encoding="utf-8-sig") as file:
        for row in csv.DictReader(file):
            layer = row["ee_layer_name"]
            if layer in SOURCES:
                grouped[layer][row["column_name"]].append(row)

    catalog = {}
    for layer in sorted(SOURCES):
        fields = {}
        for field, rows in sorted(grouped[layer].items()):
            units = {row["units"] or "unknown" for row in rows}
            unit = UNIT_OVERRIDES.get((layer, field), units.pop() if len(units) == 1 else "unknown")
            description = next((row["column_name_description"].strip() for row in rows if row["column_name_description"].strip()), "")
            fields[field] = {"unit": unit, **({"description": description} if description else {})}
        for alias, original in ALIASES.get(layer, {}).items():
            if original in fields:
                fields[alias] = fields[original]
        catalog[layer] = fields

    # These are calculated or normalized in KYL and are absent from the raw
    # STAC dictionary. Their source field names remain unchanged.
    catalog["well_depth_net_value"]["avg_delta_g"] = {
        "unit": "mm", "description": "Mean annual DeltaG across readable year records"
    }
    catalog["filtered_delta_g_fortnight_uid"]["avg_delta_g"] = {
        "unit": "mm", "description": "Mean fortnightly DeltaG across readable date records"
    }
    catalog["soil_type"]["soil_texture_class"] = {
        "unit": "NA", "description": "Grouped soil texture class"
    }
    catalog["nrega_assets"]["WorkCatego"] = {
        "unit": "NA", "description": "NREGA work category"
    }
    catalog["ndvi_timeseries"] = {
        "avg_ndvi": {"unit": "dimensionless", "description": "Mean of available dated NDVI measurements"}
    }

    OUTPUT.write_text(json.dumps(catalog, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {sum(map(len, catalog.values()))} field definitions across {len(catalog)} source datasets to {OUTPUT}")


if __name__ == "__main__":
    main()
