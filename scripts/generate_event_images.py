#!/usr/bin/env python3
"""Generate responsive, cache-safe event photos from the archival originals."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps, features


PROJECT_ROOT = Path(__file__).resolve().parents[1]
EVENTS_PATH = PROJECT_ROOT / "content" / "events.json"
MANIFEST_PATH = PROJECT_ROOT / "content" / "event-images.json"
OUTPUT_DIR = PROJECT_ROOT / "static" / "images" / "group" / "web"
WEB_WIDTHS = (480, 960, 1600)


def output_url(path: Path) -> str:
    return "/" + path.relative_to(PROJECT_ROOT).as_posix()


def resized_dimensions(width: int, height: int, target_width: int) -> tuple[int, int]:
    return target_width, round(height * target_width / width)


def main() -> None:
    if not features.check("webp"):
        raise RuntimeError("This Pillow build does not support WebP")

    events = json.loads(EVENTS_PATH.read_text(encoding="utf-8"))
    image_urls = list(
        dict.fromkeys(
            image
            for item in events.get("items", [])
            for image in item.get("images", [])
        )
    )
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, dict[str, object]] = {}
    original_bytes = 0
    generated_bytes = 0

    for image_url in image_urls:
        source = PROJECT_ROOT / image_url.lstrip("/")
        if not source.is_file():
            raise FileNotFoundError(f"Missing event image: {source}")

        source_bytes = source.read_bytes()
        original_bytes += len(source_bytes)
        digest = hashlib.sha256(source_bytes).hexdigest()[:10]

        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
            source_width, source_height = image.size
            widths = [width for width in WEB_WIDTHS if width < source_width]
            widths.append(min(WEB_WIDTHS[-1], source_width))
            widths = sorted(set(widths))

            srcset = []
            for width in widths:
                height = resized_dimensions(source_width, source_height, width)[1]
                variant = image.resize((width, height), Image.Resampling.LANCZOS)
                variant_path = OUTPUT_DIR / f"{source.stem}-{digest}-{width}.webp"
                variant.save(variant_path, "WEBP", quality=80, method=6)
                generated_bytes += variant_path.stat().st_size
                srcset.append(f"{output_url(variant_path)} {width}w")

            fallback_width = min(WEB_WIDTHS[-1], source_width)
            fallback_width, fallback_height = resized_dimensions(
                source_width, source_height, fallback_width
            )
            fallback = image.resize(
                (fallback_width, fallback_height), Image.Resampling.LANCZOS
            )
            fallback_path = OUTPUT_DIR / f"{source.stem}-{digest}-{fallback_width}.jpg"
            fallback.save(
                fallback_path,
                "JPEG",
                quality=82,
                optimize=True,
                progressive=True,
                subsampling=2,
            )
            generated_bytes += fallback_path.stat().st_size

        manifest[image_url] = {
            "fallback": output_url(fallback_path),
            "srcset": ", ".join(srcset),
            "width": fallback_width,
            "height": fallback_height,
        }

    document = {"images": manifest}
    MANIFEST_PATH.write_text(
        json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"Generated {len(manifest)} event image sets: "
        f"{original_bytes / 1024 / 1024:.2f} MiB archival -> "
        f"{generated_bytes / 1024 / 1024:.2f} MiB across all responsive variants"
    )


if __name__ == "__main__":
    main()
