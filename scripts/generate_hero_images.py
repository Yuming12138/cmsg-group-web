#!/usr/bin/env python3
"""Generate responsive, cache-safe hero artwork variants from the archival original."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageOps, features


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = PROJECT_ROOT / "static" / "site" / "images" / "kandinsky-composition-viii.jpg"
OUTPUT_DIR = PROJECT_ROOT / "static" / "site" / "images" / "hero"
WEB_WIDTHS = (960, 1440, 1920)


def output_url(path: Path) -> str:
    return "/" + path.relative_to(PROJECT_ROOT).as_posix()


def main() -> None:
    if not features.check("webp"):
        raise RuntimeError("This Pillow build does not support WebP")

    source_bytes = SOURCE_PATH.read_bytes()
    digest = hashlib.sha256(source_bytes).hexdigest()[:10]

    with Image.open(SOURCE_PATH) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        source_width, source_height = image.size
        widths = sorted({width for width in WEB_WIDTHS if width <= source_width} | {min(WEB_WIDTHS[-1], source_width)})

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        entries = []
        for width in widths:
            height = round(source_height * width / source_width)
            variant = image.resize((width, height), Image.Resampling.LANCZOS)
            variant_path = OUTPUT_DIR / f"{SOURCE_PATH.stem}-{digest}-{width}.webp"
            variant.save(variant_path, "WEBP", quality=82, method=6)
            entries.append((variant_path, width))
            print(f"webp {width}w: {output_url(variant_path)} ({variant_path.stat().st_size / 1024:.0f} KiB)")

        fallback_width = min(WEB_WIDTHS[-1], source_width)
        fallback_height = round(source_height * fallback_width / source_width)
        fallback = image.resize((fallback_width, fallback_height), Image.Resampling.LANCZOS)
        fallback_path = OUTPUT_DIR / f"{SOURCE_PATH.stem}-{digest}-{fallback_width}.jpg"
        fallback.save(
            fallback_path,
            "JPEG",
            quality=84,
            optimize=True,
            progressive=True,
            subsampling=2,
        )
        print(f"jpg  {fallback_width}w fallback: {output_url(fallback_path)} ({fallback_path.stat().st_size / 1024:.0f} KiB)")


if __name__ == "__main__":
    main()
