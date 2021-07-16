# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
from datetime import datetime

from app.data.context import get_broadcast
from app.worker.faustus import UserWordT

logger = logging.getLogger(__name__)

# def push_user_word_stats_update_to_clients(user_ids):
#     logger.debug(f"Sending word_model_stats updates to kafka for {user_ids=}")
#     for user_id in user_ids:
#         logger.debug(f"Sending word_model_stats update to kafka for {user_id=}")
#         stats.KAFKA_PRODUCER.send("word_model_stats", str(user_id))


async def push_user_word_stats_update_to_clients(user_ids: list[str]) -> None:
    try:
        broadcast = await get_broadcast()

        logger.info(f"Sending word_model_stats updates to kafka for {user_ids=}")
        for user_id in user_ids:
            logger.info(f"Sending word_model_stats update to kafka for {user_id=}")
            await broadcast.publish(channel="word_model_stats", message=str(user_id))
    except Exception:  # pylint: disable=W0703
        logger.exception(f"Failed to publish changes to word_model_stats for {user_ids=}")
        logger.error(broadcast)


async def update_db_userword_faust(
    conn, temp_table: str, user_id: int, data: dict[str, UserWordT]
) -> None:  # pylint: disable=R0914
    async with conn.transaction():
        logger.debug(
            "Aggregating stats updates and persisting to postgres with temp table %s to %s",
            temp_table,
            data,
        )
        # Fill database temp table from the CSV
        records = []
        for k, v in data.items():
            records.append(
                (
                    user_id,
                    None,
                    k,
                    v.nb_seen,
                    datetime.utcfromtimestamp(v.last_seen),
                    v.nb_checked,
                    datetime.utcfromtimestamp(v.last_checked),
                    v.nb_seen_since_last_check,
                )
            )
        logger.debug("Stats aggregated to array, pushing to a temp table")
        await conn.execute(f"TRUNCATE TABLE {temp_table}")
        await conn.copy_records_to_table(temp_table, records=records)

        # Clean the update table to start with a clean slate
        # Get the ID for each word from the reference table (currently bingapilookup)
        await conn.execute(
            f"""UPDATE {temp_table}
                SET word_id = bingapilookup.id
                FROM bingapilookup
                WHERE word = bingapilookup.source_text"""
        )

        # Update the "stats" table for user vocab
        update_sql = f"""
                INSERT INTO userword (
                    nb_seen,
                    last_seen,
                    nb_checked,
                    last_checked,
                    user_id,
                    word_id,
                    nb_seen_since_last_check,
                    is_known,
                    updated_at
                ) SELECT
                    tt.nb_seen,
                    tt.last_seen,
                    tt.nb_checked,
                    tt.last_checked,
                    tt.user_id,
                    tt.word_id,
                    tt.nb_seen_since_last_check,
                    false,
                    now()
                  FROM {temp_table} tt
                  WHERE tt.word_id is not null
                ON CONFLICT (user_id, word_id)
                DO
                   UPDATE SET
                        updated_at = now(),
                        nb_seen = EXCLUDED.nb_seen,
                        last_seen = EXCLUDED.last_seen,
                        nb_checked = EXCLUDED.nb_checked,
                        last_checked = EXCLUDED.last_checked,
                        nb_seen_since_last_check = EXCLUDED.nb_seen_since_last_check
                """

        logger.debug("Aggregated stats in a temptable, updating data_userword")
        await conn.execute(update_sql)
        logger.info(f"User statistics updated for {user_id=}")
        await push_user_word_stats_update_to_clients(user_ids=[user_id])


async def create_temp_table_userword(temp_table: str, conn) -> None:
    logger.debug(f"Creating temp table {temp_table=}")
    TEMP_TABLE_CREATE = f"""
        CREATE TEMP TABLE {temp_table}
         (user_id integer not null,
         word_id int null,
         word text not null,
         nb_seen integer not null,
         last_seen timestamp with time zone,
         nb_checked integer not null,
         last_checked timestamp with time zone,
         nb_seen_since_last_check integer null
         )"""
    await conn.execute(TEMP_TABLE_CREATE)
