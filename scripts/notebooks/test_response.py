"""Regression checks for API and STAC JSON decoding; no network or credentials."""
import unittest
from unittest.mock import Mock
from response import read_json


class ResponseTests(unittest.TestCase):
    def response(self, text):
        return Mock(text=text)

    def test_plain_json_and_bom(self):
        self.assertEqual(read_json(self.response('\ufeff{"uid": "12_34"}')), {"uid": "12_34"})

    def test_non_standard_numbers_become_missing(self):
        self.assertEqual(read_json(self.response('[NaN, Infinity, -Infinity, 0]')), [None, None, None, 0])
        self.assertEqual(read_json(self.response('{"name": "NaN"}')), {"name": "NaN"})

    def test_json_encoded_document(self):
        self.assertEqual(read_json(self.response('"{\\"value\\": NaN}"')), {"value": None})

    def test_malformed_data_is_not_silently_replaced(self):
        for text in ['<html>Error</html>', '', '{"a": invalid}', 'prefix {"a": 1}']:
            with self.subTest(text=text), self.assertRaisesRegex(ValueError, 'not readable JSON'):
                read_json(self.response(text))

    def test_http_failure_is_preserved(self):
        response = self.response('{"detail": "Not found"}')
        response.raise_for_status.side_effect = RuntimeError('HTTP 404')
        with self.assertRaisesRegex(RuntimeError, 'HTTP 404'):
            read_json(response)


if __name__ == '__main__':
    unittest.main()
