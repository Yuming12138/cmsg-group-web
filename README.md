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

Replace the marked placeholder values after the visual direction is approved. The
templates in `templates/site/` provide structure and the design system lives in
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
