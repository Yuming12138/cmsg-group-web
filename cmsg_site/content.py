"""Small JSON content loader used by the presentation layer."""

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


CONTENT_ROOT = Path(__file__).resolve().parent.parent / "content"
SUPPORTED_LANGUAGES = ("en", "zh")


def _merge_content(base: Any, localized: Any) -> Any:
    """Merge a partial locale document onto the English source document."""

    if isinstance(base, dict) and isinstance(localized, dict):
        merged = dict(base)
        for key, value in localized.items():
            merged[key] = _merge_content(merged[key], value) if key in merged else value
        return merged
    if isinstance(base, list) and isinstance(localized, list):
        merged = list(base)
        for index, value in enumerate(localized):
            merged[index] = _merge_content(merged[index], value) if index < len(merged) else value
        return merged
    return localized


@lru_cache(maxsize=None)
def load_content(name: str, language: str = "en") -> dict[str, Any]:
    """Load one content document from ``content/<name>.json``.

    Keeping the loader strict makes missing or malformed content visible during
    development instead of silently producing a half-empty page.
    """

    if not name or Path(name).name != name or not name.endswith(".json"):
        raise ValueError("content names must be simple JSON filenames")
    if language not in SUPPORTED_LANGUAGES:
        raise ValueError(f"unsupported language: {language}")
    path = CONTENT_ROOT / name
    if not path.is_file():
        raise FileNotFoundError(f"Missing content file: {path}")
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise TypeError(f"Content root must be an object: {path}")
    if language == "en":
        return data
    localized_path = CONTENT_ROOT / language / name
    if not localized_path.is_file():
        return data
    with localized_path.open("r", encoding="utf-8") as handle:
        localized = json.load(handle)
    if not isinstance(localized, dict):
        raise TypeError(f"Localized content root must be an object: {localized_path}")
    return _merge_content(data, localized)


def load_site(language: str = "en") -> dict[str, Any]:
    return load_content("site.json", language)


def load_ui(language: str = "en") -> dict[str, Any]:
    return load_content("ui.json", language)
