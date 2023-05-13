import logging
import mimetypes
import os
from typing import Annotated

from app.core.config import settings
from fastapi import Header, HTTPException, Request
from fastapi.responses import FileResponse
from starlette import status
from user_agents import parse

logger = logging.getLogger(__name__)


def get_content_response(
    resource_path,
    request: Request,
    user_agent: Annotated[str | None, Header()] = None,
):
    static_path = os.path.join(
        settings.STATIC_ROOT,
        settings.PER_DOMAIN_INTERNAL_PREFIX,
        request.url.hostname,
        request.url.path.removeprefix("/"),
    )
    if not os.path.isfile(static_path):
        logger.warning(f"Can't find {static_path=}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource specified is not a file {resource_path=}",
        )

    media_type = mimetypes.guess_type(static_path)[0]
    if media_type == "application/xhtml+xml":
        # https://caniuse.com/?search=script%3A%20type%3A%20module
        # TODO: decide whether this is necessary here
        # Safari is broken with "application/xhtml+xml"...
        ua = parse(user_agent)
        if ua and "safari" in ua.browser.family.lower():
            media_type = "text/html"
    response = FileResponse(static_path, media_type=media_type)
    return response
