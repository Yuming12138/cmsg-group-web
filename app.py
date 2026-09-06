"""Entry point for the rebuilt CMSG Group website.

The previous application is preserved as ``legacy_app.py`` while this module
serves the content-driven foundation in ``cmsg_site``.
"""

from cmsg_site import create_app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
