# -*- coding: utf-8 -*-
# isort: skip_file
import logging
import logging.config
import mimetypes
import os

# fmt: off
import sys
import six

if sys.version_info >= (3, 12, 0):
    sys.modules["kafka.vendor.six.moves"] = six.moves

# fmt: on

from app.api.api_v1.api import api_router
from app.api.api_v1.endpoints.data import aioproducer
from app.api.api_v1.graphql import schema
from app.core.config import settings
from app.data.asgi import TranscrobesGraphQL
from app.data.context import get_broadcast
from app.enrich import data
from app.perdomain import get_content_response
from fastapi import APIRouter, FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware


logging.config.dictConfig(settings.LOGGING)

app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json")


@app.on_event("startup")
async def startup_event():
    await aioproducer.start()


@app.on_event("shutdown")
async def shutdown_event():
    await aioproducer.stop()
    await (await get_broadcast()).disconnect()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    print({"detail": exc.errors(), "body": exc.body})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=jsonable_encoder({"detail": exc.errors(), "body": exc.body}),
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    # allow_methods=["*"],
    allow_methods=["POST, GET, OPTIONS"],
    # allow_headers=["*"],
    allow_headers=["X-Requested-With, Content-Type, Authorization"],
)

# Backend
app.include_router(api_router, prefix=settings.API_V1_STR)

# per-domain static content, served from the root and stored in frontend/public/domain-specific/the_domain/*
for prefix in settings.PER_DOMAIN or []:
    per_domain_router = APIRouter()
    per_domain_router.add_api_route(
        "/{resource_path:path}", get_content_response, methods=["GET"], response_class=FileResponse
    )
    app.include_router(per_domain_router, prefix=f"/{prefix}", tags=[prefix])

# RxDB GraphQL endpoints
graphql = TranscrobesGraphQL(schema)
app.add_websocket_route("/subscriptions", graphql)
app.add_websocket_route(os.path.join(settings.API_V1_STR, "graphql"), graphql)  # this is basically for testing igraphql
app.add_route(os.path.join(settings.API_V1_STR, "graphql"), graphql)

# Frontend
# WARNING! This needs to point to a copy of the build directory of the frontend
# app.mount("/static/", StaticFiles(directory="../fapp/static", html=False), name="static")
app.mount("/", StaticFiles(directory=settings.STATIC_ROOT, html=True), name="site")

for name, pair in settings.LANG_PAIRS.items():
    logging.info("Installing language pair %s with %s", name, pair)
    data.managers[name] = data.EnrichmentManager(name, pair)

mimetypes.types_map[".html"] = "text/html"
