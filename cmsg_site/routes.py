"""Routes for the new content-driven site."""

from flask import Blueprint, render_template, request, url_for

from .content import SUPPORTED_LANGUAGES, load_content, load_site, load_ui


site_bp = Blueprint("site", __name__)


@site_bp.app_context_processor
def inject_site_content():
    language = _language()
    other_language = "zh" if language == "en" else "en"
    endpoint = request.endpoint or "site.home"
    view_args = dict(request.view_args or {})
    return {
        "site": load_site(language),
        "ui": load_ui(language),
        "language": language,
        "language_url": url_for(endpoint, **view_args, language=other_language),
        "href_for": lambda href: _localized_href(href, language),
    }


def _language() -> str:
    value = request.args.get("language", "en").lower()
    return value if value in SUPPORTED_LANGUAGES else "en"


def _localized_href(href: str, language: str) -> str:
    """Keep internal links in the selected locale without touching externals."""

    if language == "en" or not href or not href.startswith("/"):
        return href
    separator = "&" if "?" in href else "?"
    return f"{href}{separator}language={language}"


@site_bp.get("/")
def home():
    return render_template(
        "site/home.html",
        active_page="home",
        home=load_content("home.json", _language()),
    )


def _section(slug: str):
    page = load_content(f"{slug}.json", _language())
    publication_groups = []
    if page.get("layout") == "publications":
        for item in page.get("items", []):
            if not publication_groups or publication_groups[-1]["year"] != item["date"]:
                publication_groups.append({"year": item["date"], "items": []})
            publication_groups[-1]["items"].append(item)
    template = "site/research.html" if slug == "research" else "site/section.html"
    return render_template(
        template,
        active_page=slug,
        page=page,
        slug=slug,
        publication_groups=publication_groups,
    )


@site_bp.get("/research")
def research():
    return _section("research")


@site_bp.get("/leader")
def leader():
    return _section("leader")


@site_bp.get("/publications")
def publications():
    return _section("publications")


@site_bp.get("/events")
def events():
    return _section("events")


@site_bp.get("/news")
def news():
    return _section("news")


@site_bp.get("/code-platform")
def code_platform():
    return _section("code-platform")


@site_bp.get("/people")
def people():
    return _section("people")
