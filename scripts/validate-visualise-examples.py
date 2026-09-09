"""Run each standalone snippet against its sample and compare every plotted value."""
import contextlib
import io
import json
from pathlib import Path
import sys
from unittest.mock import patch
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd
import requests

folder = Path(sys.argv[1] if len(sys.argv) > 1 else '.local/visualise-validation')
for name in json.loads((folder / 'cases.json').read_text()):
    case = json.loads((folder / f'{name}.case.json').read_text())
    view, rows = case['view'], case['rows']
    class Response:
        def raise_for_status(self): pass
        def json(self): return case['sample']
    namespace = {}
    with patch.object(requests, 'get', return_value=Response()), contextlib.redirect_stdout(io.StringIO()):
        exec(compile((folder / f'{name}.py').read_text(), name, 'exec'), namespace)
    actual = namespace['df'].reset_index(drop=True)
    if view['kind'] == 'category':
        expected = pd.DataFrame({'value': [row['value'] for row in rows]})
    else:
        expected = pd.DataFrame({label: [row[field] for row in rows] for field,label in view['fields']})
    pd.testing.assert_frame_equal(actual, expected, check_dtype=False, check_exact=False, rtol=1e-10, atol=1e-10)
    assert plt.get_fignums(), f'No figure: {name}'
    plt.close('all')
    print(f'{name}: Python ran; {len(rows)} rows match JavaScript')
