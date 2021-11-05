# -*- coding: utf-8 -*-
from __future__ import annotations

import os
import typing

import app
from starlette.requests import Request
from starlette.responses import HTMLResponse, Response
from starlette.websockets import WebSocket
from strawberry.asgi import GraphQL

from .context import Context, get_broadcast


def get_graphiql_html():
    return (
        open(
            os.path.join(
                os.path.dirname(os.path.abspath(app.__file__)),
                "api/api_v1/static/graphiql.html",
            ),
            "r",
            encoding="utf8",
        )
        .read()
        .replace("{{ SUBSCRIPTION_ENABLED }}", "true")
    )


class TranscrobesGraphQL(GraphQL):
    async def get_context(
        self,
        request: typing.Union[Request, WebSocket],
        response: typing.Optional[Response] = None,
    ) -> typing.Optional[typing.Any]:
        broadcast = await get_broadcast()

        return Context(broadcast, request, response)

    def get_graphiql_response(self) -> HTMLResponse:
        html = get_graphiql_html()

        return HTMLResponse(html)
