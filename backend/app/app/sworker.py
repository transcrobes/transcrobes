import asyncio
import logging
import logging.config
import time
import traceback
from datetime import datetime

import orjson
from aiokafka import AIOKafkaConsumer
from app.core.config import settings
from app.data.stats import push_user_stats_update_to_clients
from app.db.session import async_stats_session
from app.models.stats import UserDay, UserWord
from app.stats import ACTION_EVENT_TOPIC_NAME, CARD_EVENT_TOPIC_NAME, VOCAB_EVENT_TOPIC_NAME
from sqlalchemy import case
from sqlalchemy.dialects import postgresql

logging.config.dictConfig(settings.LOGGING)

logger = logging.getLogger(__name__)

CONSUMER_GROUP_ID = "tcstats"
STATS_TOPICS_TO_CONSUME = [VOCAB_EVENT_TOPIC_NAME, ACTION_EVENT_TOPIC_NAME, CARD_EVENT_TOPIC_NAME]


def get_event_dates(tstamp):
    return tstamp / 1000.0 or time.time()


async def send_updates(word_updates, day_updates, update_ids, include_success=False):
    async with async_stats_session() as db:
        if len(word_updates) > 0:
            stmt = send_word_updates(word_updates)
            await db.execute(stmt)
        if len(day_updates) > 0:
            stmt_day = send_day_updates(day_updates, include_success)
            await db.execute(stmt_day)
        await db.commit()

    if len(day_updates) > 0:
        await push_user_stats_update_to_clients(update_ids, UserDay.__name__),
    if len(word_updates) > 0:
        await push_user_stats_update_to_clients(update_ids, UserWord.__name__),


async def action_event(events, tstamp):
    if not events:
        logger.warning("Empty action events received")
        return
    logger.info(f"{len(events)} action events received")

    update_ids = set()
    day_updates = {}
    word_updates = {}
    now = get_event_dates(tstamp)
    today = int(datetime.fromtimestamp(now).strftime("%Y%m%d"))
    for event in events:
        user_id = event["user_id"]
        update_ids.add(user_id)
        day_key = f"{user_id}_{today}"
        if day_key not in day_updates:
            day_updates[day_key] = {"user_id": user_id, "day": today, "nb_seen": 0, "nb_checked": 0, "updated_at": now}
        day = day_updates[day_key]

        target_word = event["target_word"]
        word_key = f"{user_id}_{target_word}"
        if word_key not in word_updates:
            word_updates[word_key] = {
                "user_id": user_id,
                "graph": target_word,
                "nb_seen": 0,
                "nb_checked": 0,
                "nb_seen_since_last_check": 0,
                "updated_at": now,
            }
        vord = word_updates[word_key]

        vord["nb_seen"] += 1
        vord["last_seen"] = now
        vord["last_checked"] = now
        vord["nb_seen_since_last_check"] = 0
        vord["nb_checked"] += 1
        day["nb_seen"] += 1
        day["nb_checked"] += 1

    await send_updates(word_updates, day_updates, list(update_ids))
    logger.info(f"Actions sent to statsdb for user_ids {list(update_ids)}")


def send_word_updates(word_updates):
    stmt = postgresql.insert(UserWord).values(list(word_updates.values()))
    update_dict = dict(
        nb_seen=UserWord.nb_seen + stmt.excluded.nb_seen,
        last_seen=case((stmt.excluded.last_seen > 0, stmt.excluded.last_seen), else_=UserWord.last_seen),
        nb_checked=UserWord.nb_checked + stmt.excluded.nb_checked,
        last_checked=case((stmt.excluded.last_checked > 0, stmt.excluded.last_checked), else_=UserWord.last_checked),
        nb_seen_since_last_check=case(
            (
                stmt.excluded.nb_seen_since_last_check > 0,
                UserWord.nb_seen_since_last_check + stmt.excluded.nb_seen_since_last_check,
            ),
            else_=0,
        ),
        updated_at=stmt.excluded.updated_at,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["user_id", "graph"],
        set_=update_dict,
    )
    return stmt


def send_day_updates(day_updates, include_success):
    stmt = postgresql.insert(UserDay).values(list(day_updates.values()))
    update_dict = dict(
        nb_seen=UserDay.nb_seen + stmt.excluded.nb_seen,
        nb_checked=UserDay.nb_checked + stmt.excluded.nb_checked,
        updated_at=stmt.excluded.updated_at,
    )
    if include_success:
        update_dict["nb_success"] = UserDay.nb_success + stmt.excluded.nb_success
        update_dict["nb_failures"] = UserDay.nb_failures + stmt.excluded.nb_failures
    stmt = stmt.on_conflict_do_update(
        index_elements=["user_id", "day"],
        set_=update_dict,
    )
    return stmt


async def vocab_event(events, tstamp):
    if not events:
        logger.warning("Empty vocab events received")
        return
    logger.info(f"{len(events)} Vocab events received")
    update_ids = set()
    word_updates = {}
    day_updates = {}

    now = get_event_dates(tstamp)
    today = int(datetime.fromtimestamp(now).strftime("%Y%m%d"))
    for event in events:
        user_id = event["user_id"]
        update_ids.add(user_id)
        day_key = f"{user_id}_{today}"
        if day_key not in day_updates:
            day_updates[day_key] = {"user_id": user_id, "day": today, "nb_seen": 0, "nb_checked": 0, "updated_at": now}
        day = day_updates[day_key]
        for k, v in event["data"].items():
            word_key = f"{user_id}_{k}"
            if word_key not in word_updates:
                word_updates[word_key] = {
                    "user_id": user_id,
                    "graph": k,
                    "nb_seen": 0,
                    "nb_checked": 0,
                    "nb_seen_since_last_check": 0,
                    "updated_at": now,
                }
            vord = word_updates[word_key]
            vord["nb_seen"] += v[0]
            vord["last_seen"] = now
            day["nb_seen"] += v[0]
            if v[1] > 0:
                vord["last_checked"] = now
                vord["nb_seen_since_last_check"] = 0
                vord["nb_checked"] += v[1]
                day["nb_checked"] += v[1]
            else:
                vord["nb_seen_since_last_check"] += v[0]

    await send_updates(word_updates, day_updates, list(update_ids))
    logger.info(f"Vocabs sent to statsdb for user_ids {list(update_ids)}")


async def card_event(events, tstamp):
    if not events:
        logger.warning("Empty card events received")
        return
    logger.info(f"{len(events)} Card events received")

    update_ids = set()
    day_updates = {}
    word_updates = {}
    now = get_event_dates(tstamp)
    today = int(datetime.fromtimestamp(now).strftime("%Y%m%d"))

    for event in events:
        user_id = event["user_id"]
        update_ids.add(user_id)
        day_key = f"{user_id}_{today}"
        if day_key not in day_updates:
            day_updates[day_key] = {
                "user_id": user_id,
                "day": today,
                "nb_failures": 0,
                "nb_success": 0,
                "nb_seen": 0,
                "nb_checked": 0,
                "updated_at": now,
            }
        day = day_updates[day_key]

        target_word = event["target_word"]
        word_key = f"{user_id}_{target_word}"
        if word_key not in word_updates:
            word_updates[word_key] = {
                "user_id": user_id,
                "graph": target_word,
                "nb_seen": 0,
                "nb_checked": 0,
                "nb_seen_since_last_check": 0,
                "updated_at": now,
            }
        vord = word_updates[word_key]

        vord["nb_seen"] += 1
        vord["last_seen"] = now
        day["nb_seen"] += 1

        if event["grade"] < 3:  # FIXME: use the constant
            vord["nb_checked"] += 1
            vord["last_checked"] = now
            vord["nb_seen_since_last_check"] = 0
            day["nb_failures"] += 1
            day["nb_checked"] += 1
        else:
            day["nb_success"] += 1
            vord["nb_seen_since_last_check"] += 1

    await send_updates(word_updates, day_updates, list(update_ids), True)
    logger.info(f"Card events sent to statsdb for user_ids {list(update_ids)}")


async def main():
    consumer = AIOKafkaConsumer(
        *STATS_TOPICS_TO_CONSUME,
        bootstrap_servers=settings.KAFKA_BROKER,
        group_id=CONSUMER_GROUP_ID,
        auto_offset_reset="earliest",
    )

    await consumer.start()
    try:
        async for msg in consumer:
            if msg is None:
                logging.warning("Got a None message")
                continue
            logger.debug(
                "{}:{:d}:{:d}: key={} value={} timestamp_ms={}".format(
                    msg.topic, msg.partition, msg.offset, msg.key, msg.value, msg.timestamp
                )
            )
            try:
                if msg.topic == VOCAB_EVENT_TOPIC_NAME:
                    logger.info(f"Received vocab_event_topic message: {msg.timestamp}")
                    await vocab_event(orjson.loads(msg.value), msg.timestamp)
                elif msg.topic == ACTION_EVENT_TOPIC_NAME:
                    logger.info(f"Received action_event_topic message: {msg.timestamp} ")
                    await action_event(orjson.loads(msg.value), msg.timestamp)
                elif msg.topic == CARD_EVENT_TOPIC_NAME:
                    logger.info(f"Received card_event_topic message: {msg.timestamp} ")
                    await card_event(orjson.loads(msg.value), msg.timestamp)
                else:
                    logger.warning(f"Received unknown message: {msg.topic=}, {msg.value=}, {msg.timestamp=}")
                    continue
            except orjson.JSONDecodeError as e:
                logger.warning(f"Received invalid message: {msg.topic=}, {msg.value=}, {msg.timestamp=}")
                logger.error(f"Error processing message: {e}")
                traceback.print_exc()
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        traceback.print_exc()
    finally:
        await consumer.stop()


if __name__ == "__main__":
    asyncio.run(main())
