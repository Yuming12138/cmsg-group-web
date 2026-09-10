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

## Hero artwork: the manifest, and the two breathing orbs

The hero painting is a raster image, so any element-level behaviour has no vector data
to work with. Two scripts recover it:

```bash
python3 scripts/extract_composition_elements.py   # -> static/site/hero/composition-viii.json
python3 scripts/build_element_review.py           # -> ../hero-elements-review.html
```

The extractor validates every candidate against the edge map, records ink/fill colour,
a heuristic parallax depth, and both pixel and normalised geometry. The review page
overlays the result on the painting with per-type toggles so the detection can be
checked by eye. Known gap: the small rotated rectangles of the "board" motif are not
detected — they are below the size where the colour masks stay connected.

The manifest then drives the one element the hero does animate:

```bash
python3 scripts/build_hero_layers.py              # -> static/site/hero/art-<digest>-1440.webp
python3 scripts/build_hero_layers.py 1440 --orbs  # + orb1/orb2-<digest>-1440.webp
```

Two earlier approaches are worth recording, because they were both dead ends:

- **Replaying the strokes as an overlay** (SVG geometry drawn on top of the painting)
  can only ever ghost — the copy moves, the original stays put. No amount of tuning
  fixes that.
- **Cutting the discs out and inpainting the holes** leaves a radial smear: the hole is
  far too large for either `INPAINT_TELEA` or `INPAINT_NS` to answer convincingly, and
  the smear is plainly visible as a ghost disc the moment the layer moves.

What ships instead is a **scale, not a translation**. The ground keeps the painting
untouched; each orb is an opaque copy of its disc, fading out across the halo:

```
|<-- solid -->|<---- halo fade ---->|
0          1.06r                 1.60r
```

At rest the copy sits exactly on the painted disc, so the composition is unchanged
pixel for pixel. Because the solid core reaches 6% past the disc, scaling the orb up
never slides its edge inward far enough to expose what is underneath — which is why the
motion has to be a scale. The pointer lifts the nearer orb; a slow CSS breath runs
underneath either way. `reducedMotion` freezes both.

The URLs come from `layers.json` and are injected by the home template, so regenerating
after replacing the source artwork needs no CSS or template edit.
