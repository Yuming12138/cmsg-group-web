"""Routes for the new content-driven site."""

from flask import Blueprint, render_template

from .content import load_content, load_site


site_bp = Blueprint("site", __name__)


@site_bp.app_context_processor
def inject_site_content():
    return {"site": load_site()}


@site_bp.get("/")
def home():
    return render_template(
        "site/home.html",
        active_page="home",
        home=load_content("home.json"),
    )


def _section(slug: str):
    page = load_content(f"{slug}.json")
    return render_template(
        "site/section.html",
        active_page=slug,
        page=page,
        slug=slug,
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
