"""Application factory for the content-driven CMSG website."""

import os
from datetime import date
from pathlib import Path

from flask import Flask, request, url_for

from .routes import site_bp


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def create_app() -> Flask:
    """Create a configured Flask application for the new site foundation."""

    app = Flask(
        __name__,
        template_folder=str(PROJECT_ROOT / "templates"),
        static_folder=str(PROJECT_ROOT / "static"),
        static_url_path="/static",
    )
    app.config.update(
        SECRET_KEY=os.environ.get("FLASK_SECRET_KEY", "development-only-insecure-key"),
        TEMPLATES_AUTO_RELOAD=True,
    )
    app.jinja_env.auto_reload = True
    app.register_blueprint(site_bp)

    @app.template_global()
    def asset(filename: str) -> str:
        """Static URL carrying an mtime cache-buster.

        Without it a browser can keep serving an old stylesheet or script after a
        deploy, which makes behaviour changes look like regressions.
        """

        url = url_for("static", filename=filename)
        target = PROJECT_ROOT / "static" / filename
        if target.is_file():
            url = f"{url}?v={int(target.stat().st_mtime)}"
        return url

    @app.context_processor
    def inject_site_defaults():
        return {"site_year": str(date.today().year)}

    @app.after_request
    def cache_static_images(response):
        if response.status_code != 200:
            return response

        path = request.path
        if path.startswith(
            ("/static/images/group/web/", "/static/site/images/members/web/")
        ):
            # Generated filenames include a content hash, so they are safe to
            # keep for a year and never need a revalidation request.
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif path.startswith("/static/site/images/members/"):
            # Keep the archival fallback warm without making future edits
            # impossible to pick up during the next day.
            response.headers["Cache-Control"] = (
                "public, max-age=86400, stale-while-revalidate=3600"
            )
        return response

    return app
