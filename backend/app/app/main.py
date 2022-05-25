import logging
import logging.config
import mimetypes
import os

from app.api.api_v1.api import api_router
from app.api.api_v1.graphql import schema
from app.core.config import settings
from app.data.asgi import TranscrobesGraphQL
from app.enrich import data
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

logging.config.dictConfig(settings.LOGGING)

app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json")


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

# RxDB GraphQL endpoints
graphql = TranscrobesGraphQL(schema)
app.add_websocket_route("/subscriptions", graphql)
app.add_websocket_route(os.path.join(settings.API_V1_STR, "graphql"), graphql)  # this is basically for testing igraphql
app.add_route(os.path.join(settings.API_V1_STR, "graphql"), graphql)

# Frontend
# WARNING! This needs to point to a copy of the build directory of the frontend
app.mount("/static/", StaticFiles(directory="../fapp/static", html=False), name="static")
app.mount("/", StaticFiles(directory="../fapp/site", html=True), name="site")

for name, pair in settings.LANG_PAIRS.items():
    logging.info("Installing language pair %s with %s", name, pair)
    data.managers[name] = data.EnrichmentManager(name, pair)

mimetypes.types_map[".html"] = "text/html"
