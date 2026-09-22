"""Inspect GeoServer identities and published styles for proposed GeoLibre layers."""

from concurrent.futures import ThreadPoolExecutor
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


BASE = "https://geoserver.core-stack.org:8443/geoserver/wms"
TARGETS = (
    "ccd_raster_nalanda_hilsa_2023",
    "ch_raster_nalanda_hilsa_2019",
    "overall_change_raster_nalanda_hilsa",
    "distance_to_drainage_line_nalanda_hilsa_raster",
    "catchment_area_nalanda_hilsa_raster",
    "natural_depression_nalanda_hilsa_raster",
    "nalanda_hilsa_drought_causality",
    "nalanda_hilsa_tree_in_grassland",
    "nalanda_hilsa_forest_fringe",
)
SCOPES = ("nalanda_hilsa", "cachar_lakhipur", "banka_banka", "dumka_masalia")


def local(element):
    return element.tag.rsplit("}", 1)[-1]


def child_text(element, name):
    return next((part.text or "" for part in element if local(part) == name), "")


def request_xml(target, operation):
    query = urllib.parse.urlencode({
        "service": "WMS", "version": "1.1.1", "request": operation,
        "layers": target,
    })
    with urllib.request.urlopen(f"{BASE}?{query}", timeout=15) as response:
        return ET.parse(response).getroot()


def inspect(target):
    try:
        described = request_xml(target, "DescribeLayer")
        identity = next((item for item in described.iter() if local(item) == "LayerDescription"), None)
        if identity is None:
            return f"{target}\tNOT FOUND\t\t"
        styles = request_xml(target, "GetStyles")
        user_styles = [item for item in styles.iter() if local(item) == "UserStyle"]
        names = [child_text(item, "Name") for item in user_styles]
        titles = [child_text(item, "Title") for item in user_styles]
        return f"{target}\t{identity.get('name')}\t{identity.get('owsType')}\t{','.join(names) or '(none)'}\t{','.join(titles)}"
    except Exception as error:
        return f"{target}\tERROR {type(error).__name__}: {error}\t\t"


def main():
    names = [target.replace("nalanda_hilsa", scope) for scope in SCOPES for target in TARGETS]
    with ThreadPoolExecutor(max_workers=10) as pool:
        for result in pool.map(inspect, names):
            print(result)


if __name__ == "__main__":
    main()
