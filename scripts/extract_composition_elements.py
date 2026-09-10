#!/usr/bin/env python3
"""Extract the geometric vocabulary of the hero artwork into a JSON manifest.

The hero painting is a raster image, so element-level motion (parallax layers,
an "assembly" intro, per-element breathing) has no vector data to work with.
This script recovers it: circles, filled colour disks, straight strokes and long
curves are detected, validated against the edge map, given their ink/fill colour
and a heuristic depth, then written to ``static/site/hero/composition-viii.json``.

Geometry is stored twice — in source pixels (1800 x 1260) and normalised 0..1 —
so the runtime can scale it to any viewport without re-running the detector.

Usage:
    python3 scripts/extract_composition_elements.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import cv2
import numpy as np


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT_ROOT / "static" / "site" / "images" / "kandinsky-composition-viii.jpg"
OUTPUT = PROJECT_ROOT / "static" / "site" / "hero" / "composition-viii.json"

# A pale, low-frequency painting: beige ground with a handful of strong shapes.
CANNY_LOW, CANNY_HIGH = 60, 160
MIN_CIRCLE_SUPPORT = 0.55
MIN_CIRCLE_RADIUS = 32


def hex_colour(bgr: tuple[int, int, int]) -> str:
    blue, green, red = (int(value) for value in bgr)
    return f"#{red:02x}{green:02x}{blue:02x}"


def ink_colour(image: np.ndarray, points: np.ndarray) -> str:
    """Pick the ink colour along a stroke: the most saturated / darkest samples."""

    height, width = image.shape[:2]
    samples: list[tuple[float, tuple[int, int, int]]] = []
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    for x, y in points:
        xi, yi = int(round(x)), int(round(y))
        if not (2 <= xi < width - 2 and 2 <= yi < height - 2):
            continue
        window = hsv[yi - 2 : yi + 3, xi - 2 : xi + 3].reshape(-1, 3)
        window_bgr = image[yi - 2 : yi + 3, xi - 2 : xi + 3].reshape(-1, 3)
        # weight = saturation plus darkness, so ink wins over the beige ground
        weights = window[:, 1].astype(float) + (255 - window[:, 2].astype(float)) * 0.8
        best = int(np.argmax(weights))
        samples.append((weights[best], tuple(int(v) for v in window_bgr[best])))
    if not samples:
        return "#808080"
    samples.sort(key=lambda item: -item[0])
    keep = samples[: max(3, len(samples) // 3)]
    stacked = np.array([colour for _, colour in keep], dtype=float)
    return hex_colour(tuple(int(v) for v in np.median(stacked, axis=0)))


def ring_is_empty(image: np.ndarray, points: np.ndarray) -> bool:
    """True when the sampled ring lies on plain background rather than an outline.

    A drawn outline is uniformly *dark*, so uniformity alone proves nothing — it
    is uniform *and light* that means the circle was hallucinated over empty
    ground.
    """

    height, width = image.shape[:2]
    values = []
    for x, y in points:
        xi, yi = int(round(x)), int(round(y))
        if 2 <= xi < width - 2 and 2 <= yi < height - 2:
            values.append(image[yi, xi].astype(float))
    if len(values) < 8:
        return True
    stacked = np.array(values)
    spread = float(stacked.std(axis=0).mean())
    brightness = float(stacked.mean())
    return spread < 30 and brightness > 185


def circle_support(edges: np.ndarray, cx: float, cy: float, radius: float) -> float:
    """Fraction of the circumference that lands on (or beside) an edge.

    The painting is a photograph of a canvas, so outlines are soft and
    anti-aliased: without a one-pixel tolerance a genuinely drawn circle can
    score under 0.35, so the edge map is dilated before testing.
    """

    height, width = edges.shape[:2]
    count = max(64, int(2 * math.pi * radius / 3))
    angles = np.linspace(0, 2 * math.pi, count, endpoint=False)
    xs = np.round(cx + radius * np.cos(angles)).astype(int)
    ys = np.round(cy + radius * np.sin(angles)).astype(int)
    inside = (xs >= 0) & (xs < width) & (ys >= 0) & (ys < height)
    if inside.sum() < count * 0.6:
        return 0.0
    return float((edges[ys[inside], xs[inside]] > 0).mean())


def detect_circles(image: np.ndarray, edges: np.ndarray) -> list[dict]:
    grey = cv2.medianBlur(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), 5)
    soft = cv2.dilate(edges, np.ones((3, 3), np.uint8))
    found = cv2.HoughCircles(
        grey,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=70,
        param1=120,
        param2=58,
        minRadius=MIN_CIRCLE_RADIUS,
        maxRadius=600,
    )
    circles: list[dict] = []
    if found is None:
        return circles

    for cx, cy, radius in np.round(found[0]).astype(int):
        if cx - radius < -40 or cy - radius < -40 or cx + radius > image.shape[1] + 40 or cy + radius > image.shape[0] + 40:
            continue
        support = circle_support(soft, cx, cy, radius)
        if support < MIN_CIRCLE_SUPPORT:
            continue
        angles = np.linspace(0, 2 * math.pi, 48, endpoint=False)
        ring = np.column_stack([cx + radius * np.cos(angles), cy + radius * np.sin(angles)])
        if ring_is_empty(image, ring):
            continue  # uniform and pale: nothing was actually drawn here
        circles.append(
            {
                "type": "circle",
                "cx": int(cx),
                "cy": int(cy),
                "r": int(radius),
                "stroke": ink_colour(image, ring),
                "support": round(support, 3),
            }
        )

    circles.sort(key=lambda item: -item["r"])
    kept: list[dict] = []
    for candidate in circles:
        duplicate = False
        for other in kept:
            distance = math.hypot(candidate["cx"] - other["cx"], candidate["cy"] - other["cy"])
            if distance < 0.25 * max(candidate["r"], other["r"]) and abs(candidate["r"] - other["r"]) < 0.2 * other["r"]:
                duplicate = True
                break
        if not duplicate:
            kept.append(candidate)
    return kept


def detect_disks(image: np.ndarray) -> list[dict]:
    """Solid colour disks: the painting's filled circles, found by colour, not edges."""

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    mask = ((hsv[:, :, 1] > 70) | (hsv[:, :, 2] < 95)).astype(np.uint8) * 255
    kernel = np.ones((9, 9), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    disks: list[dict] = []
    height, width = image.shape[:2]
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 900:
            continue
        perimeter = cv2.arcLength(contour, True)
        if perimeter <= 0:
            continue
        circularity = 4 * math.pi * area / (perimeter * perimeter)
        (cx, cy), radius = cv2.minEnclosingCircle(contour)
        if circularity < 0.66 or radius < 16 or radius > 0.45 * min(width, height):
            continue
        if cx - radius < -30 or cy - radius < -30 or cx + radius > width + 30 or cy + radius > height + 30:
            continue
        inner = np.zeros_like(mask)
        cv2.circle(inner, (int(cx), int(cy)), max(2, int(radius * 0.6)), 255, -1)
        mean = cv2.mean(image, mask=inner)[:3]
        disks.append(
            {
                "type": "disk",
                "cx": int(round(cx)),
                "cy": int(round(cy)),
                "r": int(round(radius)),
                "fill": hex_colour(mean),
                "area": int(area),
                "circularity": round(circularity, 3),
            }
        )

    disks.sort(key=lambda item: -item["r"])
    return disks[:14]


def detect_polygons(image: np.ndarray) -> list[dict]:
    """The painting's rectangles and triangle, which carry much of its weight."""

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    mask = ((hsv[:, :, 1] > 60) | (hsv[:, :, 2] < 110)).astype(np.uint8) * 255
    kernel = np.ones((7, 7), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    polygons: list[dict] = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 2600:
            continue
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True).reshape(-1, 2)
        if len(approx) not in (3, 4):
            continue
        if len(approx) == 4:
            # require right angles, otherwise it is a skewed blob
            right_angles = 0
            for index in range(4):
                first = approx[(index + 1) % 4] - approx[index]
                second = approx[(index + 2) % 4] - approx[(index + 1) % 4]
                denominator = (np.linalg.norm(first) * np.linalg.norm(second)) or 1
                cosine = float(np.dot(first, second) / denominator)
                if abs(cosine) < 0.3:
                    right_angles += 1
            if right_angles < 3:
                continue
            shape = "rect"
        else:
            shape = "triangle"

        inner = np.zeros(mask.shape, np.uint8)
        cv2.drawContours(inner, [contour], -1, 255, -1)
        inner = cv2.erode(inner, np.ones((5, 5), np.uint8), iterations=1)
        if cv2.countNonZero(inner) < 50:
            continue
        mean = cv2.mean(image, mask=inner)[:3]
        polygons.append(
            {
                "type": "polygon",
                "shape": shape,
                "points": [(int(x), int(y)) for x, y in approx],
                "area": int(area),
                "fill": hex_colour(mean),
            }
        )

    polygons.sort(key=lambda item: -item["area"])
    return polygons[:8]


def detect_lines(image: np.ndarray, edges: np.ndarray) -> list[dict]:
    segments = cv2.HoughLinesP(
        edges, 1, math.pi / 180, threshold=130, minLineLength=170, maxLineGap=8
    )
    if segments is None:
        return []
    segments = segments.reshape(-1, 4)

    merged: list[dict] = []
    for x1, y1, x2, y2 in segments:
        length = math.hypot(x2 - x1, y2 - y1)
        angle = math.degrees(math.atan2(y2 - y1, x2 - x1)) % 180
        for other in merged:
            delta_angle = abs(((angle - other["angle"] + 90) % 180) - 90)
            if delta_angle > 3.5:
                continue
            # perpendicular distance from this segment's start to the stored line
            rad = math.radians(other["angle"])
            dx, dy = math.cos(rad), math.sin(rad)
            px, py = x1 - other["x1"], y1 - other["y1"]
            perpendicular = abs(px * dy - py * dx)
            if perpendicular > 22:
                continue
            if length > other["length"]:
                other.update({"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2), "length": round(length, 1), "angle": round(angle, 1)})
            break
        else:
            merged.append(
                {
                    "type": "line",
                    "x1": int(x1),
                    "y1": int(y1),
                    "x2": int(x2),
                    "y2": int(y2),
                    "length": round(length, 1),
                    "angle": round(angle, 1),
                }
            )

    kept: list[dict] = []
    for line in merged:
        if line["length"] < 200:
            continue
        steps = max(6, int(line["length"] / 40))
        points = np.column_stack(
            [
                np.linspace(line["x1"], line["x2"], steps),
                np.linspace(line["y1"], line["y2"], steps),
            ]
        )
        line["stroke"] = ink_colour(image, points)
        line["thickness"] = estimate_thickness(edges, line)
        kept.append(line)

    kept.sort(key=lambda item: -item["length"])
    return kept


def estimate_thickness(edges: np.ndarray, line: dict) -> int:
    """Walk perpendicular from the mid-point until the edge map runs out."""

    height, width = edges.shape[:2]
    mx, my = (line["x1"] + line["x2"]) / 2, (line["y1"] + line["y2"]) / 2
    rad = math.radians(line["angle"] + 90)
    dx, dy = math.cos(rad), math.sin(rad)
    total = 1
    for direction in (1, -1):
        step = 1
        while step < 40:
            x = int(round(mx + direction * step * dx))
            y = int(round(my + direction * step * dy))
            if not (0 <= x < width and 0 <= y < height):
                break
            window = edges[max(0, y - 1) : y + 2, max(0, x - 1) : x + 2]
            if window.sum() == 0:
                break
            total += 1
            step += 1
    return int(total)


def detect_curves(image: np.ndarray, edges: np.ndarray, claimed: np.ndarray) -> list[dict]:
    """Long strokes that are neither straight nor circular, kept as polylines."""

    residual = cv2.bitwise_and(edges, cv2.bitwise_not(claimed))
    contours, _ = cv2.findContours(residual, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    curves: list[dict] = []
    for contour in contours:
        length = cv2.arcLength(contour, False)
        if length < 260:
            continue
        approx = cv2.approxPolyDP(contour, 4.5, False).reshape(-1, 2)
        if len(approx) < 5 or len(approx) > 90:
            continue
        points = [(int(x), int(y)) for x, y in approx]
        sample = np.array(points, dtype=float)[:: max(1, len(points) // 12)]
        curves.append(
            {
                "type": "path",
                "points": points,
                "length": round(length, 1),
                "stroke": ink_colour(image, sample),
            }
        )
    curves.sort(key=lambda item: -item["length"])
    return curves[:10]


def assign_depth(element: dict) -> float:
    """Heuristic layer weight for parallax: thin crisp ink sits in front."""

    if element["type"] == "disk":
        return 0.18 if element["r"] > 90 else 0.34
    if element["type"] == "polygon":
        return 0.3
    if element["type"] == "circle":
        if element["r"] > 150:
            return 0.22
        return 0.4 if element["r"] > 60 else 0.55
    if element["type"] == "line":
        if element["thickness"] >= 14:
            return 0.28
        return 0.86 if element["thickness"] <= 6 else 0.6
    return 0.7


def main() -> None:
    image = cv2.imread(str(SOURCE))
    if image is None:
        raise SystemExit(f"Cannot read {SOURCE}")
    height, width = image.shape[:2]

    grey = cv2.medianBlur(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), 5)
    edges = cv2.Canny(grey, CANNY_LOW, CANNY_HIGH)

    circles = detect_circles(image, edges)
    disks = detect_disks(image)
    polygons = detect_polygons(image)
    lines = detect_lines(image, edges)
    claimed = np.zeros_like(edges)
    for circle in circles:
        cv2.circle(claimed, (circle["cx"], circle["cy"]), circle["r"], 255, 7)
    for line in lines:
        cv2.line(claimed, (line["x1"], line["y1"]), (line["x2"], line["y2"]), 255, max(9, line["thickness"] + 4))
    for polygon in polygons:
        cv2.polylines(claimed, [np.array(polygon["points"])], True, 255, 9)
    curves = detect_curves(image, edges, claimed)

    elements: list[dict] = []
    for index, element in enumerate([*disks, *polygons, *circles, *lines, *curves], start=1):
        element["id"] = f"{element['type']}-{index:02d}"
        element["depth"] = assign_depth(element)
        # normalised geometry so the runtime never needs the source resolution
        if element["type"] in ("path", "polygon"):
            element["norm"] = {
                "points": [[round(x / width, 4), round(y / height, 4)] for x, y in element["points"]]
            }
        elif element["type"] == "line":
            element["norm"] = {
                "x1": round(element["x1"] / width, 4),
                "y1": round(element["y1"] / height, 4),
                "x2": round(element["x2"] / width, 4),
                "y2": round(element["y2"] / height, 4),
            }
        else:
            element["norm"] = {
                "cx": round(element["cx"] / width, 4),
                "cy": round(element["cy"] / height, 4),
                "r": round(element["r"] / width, 4),
            }
        elements.append(element)

    document = {
        "source": str(SOURCE.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "width": width,
        "height": height,
        "generator": "scripts/extract_composition_elements.py",
        "counts": {
            "disks": len(disks),
            "circles": len(circles),
            "lines": len(lines),
            "curves": len(curves),
            "polygons": len(polygons),
        },
        "elements": elements,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{OUTPUT.relative_to(PROJECT_ROOT)}: {document['counts']} ({len(elements)} elements)")


if __name__ == "__main__":
    main()
