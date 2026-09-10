"""Check the published notebook cells against small, explicit API/asset records.

Run with pandas and matplotlib installed. No network, private samples or keys.
"""
import json
from pathlib import Path
import unittest
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]


def source_for(filename, marker):
    notebook = json.loads((ROOT / 'public/geolibre-notebooks' / filename).read_text())
    cells = [''.join(cell['source']) for cell in notebook['cells'] if cell['cell_type'] == 'code']
    matches = [source for source in cells if marker in source]
    assert len(matches) == 1
    return matches[0]


class ViewTests(unittest.TestCase):
    def tearDown(self):
        plt.close('all')

    def environment(self, **values):
        return {'pd': pd, 'plt': plt, 'display': lambda *args: None, 'YEARS': list(range(2017, 2025)), **values}

    def test_waterbody_keeps_raw_percent_and_uses_hectare_footprint(self):
        source = source_for('04_surface_waterbodies.ipynb', 'prefix = "area"')
        values = pd.Series({'area_ored': 2.0, 'area_17-18': 1.5, 'k_17-18': 50.0})
        notes = pd.DataFrame([{'name': 'k_17-18', 'type': 'float64', 'description': 'Seasonal percentage'}])
        env = self.environment(waterbody=values, waterbody_id='example', field_notes=notes)
        exec(source, env)
        self.assertEqual(env['extent'].loc['area_17-18', 'area_in_ha'], 1.5)
        exec(source.replace('prefix = "area"', 'prefix = "k"'), env)
        self.assertEqual(env['extent'].loc['k_17-18', 'value'], 50.0)
        self.assertEqual(env['extent'].loc['k_17-18', 'area_in_ha'], 1.0)
        self.assertEqual(env['extent'].loc['k_17-18', 'description'], 'Seasonal percentage')
        self.assertTrue(pd.isna(env['extent'].loc['k_24-25', 'value']))

    def test_service_fields_keep_zero_and_missing_distinct(self):
        source = source_for('06_know_your_village.ipynb', 'categories = ["essential_education"')
        env = self.environment(village_id='42', api_data={'facilities_proximity': [
            {'village_id': 42, 'essential_education_cat_distance_in_km': 0,
             'essential_education_facility_label': 'School', 'essential_health_cat_distance_in_km': 2.5}
        ]})
        exec(source, env)
        distances = env['distances']
        self.assertEqual(distances.loc['essential_education_cat_distance_in_km', 'value'], 0)
        self.assertEqual(distances.loc['essential_health_cat_distance_in_km', 'value'], 2.5)
        self.assertTrue(pd.isna(distances.loc['apmc_markets_cat_distance_in_km', 'value']))
        self.assertEqual(len(env['available']), 2)


if __name__ == '__main__':
    unittest.main()
