#!/usr/bin/env python3
"""Build the element-verification page for the hero artwork manifest.

Reads ``static/site/hero/composition-viii.json`` (produced by
``scripts/extract_composition_elements.py``) and writes a self-contained review
page next to the repository, so the detected geometry can be checked against the
painting by eye before it is used for motion work.

The review page offers per-type visibility toggles, an overlay, a
detection-only view, and a table of every element.

Usage:
    python3 scripts/build_element_review.py [output.html]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MANIFEST = PROJECT_ROOT / "static" / "site" / "hero" / "composition-viii.json"
DEFAULT_OUTPUT = PROJECT_ROOT.parent / "hero-elements-review.html"
ARTWORK_URL = (
    "http://121.41.48.42/static/site/images/hero/"
    "kandinsky-composition-viii-35c68f7ea1-1440.webp"
)


def build(definition: dict) -> str:
    width, height = definition["width"], definition["height"]
    shapes: list[str] = []
    rows: list[str] = []

    for element in definition["elements"]:
        identity = element["id"]
        if element["type"] == "disk":
            colour = element["fill"]
            shapes.append(
                f'<circle class="el disk" data-id="{identity}" cx="{element["cx"]}" cy="{element["cy"]}" '
                f'r="{element["r"]}" fill="{colour}" fill-opacity=".45" stroke="{colour}" stroke-width="3"/>'
            )
            geometry = f'({element["cx"]},{element["cy"]}) r{element["r"]}'
        elif element["type"] == "polygon":
            colour = element["fill"]
            points = " ".join(f"{x},{y}" for x, y in element["points"])
            shapes.append(
                f'<polygon class="el polygon" data-id="{identity}" points="{points}" '
                f'fill="{colour}" fill-opacity=".45" stroke="#ffd400" stroke-width="3"/>'
            )
            geometry = f'{element["shape"]} · {len(element["points"])} pts · area {element["area"]}'
        elif element["type"] == "circle":
            colour = element["stroke"]
            shapes.append(
                f'<circle class="el circle" data-id="{identity}" cx="{element["cx"]}" cy="{element["cy"]}" '
                f'r="{element["r"]}" fill="none" stroke="#00ff88" stroke-width="4"/>'
            )
            geometry = f'({element["cx"]},{element["cy"]}) r{element["r"]} · support {element["support"]}'
        elif element["type"] == "line":
            colour = element["stroke"]
            shapes.append(
                f'<line class="el line" data-id="{identity}" x1="{element["x1"]}" y1="{element["y1"]}" '
                f'x2="{element["x2"]}" y2="{element["y2"]}" stroke="#ff2d55" stroke-width="3"/>'
            )
            geometry = (
                f'({element["x1"]},{element["y1"]})→({element["x2"]},{element["y2"]}) · '
                f'len {element["length"]:.0f} · {element["thickness"]}px · {element["angle"]}°'
            )
        else:
            colour = element["stroke"]
            points = " ".join(f"{x},{y}" for x, y in element["points"])
            shapes.append(
                f'<polyline class="el path" data-id="{identity}" points="{points}" '
                f'fill="none" stroke="#2d7dff" stroke-width="3"/>'
            )
            geometry = f'{len(element["points"])} pts · len {element["length"]:.0f}'

        if element["type"] in ("line", "path", "polygon"):
            anchor = element.get("points", [[element.get("x1", 0), element.get("y1", 0)]])[0]
            label_x, label_y = anchor[0], anchor[1]
        else:
            label_x, label_y = element["cx"], element["cy"]
        rows.append(
            f'<tr data-id="{identity}"><td>{identity}</td><td>{element["type"]}</td>'
            f'<td>{geometry}</td>'
            f'<td><span class="chip" style="background:{colour}"></span>{colour}</td>'
            f'<td>{element["depth"]}</td></tr>'
        )
        shapes.append(
            f'<text class="lbl" data-id="{identity}" x="{label_x + 6}" y="{label_y - 6}">'
            f'{identity.split("-")[1]}</text>'
        )

    return f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>Composition VIII · 元素检测核对</title>
<style>
  body {{ margin: 0; background: #0f1620; color: #dbe4ee; font: 13px/1.5 "Segoe UI", "Microsoft YaHei", sans-serif; }}
  header {{ padding: 18px 24px; border-bottom: 1px solid rgba(255,255,255,.12); }}
  h1 {{ margin: 0 0 6px; font-size: 17px; }}
  .meta {{ color: #8ea3b8; font-size: 12px; }}
  .toggles {{ padding: 12px 24px; display: flex; gap: 18px; flex-wrap: wrap; border-bottom: 1px solid rgba(255,255,255,.08); }}
  label {{ cursor: pointer; user-select: none; }}
  .swatch {{ display:inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; }}
  main {{ display: grid; grid-template-columns: minmax(0,1fr) 470px; gap: 20px; padding: 20px 24px 40px; align-items: start; }}
  .stage {{ position: relative; border: 1px solid rgba(255,255,255,.12); border-radius: 8px; overflow: hidden; background: #fff; }}
  .stage img {{ display: block; width: 100%; height: auto; }}
  .stage svg {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
  .lbl {{ font: 600 13px/1 ui-monospace, monospace; fill: #fff; paint-order: stroke; stroke: rgba(0,0,0,.75); stroke-width: 3px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
  th, td {{ text-align: left; padding: 5px 8px; border-bottom: 1px solid rgba(255,255,255,.08); }}
  th {{ color: #8ea3b8; font-weight: 600; position: sticky; top: 0; background: #0f1620; }}
  tr.hl {{ background: rgba(93,155,214,.18); }}
  .chip {{ display:inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -2px; border: 1px solid rgba(255,255,255,.3); }}
  .hidden {{ display: none; }}
  .tablewrap {{ max-height: 78vh; overflow: auto; border: 1px solid rgba(255,255,255,.12); border-radius: 8px; }}
  .dim {{ opacity: .25; }}
</style></head><body>
<header>
  <h1>Composition VIII · 元素检测核对</h1>
  <p class="meta">源图 {width}×{height} · 检测结果 {json.dumps(definition['counts'], ensure_ascii=False)} ·
  共 {len(definition['elements'])} 个元素。绿=描边圆，红=直线，蓝=曲线，黄=多边形，彩色半透明=实心区域。</p>
</header>
<div class="toggles">
  <label><input type="checkbox" data-type="disk" checked>实心盘</label>
  <label><input type="checkbox" data-type="polygon" checked>多边形</label>
  <label><input type="checkbox" data-type="circle" checked>描边圆</label>
  <label><input type="checkbox" data-type="line" checked>直线</label>
  <label><input type="checkbox" data-type="path" checked>曲线</label>
  <label><input type="checkbox" id="labels" checked>编号</label>
  <label><input type="checkbox" id="dim-bg">压暗原图</label>
  <label><input type="checkbox" id="freeze">隐藏原图（只看检测结果）</label>
</div>
<main>
  <div class="stage">
    <img id="art" src="{ARTWORK_URL}" alt="Composition VIII">
    <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet">{''.join(shapes)}</svg>
  </div>
  <div class="tablewrap"><table><thead><tr><th>id</th><th>类型</th><th>几何</th><th>颜色</th><th>depth</th></tr></thead>
  <tbody>{''.join(rows)}</tbody></table></div>
</main>
<script>
  const art = document.getElementById('art');
  const labels = [...document.querySelectorAll('.lbl')];
  document.querySelectorAll('.toggles input[data-type]').forEach(box => box.addEventListener('change', () => {{
    document.querySelectorAll('.el.' + box.dataset.type).forEach(el => el.classList.toggle('hidden', !box.checked));
  }}));
  document.getElementById('labels').addEventListener('change', e => labels.forEach(t => t.classList.toggle('hidden', !e.target.checked)));
  document.getElementById('dim-bg').addEventListener('change', e => art.style.filter = e.target.checked ? 'brightness(.45) blur(1px)' : '');
  document.getElementById('freeze').addEventListener('change', e => art.style.visibility = e.target.checked ? 'hidden' : 'visible');
  const rows = new Map([...document.querySelectorAll('tbody tr')].map(r => [r.dataset.id, r]));
  document.querySelectorAll('.el').forEach(el => {{
    el.addEventListener('mouseenter', () => rows.get(el.dataset.id)?.classList.add('hl'));
    el.addEventListener('mouseleave', () => rows.get(el.dataset.id)?.classList.remove('hl'));
  }});
  document.querySelectorAll('tbody tr').forEach(row => {{
    row.addEventListener('mouseenter', () => document.querySelectorAll('.el[data-id="' + row.dataset.id + '"]').forEach(el => el.classList.add('dim')));
    row.addEventListener('mouseleave', () => document.querySelectorAll('.el').forEach(el => el.classList.remove('dim')));
  }});
</script>
</body></html>
"""


def main() -> None:
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUTPUT
    definition = json.loads(MANIFEST.read_text(encoding="utf-8"))
    output.write_text(build(definition), encoding="utf-8")
    print(f"{output}: {len(definition['elements'])} elements")


if __name__ == "__main__":
    main()
