# -*- coding: utf-8 -*-

from __future__ import annotations

from app.api.api_v1.endpoints import data, enrich, login, tables, users, utils
from fastapi import APIRouter

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(utils.router, prefix="/utils", tags=["utils"])

api_router.include_router(enrich.router, prefix="/enrich", tags=["enrich"])
api_router.include_router(data.router, prefix="/data", tags=["data"])

api_router.include_router(tables.router, prefix="/tables", tags=["tables"])
