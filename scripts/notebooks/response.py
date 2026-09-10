"""Small response reader embedded in the notebooks' collapsed setup cell."""
import json


def read_json(response):
    """Read JSON text; represent non-standard NaN/Infinity values as missing."""
    response.raise_for_status()
    raw_text = response.text.lstrip("\ufeff")
    try:
        # Some API tables contain bare NaN or Infinity, which are not JSON numbers.
        data = json.loads(raw_text, parse_constant=lambda value: None)
        # Also accept a JSON document returned as a JSON-encoded string.
        if isinstance(data, str):
            data = json.loads(data.lstrip("\ufeff"), parse_constant=lambda value: None)
        return data
    except ValueError as error:
        raise ValueError(
            "The server response is not readable JSON. "
            "Inspect response.status_code and response.text[:500], then retry the request."
        ) from error
