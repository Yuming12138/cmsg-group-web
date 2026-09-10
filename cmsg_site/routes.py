"""Routes for the new content-driven site."""

from flask import Blueprint, abort, redirect, render_template, request, url_for

from .content import SUPPORTED_LANGUAGES, load_content, load_site, load_ui


site_bp = Blueprint("site", __name__)
ZHOUKE_WORK_IDS = frozenset({1, 2, 3, 4})


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
    language = _language()
    return render_template(
        "site/home.html",
        active_page="home",
        home=load_content("home.json", language),
        research_preview=load_content("research.json", language),
        leader_preview=load_content("leader.json", language),
        publications_preview=load_content("publications.json", language),
    )


def _section(slug: str):
    language = _language()
    page = load_content(f"{slug}.json", language)
    event_images = {}
    people_images = {}
    if slug == "events":
        event_images = load_content("event-images.json", language).get("images", {})
    elif slug == "people":
        people_images = load_content("people-images.json", language).get("images", {})
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
        event_images=event_images,
        people_images=people_images,
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


@site_bp.get("/people/zhouke")
def zhouke_profile():
    """Render Ke Zhou's legacy profile inside the current site shell."""

    page = load_content("people-zhouke.json", _language())
    return render_template(
        "site/people/zhouke_profile.html",
        active_page="people",
        page=page,
        profile=page,
    )


@site_bp.get("/people/zhouke/work/<int:work_id>")
def zhouke_work(work_id: int):
    """Render one of the four legacy research stories for Ke Zhou."""

    if work_id not in ZHOUKE_WORK_IDS:
        abort(404)
    profile = load_content("people-zhouke.json", _language())
    work = next(item for item in profile["works"] if item["id"] == work_id)
    return render_template(
        "site/people/zhouke_work.html",
        active_page="people",
        page={"meta": work["meta"]},
        profile=profile,
        work=work,
        work_id=work_id,
    )


@site_bp.get("/members/zhouke")
def zhouke_legacy_profile():
    """Keep the old public profile URL working after the redesign."""

    return redirect(_localized_href(url_for("site.zhouke_profile"), _language()), 301)


@site_bp.get("/members/zhouke/work_<int:work_id>.html")
def zhouke_legacy_work(work_id: int):
    """Preserve inbound links to the former work-detail URLs."""

    if work_id not in ZHOUKE_WORK_IDS:
        abort(404)
    return redirect(
        _localized_href(url_for("site.zhouke_work", work_id=work_id), _language()),
        301,
    )
