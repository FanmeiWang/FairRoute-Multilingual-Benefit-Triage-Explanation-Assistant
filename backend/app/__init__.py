"""
FairRoute backend application package.

This file marks `app` as a Python package so that
`uvicorn app.main:app` can import it correctly.
There is deliberately no runtime logic here.
"""

__all__ = ["__version__"]

__version__ = "0.1.0"
