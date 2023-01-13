# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from app.broadcaster import Broadcast
    from app.models.user import AuthUser


async def publish_message(channel: str, objects: Any, broadcast: Broadcast, user: AuthUser = None, user_id: int = None):
    await broadcast.publish(channel=f"changed{str(user.id if user else user_id)}", message=channel)
    logger.info("publish_message: %s", channel)


async def publish_readonly_collection(broadcast: Broadcast, readonly_collection: str):
    channel = f"changed{readonly_collection}"
    await broadcast.publish(channel=channel, message=readonly_collection)
    logger.info("publish_message: %s", channel)
