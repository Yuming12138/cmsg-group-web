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
