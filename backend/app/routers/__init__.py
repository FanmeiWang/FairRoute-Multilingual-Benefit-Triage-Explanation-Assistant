# backend/app/routers/__init__.py
"""
Router package for FairRoute.

This package exposes the three main routers:
- intake:  citizen-facing intake & evaluation endpoints
- staff:   staff console endpoints (load proof packages)
- admin:   admin / rules inspection endpoints
"""

from . import intake, staff, admin

__all__ = ["intake", "staff", "admin"]
