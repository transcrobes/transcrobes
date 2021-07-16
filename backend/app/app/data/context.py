# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
import typing
from dataclasses import dataclass

from app.core.config import settings
from broadcaster import Broadcast
from starlette.requests import Request
from starlette.responses import Response
from starlette.websockets import WebSocket

logger = logging.getLogger(__name__)


broadcast = None


async def get_broadcast():
    global broadcast  # pylint: disable=W0603

    if not broadcast:
        if settings.BROADCASTER_MESSAGING_LAYER == "postgres":  # pylint: disable=R1720
            user = settings.POSTGRES_USER
            password = settings.POSTGRES_PASSWORD
            host = settings.POSTGRES_SERVER
            port = settings.POSTGRES_PORT or "5432"
            db = settings.POSTGRES_DB
            dsnstr = f"postgresql://{user}:{password}@{host}:{port}/{db}"
            logger.info("Setting up broadcast with postgres dsn %s", dsnstr)
            broadcast = Broadcast(dsnstr)
        elif settings.BROADCASTER_MESSAGING_LAYER == "kafka":
            logger.info("Setting up broadcast with kafka broker %s", settings.KAFKA_BROKER)
            broadcast = Broadcast(f"kafka://{settings.KAFKA_BROKER}")
        else:
            logger.info("Setting up broadcast with memory")
            broadcast = Broadcast("memory://")

        await broadcast.connect()

    return broadcast


@dataclass
class Context:
    broadcast: Broadcast
    request: typing.Union[Request, WebSocket]
    response: typing.Optional[Response]
