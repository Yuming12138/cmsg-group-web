#!/usr/bin/env python3
"""Generate cropped, responsive member portraits from archival source images."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps, features


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PEOPLE_PATH = PROJECT_ROOT / "content" / "people.json"
MANIFEST_PATH = PROJECT_ROOT / "content" / "people-images.json"
OUTPUT_DIR = PROJECT_ROOT / "static" / "site" / "images" / "members" / "web"
WEB_WIDTHS = (320, 640, 960)
PORTRAIT_RATIO = 4 / 5


def output_url(path: Path) -> str:
    return "/" + path.relative_to(PROJECT_ROOT).as_posix()


def available_crop_width(width: int, height: int) -> int:
    """Return the largest 4:5 crop width without upscaling the source."""

    return min(width, round(height * PORTRAIT_RATIO))


def to_rgb(image: Image.Image) -> Image.Image:
    """Flatten transparent portraits onto white instead of implicit black."""

    if image.mode in {"RGBA", "LA"} or "transparency" in image.info:
        rgba = image.convert("RGBA")
        canvas = Image.new("RGBA", rgba.size, "white")
        return Image.alpha_composite(canvas, rgba).convert("RGB")
    return image.convert("RGB")


def main() -> None:
    if not features.check("webp"):
        raise RuntimeError("This Pillow build does not support WebP")

    people = json.loads(PEOPLE_PATH.read_text(encoding="utf-8"))
    image_urls = list(
        dict.fromkeys(
            member["image"]
            for group in people.get("groups", [])
            for member in group.get("members", [])
            if member.get("image")
        )
    )
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, dict[str, object]] = {}
    original_bytes = 0
    generated_bytes = 0

    for image_url in image_urls:
        source = PROJECT_ROOT / image_url.lstrip("/")
        if not source.is_file():
            raise FileNotFoundError(f"Missing member image: {source}")

        source_bytes = source.read_bytes()
        original_bytes += len(source_bytes)
        digest = hashlib.sha256(source_bytes).hexdigest()[:10]

        with Image.open(source) as opened:
            image = to_rgb(ImageOps.exif_transpose(opened))
            maximum_width = available_crop_width(*image.size)
            widths = [width for width in WEB_WIDTHS if width < maximum_width]
            widths.append(min(WEB_WIDTHS[-1], maximum_width))
            widths = sorted(set(widths))

            srcset = []
            for width in widths:
                height = round(width / PORTRAIT_RATIO)
                portrait = ImageOps.fit(
                    image,
                    (width, height),
                    method=Image.Resampling.LANCZOS,
                    centering=(0.5, 0.0),
                )
                variant_path = OUTPUT_DIR / f"{source.stem}-{digest}-{width}.webp"
                portrait.save(variant_path, "WEBP", quality=80, method=6)
                generated_bytes += variant_path.stat().st_size
                srcset.append(f"{output_url(variant_path)} {width}w")

            fallback_width = widths[-1]
            fallback_height = round(fallback_width / PORTRAIT_RATIO)
            fallback = ImageOps.fit(
                image,
                (fallback_width, fallback_height),
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.0),
            )
            fallback_path = OUTPUT_DIR / (
                f"{source.stem}-{digest}-{fallback_width}.jpg"
            )
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

    MANIFEST_PATH.write_text(
        json.dumps({"images": manifest}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Generated {len(manifest)} member image sets: "
        f"{original_bytes / 1024 / 1024:.2f} MiB archival -> "
        f"{generated_bytes / 1024 / 1024:.2f} MiB across all responsive variants"
    )


if __name__ == "__main__":
    main()
