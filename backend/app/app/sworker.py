# -*- coding: utf-8 -*-
# isort: skip_file
import asyncio
import logging
import logging.config
import os

# fmt: off
import sys
import six

if sys.version_info >= (3, 12, 0):
    sys.modules["kafka.vendor.six.moves"] = six.moves

# fmt: on

import time
import traceback
from datetime import datetime

import orjson
from aiokafka import AIOKafkaConsumer
from app.api.api_v1 import types
from app.core.config import settings
from app.data.importer.common import MCQ_QAG_OUTFILE_SUFFIX
from app.data.models import ActivityTypes
from app.data.stats import push_user_stats_update_to_clients
from app.db.session import async_stats_session
from app.models.stats import ContentModelRead, UserActivity, UserDay, UserWord
from app.schemas.files import ProcessData
from app.stats import (
    ACTION_EVENT_TOPIC_NAME,
    ACTIVITY_EVENT_TOPIC_NAME,
    CARD_EVENT_TOPIC_NAME,
    READ_EVENT_TOPIC_NAME,
    VOCAB_EVENT_TOPIC_NAME,
)
from app.worker.faustus import qag_process_topic
from sqlalchemy import case
from sqlalchemy.dialects import postgresql

logging.config.dictConfig(settings.LOGGING)

logger = logging.getLogger(__name__)

CONSUMER_GROUP_ID = "tcstats"
STATS_TOPICS_TO_CONSUME = [
    VOCAB_EVENT_TOPIC_NAME,
    ACTION_EVENT_TOPIC_NAME,
    CARD_EVENT_TOPIC_NAME,
    READ_EVENT_TOPIC_NAME,
    ACTIVITY_EVENT_TOPIC_NAME,
]


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
        await push_user_stats_update_to_clients(update_ids, types.camel_to_snake(types.DayModelStats.__name__)),
    if len(word_updates) > 0:
        await push_user_stats_update_to_clients(update_ids, types.camel_to_snake(types.WordModelStats.__name__)),


def activity_from_url(origurl: str) -> ActivityTypes:
    url = origurl.strip().removeprefix("https://").removeprefix("http://")
    internal = False
    for host in settings.ALL_HOSTS:
        if url.startswith(host):
            url = url.removeprefix(host).removeprefix("/#").strip()
            internal = True
            break
    if not internal:
        return ActivityTypes.EXTENSION
    if url == "/":
        return ActivityTypes.DASHBOARD
    # common learning activities - these are the most common
    if url.startswith("/repetrobes"):
        return ActivityTypes.REPETROBES
    if url.startswith("/textcrobes"):
        return ActivityTypes.TEXTCROBES
    if url.startswith("/contents") and url.endswith("/read"):
        return ActivityTypes.CONTENTEPUB
    if url.startswith("/contents") and url.endswith("/watch"):
        return ActivityTypes.CONTENTVIDEO
    if url.startswith("/contents"):
        return ActivityTypes.CONTENTS
    if url.startswith("/notrobes"):
        return ActivityTypes.NOTROBES

    # common management activities
    if url.startswith("/goals"):
        return ActivityTypes.GOALS
    if url.startswith("/userlists"):
        return ActivityTypes.LISTS
    if url.startswith("/stats"):
        return ActivityTypes.MYSTATS
    if url.startswith("/studentregistrations"):
        return ActivityTypes.CLASSES
    if url.startswith("/listrobes"):
        return ActivityTypes.LISTROBES
    if url.startswith("/imports"):
        return ActivityTypes.IMPORTS
    if url.startswith("/userdictionaries"):
        return ActivityTypes.DICTIONARIES
    if url.startswith("/exports"):
        return ActivityTypes.EXPORTS

    # common settings activities and help - should be rare
    if url.startswith("/brocrobes"):
        return ActivityTypes.BROCROBES
    if url.startswith("/surveys"):
        return ActivityTypes.SURVEYS
    if url.startswith("/system"):
        return ActivityTypes.SETTINGS
    if url.startswith("/help"):
        return ActivityTypes.HELP

    # TODO: should probably raise an error here instead
    return ActivityTypes.UNKNOWN


async def activity_event(events):
    if not events:
        logger.warning("Empty activity events received")
        return
    logger.info(f"{len(events)} activity events received")
    activities = []
    for event in events:
        activities.append(
            {
                "user_id": event["user_id"],
                "activity_type": activity_from_url(event["data"] or "").value,
                "activity_start": int(event["start"]),
                "activity_end": int(event["end"]),
                "data": event["data"],
            }
        )
    stmt = postgresql.insert(UserActivity).values(activities)
    async with async_stats_session() as db:
        await db.execute(stmt)
        await db.commit()

    logger.info(f"{len(events)} activity events saved")


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

        target_word_original = event["target_word"]
        target_word = target_word_original.lower()

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
        for k_original, v in event["data"].items():
            k = k_original.lower()
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

        target_word_original = event["target_word"]
        target_word = target_word_original.lower()

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


async def run_qag(id):
    file_event = ProcessData(type="mcq", id=id)
    logger.log(f"{id} should now be sent to kafka")
    await qag_process_topic.send(value=file_event)


def model_strings(chapter_path: str) -> set[str]:
    if not os.path.exists(chapter_path):
        return None
    output = set()
    with open(chapter_path, "r") as f:
        qags = orjson.loads(f.read())
        for qag in qags:
            # FIXME: use a const for the "-"
            output.add(qag["modelIds"].split("-")[-1])
    return output


async def read_event(events):
    if not events:
        logger.warning("Empty read events received")
        return
    logger.info(f"{len(events)} Read events received")

    model_reads = []
    last_read = []
    for event in events:
        mr = {
            "user_id": event["user_id"],
            "content_id": event["content_id"],
            "href": event["href"],
            "model_id": event["model_id"],
            "read_at": event["read_at"],
        }

        model_reads.append(mr)
        if event["read_at"] > time.time() - 60:
            last_read.append(mr)

    stmt = postgresql.insert(ContentModelRead).values(model_reads)
    async with async_stats_session() as db:
        await db.execute(stmt)
        await db.commit()

    # are there any models that are the last for a given qag and were read within the last minute?
    # - if so, send them to the qag worker
    pots = {}
    to_run = []
    for event in last_read:
        mcq_path = os.path.join(
            settings.MEDIA_ROOT,
            event["user_id"],
            "resources",
            event["content_id"],
            event["href"] + MCQ_QAG_OUTFILE_SUFFIX,
        )
        if os.path.exists(mcq_path):
            pots[mcq_path] = model_strings(mcq_path)
        if event["model_id"] in pots[mcq_path]:
            to_run.append(event)
    if len(to_run) > 0:
        newlist = sorted(to_run, key=lambda d: d["read_at"], reverse=True)
        event = newlist[0]
        # await run_qag(event["content_id"], event["href"], event["model_id"])
        await run_qag(f'{event["user_id"]}:{event["content_id"]}/{event["href"]}:{event["model_id"]}')

    logger.info(f"{len(events)} read events saved")


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
                if msg.topic == ACTIVITY_EVENT_TOPIC_NAME:
                    logger.info(f"Received activity_event_topic message: {msg.timestamp}")
                    # await activity_event(orjson.loads(msg.value), msg.timestamp)
                    await activity_event(orjson.loads(msg.value))
                elif msg.topic == VOCAB_EVENT_TOPIC_NAME:
                    logger.info(f"Received vocab_event_topic message: {msg.timestamp}")
                    await vocab_event(orjson.loads(msg.value), msg.timestamp)
                elif msg.topic == ACTION_EVENT_TOPIC_NAME:
                    logger.info(f"Received action_event_topic message: {msg.timestamp} ")
                    await action_event(orjson.loads(msg.value), msg.timestamp)
                elif msg.topic == CARD_EVENT_TOPIC_NAME:
                    logger.info(f"Received card_event_topic message: {msg.timestamp} ")
                    await card_event(orjson.loads(msg.value), msg.timestamp)
                elif msg.topic == READ_EVENT_TOPIC_NAME:
                    logger.info(f"Received read_event_topic message: {msg.timestamp} ")
                    await read_event(orjson.loads(msg.value))
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
