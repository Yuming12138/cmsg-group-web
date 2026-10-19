# GitHub Pages preview

The `experiment/github-pages` branch builds a static copy of the current Flask
site. It does not change `comates.group`, its DNS, or the running server.
The existing Flask routes, templates, styles and content files remain the source.

## Build locally

```sh
python -m pip install -r requirements.txt
python scripts/build_pages.py --base-path /cmsg-group-web
```

The output goes to `output/pages/`. Choose a new `--output` directory for a
subsequent build, or remove the previous generated output explicitly. The builder
refuses to overwrite an existing directory. It checks internal page links,
images, responsive image variants and downloadable assets before succeeding.

To serve at the same project prefix without running Flask:

```sh
python scripts/build_pages.py --base-path /cmsg-group-web --output /tmp/cmsg-pages-preview/cmsg-group-web
python -m http.server 5006 --directory /tmp/cmsg-pages-preview
```

Open `http://localhost:5006/cmsg-group-web/`.

English pages use `/people/`, `/research/`, etc. Chinese pages use `/zh/people/`,
`/zh/research/`, etc. All paths include the project's prefix when needed.
Language switches and normal links work without JavaScript. A small compatibility
script supports old `?language=zh` links; legacy `/members/zhouke` URLs get static
redirect pages. GitHub Pages supplies directory-to-trailing-slash redirects.

The builder rewrites asset URLs only inside the generated files. The particle
animation, photo dialogs and research interactions continue to run in the browser.
Python runs only during the build; the published site contains no Python backend.
Do not include private files in `static/`: its contents are published.

## Publish

Enable Pages in this repository with **Source: GitHub Actions**. Push this branch
or run `.github/workflows/pages.yml` manually from this branch. If GitHub created
a `github-pages` environment restricted to other branches, allow
`experiment/github-pages` in its deployment branch rules.

Each push to the experiment branch rebuilds and deploys the preview. The Pages
workflow derives its project prefix from GitHub, so it also works if the repository
is renamed. It never writes a `CNAME` file or points the existing domain at Pages.
Preview HTML includes `noindex, nofollow` and a crawler exclusion `robots.txt`.

Content updates made directly on the public server must first be brought back to
the source repository to appear in the Pages build. Editing a server template does
not update GitHub Pages. To make Pages the primary site later, verify connectivity,
configure the custom domain separately, and build with `--production` to allow
indexing. Server-side 301 redirects and custom Nginx cache rules are unavailable
on Pages; the static preview uses file-based redirects and Pages cache defaults.
