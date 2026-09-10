#!/usr/bin/env python3
"""Prepare the hero artwork, and the two orbs that breathe on top of it.

The hero ships as one flattened image. On request it also emits the two solid
circles from the left of Composition VIII as separate layers:

    python3 scripts/build_hero_layers.py                  # flat image only
    python3 scripts/build_hero_layers.py 1440 --orbs      # + the two orb layers

Why the orbs are cut the way they are. Cutting the discs out of the canvas and
inpainting the holes was tried and rejected: any hole that big is answered by the
inpainting algorithm with a radial smear, which is plainly visible as a ghost
disc once the layer moves. So the ground keeps the painting untouched and each
orb layer is an *opaque copy* of its disc, fading out across the halo:

    |<-- solid -->|<---- halo fade ---->|
    0          1.06r                 1.60r

At rest the copy sits exactly on top of the original, so the composition is
unchanged pixel for pixel. When an orb scales up, its solid core still covers the
painted disc underneath (the core extends past the disc by 6% of the radius), so
nothing shows through — the disc simply breathes. Scaling up never reveals the
original, which is why the motion is a scale rather than a translation.

Outputs land in ``static/site/hero/`` as content-hashed WebP files plus
``layers.json``. Re-run the script after replacing the source artwork.
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
ORB_HALF = 0.45          # orbs are looked for on the left half of the canvas
ORB_MIN_RADIUS = 60      # ignore small dots
ORB_COUNT = 2            # the two solid circles the hero lets breathe
ORB_GROUP_RADIUS = 0.75  # a circle this close (x its own radius) rides the same orb
ORB_SOLID = 1.06         # opaque out to here: must exceed 1 so scaling cannot expose the disc
ORB_HALO = 1.60          # the layer has faded to nothing by here
ART_QUALITY = 80
GROUND_QUALITY = 78
ORB_QUALITY = 72


def output_url(path: Path) -> str:
    return "/" + path.relative_to(PROJECT_ROOT).as_posix()


def select_orbs(definition: dict, width: int) -> list[dict]:
    """Pick the solid circles that get to move, folding coincident ones together.

    The left pair in Composition VIII: the big ringed disc at the top and the
    yellow disc at the bottom. A smaller ring sharing a disc's centre counts as
    part of the same orb, otherwise the group would tear apart when it moves.
    """

    candidates = [
        element
        for element in definition["elements"]
        if element["type"] in ("disk", "circle")
        and element["cx"] < ORB_HALF * width
        and element["r"] >= ORB_MIN_RADIUS
    ]
    candidates.sort(key=lambda element: -element["r"])

    orbs: list[dict] = []
    for element in candidates:
        for orb in orbs:
            distance = ((orb["cx"] - element["cx"]) ** 2 + (orb["cy"] - element["cy"]) ** 2) ** 0.5
            if distance < ORB_GROUP_RADIUS * orb["r"]:
                orb["members"].append(element)
                orb["r"] = max(orb["r"], element["r"])
                break
        else:
            orbs.append(
                {
                    "cx": element["cx"],
                    "cy": element["cy"],
                    "r": element["r"],
                    "fill": element.get("fill") or element.get("stroke"),
                    "members": [element],
                }
            )

    # fold every candidate first, then keep the biggest groups
    orbs.sort(key=lambda orb: -orb["r"])
    return orbs[:ORB_COUNT]


def orb_alpha(shape: tuple[int, int], orb: dict, scale: float) -> np.ndarray:
    """Alpha for one orb: solid across the disc, fading out over the halo.

    The solid part has to reach past the painted disc, otherwise scaling the orb
    up would slide its edge inward and reveal the disc underneath.

    ``orb`` holds manifest coordinates (the 1800-wide extraction canvas), so the
    centre and radius are scaled to the output frame here.
    """

    height, width = shape
    centre_x = orb["cx"] * scale
    centre_y = orb["cy"] * scale
    radius = orb["r"] * scale
    ys, xs = np.mgrid[0:height, 0:width]
    distance = np.sqrt((xs - centre_x) ** 2 + (ys - centre_y) ** 2)
    inner = radius * ORB_SOLID
    outer = radius * ORB_HALO
    alpha = np.clip((outer - distance) / (outer - inner), 0.0, 1.0)
    # ease the ramp so the halo reads as a soft bloom rather than a cone
    alpha = alpha ** 1.6
    return (alpha * 255).astype(np.uint8)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    with_orbs = "--orbs" in sys.argv
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
        MANIFEST.read_bytes() + str(target_width).encode("ascii") + b"orbs-v2"
    ).hexdigest()[:10]

    manifest: dict[str, object] = {"width": width, "height": height, "digest": digest}

    # the flattened image is always useful: with orbs it is the ground they sit on
    art_path = OUTPUT_DIR / f"art-{digest}-{width}.webp"
    cv2.imwrite(str(art_path), frame, [cv2.IMWRITE_WEBP_QUALITY, ART_QUALITY])
    manifest["art"] = output_url(art_path)
    total = art_path.stat().st_size

    if with_orbs:
        definition = json.loads(MANIFEST.read_text(encoding="utf-8"))
        orbs = select_orbs(definition, width)

        for index, orb in enumerate(orbs, start=1):
            layer = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
            layer[:, :, 3] = orb_alpha((height, width), orb, scale)
            orb_path = OUTPUT_DIR / f"orb{index}-{digest}-{width}.webp"
            cv2.imwrite(str(orb_path), layer, [cv2.IMWRITE_WEBP_QUALITY, ORB_QUALITY])
            orb["image"] = output_url(orb_path)
            orb["cx_norm"] = round(orb["cx"] * scale / width, 4)
            orb["cy_norm"] = round(orb["cy"] * scale / height, 4)
            orb["r_norm"] = round(orb["r"] * scale / width, 4)
            orb["members"] = [member["id"] for member in orb["members"]]
            total += orb_path.stat().st_size
            print(
                f"orb{index}: centre ({orb['cx'] * scale:.0f},{orb['cy'] * scale:.0f}) "
                f"r={orb['r'] * scale:.0f} from {orb['members']} · "
                f"{orb_path.stat().st_size / 1024:.0f} KiB"
            )

        manifest["orbs"] = [
            {
                "image": orb["image"],
                "cx": orb["cx"],
                "cy": orb["cy"],
                "r": orb["r"],
                "cx_norm": orb["cx_norm"],
                "cy_norm": orb["cy_norm"],
                "r_norm": orb["r_norm"],
                "fill": orb["fill"],
                "members": orb["members"],
            }
            for orb in orbs
        ]

    (OUTPUT_DIR / "layers.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f"frame {width}x{height} · total {total / 1024:.0f} KiB")


if __name__ == "__main__":
    main()
