"""Check notebook structure and Python syntax without accessing data services."""
import ast
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
paths = sorted((root / 'public/geolibre-notebooks').glob('*.ipynb'))
assert len(paths) == 6
api_examples = set()
for path in paths:
    notebook = json.loads(path.read_text())
    assert notebook['nbformat'] == 4
    ids = [cell['id'] for cell in notebook['cells']]
    assert len(ids) == len(set(ids)), f'Duplicate cell identifiers: {path}'
    code_cells = [cell for cell in notebook['cells'] if cell['cell_type'] == 'code']
    location = [cell for cell in code_cells if 'corestack-location' in cell['metadata'].get('tags', [])]
    assert len(location) == 1 and not location[0]['metadata'].get('jupyter', {}).get('source_hidden')
    assignments = ast.parse(''.join(location[0]['source'])).body
    assert [node.targets[0].id for node in assignments] == ['state', 'district', 'tehsil']
    assert all(isinstance(node.value, ast.Constant) and isinstance(node.value.value, str) for node in assignments)
    sources = '\n'.join(''.join(cell['source']) for cell in code_cells)
    assert sources.count('API_URL + "get_tehsil_data/"') <= 1
    for node in ast.walk(ast.parse(sources)):
        if isinstance(node, ast.BinOp) and isinstance(node.left, ast.Name) and node.left.id == 'API_URL' and isinstance(node.right, ast.Constant):
            api_examples.add(node.right.value.strip('/'))
        if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == 'api_path' for target in node.targets) and isinstance(node.value, ast.Constant):
            api_examples.add(node.value.value.strip('/'))
    assert 'SCOPE =' not in sources and 'response.json()' not in sources
    for cell in code_cells:
        source = ''.join(cell['source'])
        compile(source, str(path), 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
        functions = [node.name for node in ast.walk(ast.parse(source)) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))]
        assert functions == (["read_json"] if "corestack-io" in cell["metadata"].get("tags", []) else [])
        assert "typeNames=" not in source and "typeName=" not in source and "GEOSERVER =" not in source
        assert not any(isinstance(node, ast.Attribute) and node.attr == 'rename' for node in ast.walk(ast.parse(source))), 'Keep source field names'
        assert not cell['outputs'] and cell['execution_count'] is None
    print(f'{path.name}: {len(code_cells)} code cells; structure and syntax checked')

expected_apis = {
    'get_active_locations', 'get_generated_layer_urls', 'get_tehsil_data',
    'get_mws_geometries', 'get_village_geometries', 'get_mws_data',
    'get_mws_kyl_indicators', 'get_mws_report', 'get_mwsid_by_latlon',
    'get_admin_details_by_latlon', 'get_waterbodies_data_by_admin', 'get_waterbody_data',
}
assert expected_apis <= api_examples, f'Missing API examples: {expected_apis - api_examples}'
print('All 12 public data APIs have request examples.')
