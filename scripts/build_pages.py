#!/usr/bin/env python3
"""Render the Flask presentation as a bilingual, backend-free Pages site.

Run from any directory; production Flask routes and templates stay unchanged.
The destination must be new so an accidental path cannot overwrite source files.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qsl, unquote, urlencode, urljoin, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cmsg_site import create_app  # noqa: E402
from cmsg_site.content import SUPPORTED_LANGUAGES  # noqa: E402
from cmsg_site.routes import ZHOUKE_WORK_IDS  # noqa: E402

ATTRIBUTE = re.compile(
    r"(?P<before>\s(?P<name>[\w:-]+)\s*=\s*)(?P<quote>['\"])(?P<value>.*?)(?P=quote)",
    re.DOTALL,
)
URL_ATTRIBUTES = {"href", "src", "poster", "action", "data-photo-src"}


def page_path(route: str, language: str) -> str:
    prefix = "/zh" if language == "zh" else ""
    return prefix + "/" + route.strip("/") + "/" if route != "/" else prefix + "/"


class PageLinks(HTMLParser):
    """Change only quoted URL attribute values; leave markup/text intact."""

    def __init__(self, source: str, rewrite):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.rewrite = rewrite
        self.offsets = [0]
        for line in source.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))
        self.edits = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        raw = self.get_starttag_text()

        def replace(match):
            name = match["name"].lower()
            value = html.unescape(match["value"])
            if name == "srcset":
                value = ", ".join(
                    self.rewrite(parts[0]) + (" " + parts[1] if len(parts) > 1 else "")
                    for item in value.split(",")
                    if (parts := item.strip().split(maxsplit=1))
                )
            elif name in URL_ATTRIBUTES or name.startswith("data-") and value.startswith("/static/"):
                value = self.rewrite(value)
            else:
                return match[0]
            if name in {"href", "src", "poster", "data-photo-src"}:
                self.links.append(value)
            elif name == "srcset":
                self.links.extend(item.strip().split()[0] for item in value.split(","))
            return match["before"] + match["quote"] + html.escape(value, quote=True) + match["quote"]

        revised = ATTRIBUTE.sub(replace, raw)
        if revised != raw:
            line, column = self.getpos()
            start = self.offsets[line - 1] + column
            self.edits.append((start, start + len(raw), revised))

    handle_startendtag = handle_starttag

    def result(self):
        source = self.source
        for start, end, revised in reversed(self.edits):
            source = source[:start] + revised + source[end:]
        return source


def build(destination: Path, base_path: str, preview: bool):
    app = create_app()
    app.config.update(TESTING=True)
    routes = sorted(
        rule.rule for rule in app.url_map.iter_rules()
        if rule.endpoint.startswith("site.") and not rule.arguments
        and not rule.endpoint.startswith("site.zhouke_legacy")
    )
    routes += [f"/people/zhouke/work/{work_id}" for work_id in sorted(ZHOUKE_WORK_IDS)]
    aliases = {"/members/zhouke": "/people/zhouke"}
    aliases.update({
        f"/members/zhouke/work_{work_id}.html": f"/people/zhouke/work/{work_id}"
        for work_id in ZHOUKE_WORK_IDS
    })

    def localized_url(value, language):
        parts = urlsplit(value)
        if parts.scheme or parts.netloc or not parts.path.startswith("/"):
            return value
        query = parse_qsl(parts.query, keep_blank_values=True)
        locale = dict(query).get("language", language)
        if locale not in SUPPORTED_LANGUAGES:
            locale = language
        path = parts.path.rstrip("/") or "/"
        path = aliases.get(path, path)
        if path in routes:
            path = base_path + page_path(path, locale)
            query = [(key, val) for key, val in query if key != "language"]
        elif path.startswith("/static/"):
            path = base_path + parts.path
        else:
            return value
        return urlunsplit(("", "", path, urlencode(query), parts.fragment))

    destination.mkdir(parents=True, exist_ok=False)
    shutil.copytree(
        ROOT / "static", destination / "static",
        ignore=shutil.ignore_patterns("*.zip", "*.pyc", "__pycache__", "CNAME"),
    )
    # Some browser scripts use root-relative asset URLs instead of url_for().
    # Rewrite only the exported copies, never the Flask sources.
    for asset in (destination / "static").rglob("*"):
        if asset.suffix in {".js", ".css"}:
            encoding = "utf-16" if asset.read_bytes()[:2] in {b"\xff\xfe", b"\xfe\xff"} else "utf-8-sig"
            original = asset.read_text(encoding=encoding)
            revised = re.sub(r"(['\"])/static/", lambda match: match[1] + base_path + "/static/", original)
            if original != revised:
                asset.write_text(revised, encoding=encoding)

    pages = []
    with app.test_client() as client:
        for language in SUPPORTED_LANGUAGES:
            for route in routes:
                response = client.get(route, query_string={"language": language})
                if response.status_code != 200:
                    raise RuntimeError(f"Cannot render {language} {route}: {response.status_code}")
                parser = PageLinks(response.get_data(as_text=True), lambda value: localized_url(value, language))
                parser.feed(parser.source)
                source = parser.result()
                extra = (
                    '<script src="' + base_path + '/pages-compat.js" defer></script>\n'
                    + ('<meta name="robots" content="noindex, nofollow">\n' if preview else "")
                )
                source = source.replace("</head>", extra + "</head>", 1)
                relative = page_path(route, language).strip("/")
                target = destination / relative / "index.html"
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(source, encoding="utf-8")
                pages.append((base_path + page_path(route, language), parser.links))

    for alias, route in aliases.items():
        target = destination / alias.lstrip("/")
        if not target.suffix:
            target /= "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        href = base_path + page_path(route, "en")
        translations = {lang: base_path + page_path(route, lang) for lang in SUPPORTED_LANGUAGES}
        target.write_text(
            '<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="robots" content="noindex"><title>Page moved</title></head><body>'
            f'<a href="{html.escape(href)}">Continue to the current page</a>'
            '<script>const targets=' + json.dumps(translations) + ';'
            'const lang=new URLSearchParams(location.search).get("language")||"en";'
            'location.replace((targets[lang]||targets.en)+location.hash);</script></body></html>',
            encoding="utf-8",
        )

    # Handle old inbound ?language= links without a backend. Normal site links
    # already point directly at the localized files and need no JavaScript.
    (destination / "pages-compat.js").write_text(
        '(function(){const base=' + json.dumps(base_path) + ';'
        'const url=new URL(location.href);const lang=url.searchParams.get("language");'
        'if(lang!=="en"&&lang!=="zh")return;'
        'let path=url.pathname.slice(base.length).replace(/^\\/zh(?=\\/|$)/,"");'
        'url.pathname=base+(lang==="zh"?"/zh":"")+(path||"/");'
        'url.searchParams.delete("language");location.replace(url.href);})();\n',
        encoding="utf-8",
    )
    (destination / ".nojekyll").touch()
    (destination / "404.html").write_text(
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<meta name="robots" content="noindex"><title>Page not found · CMSG</title></head>'
        '<body style="font-family:Arial,sans-serif;max-width:42rem;margin:15vh auto;padding:24px">'
        '<h1>Page not found</h1><p>找不到此页面。</p>'
        f'<a href="{base_path}/">Return to CMSG home</a></body></html>', encoding="utf-8",
    )
    if preview:
        (destination / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")

    failures = []
    for page, links in pages:
        for link in links:
            if not link or link.startswith("#"):
                continue
            parts = urlsplit(urljoin("https://pages.invalid" + page, link))
            if parts.netloc != "pages.invalid":
                continue
            path = unquote(parts.path)
            if base_path and not path.startswith(base_path + "/"):
                failures.append(f"{page}: URL escapes project prefix: {link}")
                continue
            target = destination / path[len(base_path):].lstrip("/")
            if not target.is_file() and not (target / "index.html").is_file():
                failures.append(f"{page}: missing target: {link}")
    if failures:
        raise RuntimeError("Static link validation failed:\n" + "\n".join(sorted(set(failures))))
    size = sum(path.stat().st_size for path in destination.rglob("*") if path.is_file())
    manifest = {"pages": len(pages), "base_path": base_path, "bytes": size, "preview": preview}
    (destination / "build-info.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    print(f"Built and checked all internal page/asset links: {destination}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "output" / "pages")
    parser.add_argument("--base-path", default="", help="Project prefix, e.g. /cmsg-group-web")
    parser.add_argument("--production", action="store_true", help="Allow indexing (preview is the default)")
    args = parser.parse_args()
    prefix = "/" + args.base_path.strip("/") if args.base_path.strip("/") else ""
    if not re.fullmatch(r"(?:/[A-Za-z0-9._-]+)*", prefix) or ".." in prefix.split("/"):
        parser.error("base path must contain simple URL path segments")
    build(args.output.resolve(), prefix, not args.production)
