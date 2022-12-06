# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from app.broadcaster import Broadcast
    from app.models.user import AuthUser


async def publish_message(channel: str, objects: Any, broadcast: Broadcast, user: AuthUser = None, user_id: int = None):
    # out = await info.context.broadcast.publish(channel=channel, message=dumps(message))
    # message = {
    #     "data": {
    #         "documents": objects,
    #         "checkpoint": {"id": objects[-1].id, "updatedAt": objects[-1].updatedAt},
    #     },
    #     "user": user,
    # }

    out = await broadcast.publish(channel=channel, message=str(user.id if user else user_id))
    logger.info("publish_message: %s", out)
