#!/usr/bin/env python3
"""Prepare the hero artwork: one flattened image, plus optional depth layers.

The hero ships as a single flattened image. The depth planes exist for
element-level motion and are only built on request:

    python3 scripts/build_hero_layers.py            # flat image only
    python3 scripts/build_hero_layers.py 1440 --layers   # also the depth planes

An overlay copy of the painting's strokes can only ever *ghost* when it moves —
the original strokes stay behind — so real motion needs the pixels themselves
separated: the fine strokes are cut out of the canvas and inpainted away, leaving
a clean ground, and those stroke pixels are written onto a mid and a front plane.
The planes align exactly at rest, so with no motion the composition is unchanged.
Heavy structure (thick bars, the big rings) deliberately stays in the ground:
cutting it would smear the canvas where it crosses colour boundaries.

Outputs land in ``static/site/hero/`` as content-hashed WebP files plus
``layers.json``. Update the ``--hero-art`` (and, when used, ``--hero-mid`` /
``--hero-front``) variables in ``static/site/css/tokens.css`` if the digest
changes.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import cv2
import numpy as np


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT_ROOT / "static" / "site" / "images" / "kandinsky-composition-viii.jpg"
MANIFEST = PROJECT_ROOT / "static" / "site" / "hero" / "composition-viii.json"
OUTPUT_DIR = PROJECT_ROOT / "static" / "site" / "hero"
DEFAULT_WIDTH = 1440
STROKE_MARGIN = 4        # px added around each stroke before cutting
FRONT_DEPTH = 0.8        # depth at or above which a stroke belongs to the front plane
MAX_LINE_THICKNESS = 9   # thicker bars stay in the ground: cutting them smears the canvas
MAX_CIRCLE_RADIUS = 150  # the big rings are structural, not foreground ink
ART_QUALITY = 80
GROUND_QUALITY = 78
LAYER_QUALITY = 72


def output_url(path: Path) -> str:
    return "/" + path.relative_to(PROJECT_ROOT).as_posix()


def is_layer_stroke(element: dict) -> bool:
    """Only fine ink travels between planes; heavy structure stays with the ground."""

    if element["type"] == "line":
        return element.get("thickness", 4) <= MAX_LINE_THICKNESS
    if element["type"] == "circle":
        return element["r"] <= MAX_CIRCLE_RADIUS
    return True


def stroke_width(element: dict) -> int:
    if element["type"] == "line":
        return element.get("thickness", 4)
    if element["type"] == "circle":
        return 6
    return 4


def draw_element(mask: np.ndarray, element: dict, scale: float) -> None:
    """Rasterise one manifest element onto the stroke mask."""

    thickness = max(2, int(round((stroke_width(element) + STROKE_MARGIN * 2) * scale)))
    if element["type"] == "line":
        start = (int(round(element["x1"] * scale)), int(round(element["y1"] * scale)))
        end = (int(round(element["x2"] * scale)), int(round(element["y2"] * scale)))
        cv2.line(mask, start, end, 255, thickness, cv2.LINE_AA)
    elif element["type"] == "circle":
        centre = (int(round(element["cx"] * scale)), int(round(element["cy"] * scale)))
        cv2.circle(mask, centre, max(1, int(round(element["r"] * scale))), 255, thickness, cv2.LINE_AA)
    elif element["type"] in ("path", "polygon"):
        points = np.array(
            [[int(round(x * scale)), int(round(y * scale))] for x, y in element["points"]],
            dtype=np.int32,
        )
        cv2.polylines(mask, [points], element["type"] == "polygon", 255, thickness, cv2.LINE_AA)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    with_layers = "--layers" in sys.argv
    target_width = int(args[0]) if args else DEFAULT_WIDTH

    image = cv2.imread(str(SOURCE))
    if image is None:
        raise SystemExit(f"Cannot read {SOURCE}")
    source_height, source_width = image.shape[:2]
    scale = target_width / source_width
    frame = cv2.resize(
        image, (target_width, int(round(source_height * scale))), interpolation=cv2.INTER_AREA
    )
    height, width = frame.shape[:2]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(
        MANIFEST.read_bytes() + str(target_width).encode("ascii")
    ).hexdigest()[:10]

    manifest: dict[str, object] = {"width": width, "height": height, "digest": digest}

    art_path = OUTPUT_DIR / f"art-{digest}-{width}.webp"
    cv2.imwrite(str(art_path), frame, [cv2.IMWRITE_WEBP_QUALITY, ART_QUALITY])
    manifest["art"] = output_url(art_path)
    total = art_path.stat().st_size

    if with_layers:
        definition = json.loads(MANIFEST.read_text(encoding="utf-8"))
        strokes = [
            element
            for element in definition["elements"]
            if element["type"] in ("line", "circle", "path", "polygon") and is_layer_stroke(element)
        ]

        mid_mask = np.zeros((height, width), np.uint8)
        front_mask = np.zeros((height, width), np.uint8)
        for element in strokes:
            target = front_mask if element["depth"] >= FRONT_DEPTH else mid_mask
            draw_element(target, element, scale)

        # soften the cut so the layers keep their anti-aliased edges
        softness = max(1, int(round(2 * scale)))
        for mask in (mid_mask, front_mask):
            cv2.GaussianBlur(mask, (softness * 2 + 1, softness * 2 + 1), 0, dst=mask)

        solid = (cv2.bitwise_or(mid_mask, front_mask) > 40).astype(np.uint8) * 255
        solid = cv2.dilate(solid, np.ones((3, 3), np.uint8), iterations=1)
        ground = cv2.inpaint(frame, solid, 5, cv2.INPAINT_TELEA)

        ground_path = OUTPUT_DIR / f"ground-{digest}-{width}.webp"
        cv2.imwrite(str(ground_path), ground, [cv2.IMWRITE_WEBP_QUALITY, GROUND_QUALITY])
        manifest["ground"] = output_url(ground_path)
        total += ground_path.stat().st_size

        for name, mask in (("mid", mid_mask), ("front", front_mask)):
            layer = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
            layer[:, :, 3] = mask
            layer_path = OUTPUT_DIR / f"{name}-{digest}-{width}.webp"
            cv2.imwrite(str(layer_path), layer, [cv2.IMWRITE_WEBP_QUALITY, LAYER_QUALITY])
            manifest[name] = output_url(layer_path)
            total += layer_path.stat().st_size

        print(
            "stroke coverage: "
            f"mid {(mid_mask > 40).sum() / (width * height) * 100:.2f}% · "
            f"front {(front_mask > 40).sum() / (width * height) * 100:.2f}%"
        )

    (OUTPUT_DIR / "layers.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f"frame {width}x{height} · total {total / 1024:.0f} KiB")


if __name__ == "__main__":
    main()
