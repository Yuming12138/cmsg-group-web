# CMSG Group Web

This repository is being rebuilt as a content-driven academic group website.

## Foundation branch

The `rebuild/foundation` branch contains the first visual candidate. It keeps the
previous Flask implementation in `legacy_app.py` and serves the new application from
`app.py` through the `cmsg_site` package.

### Edit content without touching templates

Visible page content lives in `content/*.json`:

- `site.json` — site name, navigation, and footer
- `home.json` — hero and home-page sections
- `research.json`, `leader.json`, `publications.json`, `events.json`, `news.json`
- `code-platform.json`, `people.json`

The non-research sections currently contain a reviewed selection of group facts,
people, publications, events, and news. The Research page now uses the prepared
long-form direction page at `templates/site/research.html`; its source layout is
namespaced in `static/site/css/research.css`, while images and linked papers live
under `static/site/research/`. Future copy changes can be made in that template
without touching the global shell. `code-platform.json` and the home-page research
cards remain placeholders until their content direction is settled. The templates
in `templates/site/` provide structure and the design system lives in
`static/site/css/tokens.css` and `static/site/css/site.css`.

## Run locally

```bash
python app.py
```

Then open <http://127.0.0.1:5000/>. The old site can still be inspected by running
`legacy_app.py` directly when the legacy dependencies are available.

The provided Kandinsky *Composition VIII* image is stored at
`static/site/images/kandinsky-composition-viii.jpg` and is used only as the home-page
hero artwork in this visual candidate.

## Event images

Full-resolution activity photos stay in `static/images/group/`. The event page serves
hashed responsive WebP variants plus an optimized JPEG fallback from
`static/images/group/web/`; their mapping lives in `content/event-images.json`.
Regenerate these derived files after adding or replacing an activity photo:

```bash
python3 -m pip install -r requirements-dev.txt
python3 scripts/generate_event_images.py
```

Member portraits use the same content-hashed responsive-image pattern. Regenerate
their WebP/JPEG variants after replacing a portrait:

```bash
python3 scripts/generate_people_images.py
```

## Hero artwork element manifest and depth layers

The hero painting is a raster image, so element-level motion (parallax planes, an
"assembly" intro, per-element breathing) has no vector data to work with. Two scripts
recover it:

```bash
python3 scripts/extract_composition_elements.py   # -> static/site/hero/composition-viii.json
python3 scripts/build_element_review.py           # -> ../hero-elements-review.html
```

The extractor validates every candidate against the edge map, records ink/fill colour,
a heuristic parallax depth, and both pixel and normalised geometry. The review page
overlays the result on the painting with per-type toggles so the detection can be
checked by eye. Known gap: the small rotated rectangles of the "board" motif are not
detected — they are below the size where the colour masks stay connected.

The manifest then drives the real depth layers the hero renders:

```bash
python3 scripts/build_hero_layers.py              # -> static/site/hero/{ground,mid,front}-<digest>-1440.webp
```

The builder cuts the fine strokes out of the canvas, inpaints the holes into a clean
ground, and writes those stroke pixels onto a mid and a front plane. An overlay copy of
the strokes could only ghost when it moved; real separated pixels let the painting's own
lines travel. Heavy structure (thick bars, the big rings) deliberately stays in the
ground, because cutting it would smear the canvas where it crosses colour boundaries.
The layers align exactly at rest, so with no motion the composition is unchanged. If the
digest changes, update the `--hero-ground/mid/front` variables in
`static/site/css/tokens.css`.
