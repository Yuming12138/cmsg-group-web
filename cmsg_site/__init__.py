"""Application factory for the content-driven CMSG website."""

import os
from pathlib import Path

from flask import Flask

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

    @app.context_processor
    def inject_site_defaults():
        return {"site_year": "2026"}

    return app
