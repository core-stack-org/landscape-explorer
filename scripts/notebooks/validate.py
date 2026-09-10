"""Check notebook structure and Python syntax without accessing data services."""
import ast
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
paths = sorted((root / 'public/geolibre-notebooks').glob('*.ipynb'))
assert len(paths) == 6
for path in paths:
    notebook = json.loads(path.read_text())
    assert notebook['nbformat'] == 4
    ids = [cell['id'] for cell in notebook['cells']]
    assert len(ids) == len(set(ids)), f'Duplicate cell identifiers: {path}'
    code_cells = [cell for cell in notebook['cells'] if cell['cell_type'] == 'code']
    for cell in code_cells:
        source = ''.join(cell['source'])
        compile(source, str(path), 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
        functions = [node.name for node in ast.walk(ast.parse(source)) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))]
        assert functions == (["read_json"] if "corestack-io" in cell["metadata"].get("tags", []) else [])
        assert "typeNames=" not in source and "typeName=" not in source and "GEOSERVER =" not in source
        assert not cell['outputs'] and cell['execution_count'] is None
    print(f'{path.name}: {len(code_cells)} code cells; structure and syntax checked')
