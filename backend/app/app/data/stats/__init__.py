# -*- coding: utf-8 -*-
from __future__ import annotations

import logging

from app.data.context import get_broadcast
from app.db.session import engine
from sqlalchemy import text

logger = logging.getLogger(__name__)


def sync_push_user_stats_update_to_clients(user_ids: list[str], channel: str) -> None:
    logger.info(f"Sending {channel} updates to client for {user_ids=}")
    try:
        with engine.connect() as db:
            for user_id in user_ids:
                logger.debug(f"Sending {channel} update to client for {user_id=}")
                db.execute(text(f"SELECT pg_notify('{channel}', '{str(user_id)}');"))
            db.commit()
    except Exception as ex:  # pylint: disable=W0703
        logger.exception(f"Failed to publish changes to {channel} for {user_ids=}")
        logger.error(ex)


async def push_user_stats_update_to_clients(user_ids: list[str], channel: str) -> None:
    try:
        broadcast = await get_broadcast()

        logger.info(f"Sending {channel} updates to client for {user_ids=}")
        for user_id in user_ids:
            logger.debug(f"Sending {channel} update to client for {user_id=}")
            await broadcast.publish(channel=channel, message=str(user_id))
    except Exception:  # pylint: disable=W0703
        logger.exception(f"Failed to publish changes to {channel} for {user_ids=}")
        logger.error(broadcast)
