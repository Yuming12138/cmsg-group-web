"""Small JSON content loader used by the presentation layer."""

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


CONTENT_ROOT = Path(__file__).resolve().parent.parent / "content"


@lru_cache(maxsize=None)
def load_content(name: str) -> dict[str, Any]:
    """Load one content document from ``content/<name>.json``.

    Keeping the loader strict makes missing or malformed content visible during
    development instead of silently producing a half-empty page.
    """

    if not name or Path(name).name != name or not name.endswith(".json"):
        raise ValueError("content names must be simple JSON filenames")
    path = CONTENT_ROOT / name
    if not path.is_file():
        raise FileNotFoundError(f"Missing content file: {path}")
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise TypeError(f"Content root must be an object: {path}")
    return data


def load_site() -> dict[str, Any]:
    return load_content("site.json")
