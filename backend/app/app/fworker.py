# -*- coding: utf-8 -*-

from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any

import faust
from app.core.config import settings
from app.data.importer import process_content, process_import, process_list
from app.data.stats import push_user_stats_update_to_clients
from app.enrich import data
from app.enrich.cache import regenerate_character_jsons_multi, regenerate_definitions_jsons_multi
from app.schemas.cache import DataType, RegenerationType
from app.schemas.event import ActionEvent, CardEvent, ReloadEvent, VocabEvent
from app.schemas.files import ProcessData
from app.schemas.msg import Msg
from app.worker.faustus import (
    UserDayT,
    UserWords,
    UserWordT,
    app,
    content_process_topic,
    list_process_topic,
    user_words,
)

logger = logging.getLogger(__name__)


class Greeting(faust.Record):  # pylint:disable=W0223
    from_name: str
    to_name: str


# Tasks
import_process_topic = app.topic("import_process_topic", value_type=ProcessData)

# Streaming events
vocab_event_topic = app.topic("vocab_event_topic", value_type=VocabEvent)
action_event_topic = app.topic("action_event_topic", value_type=ActionEvent)
card_event_topic = app.topic("card_event_topic", value_type=CardEvent)

reload_event_topic = app.topic("reload_event_topic", value_type=ReloadEvent)

for name, pair in settings.LANG_PAIRS.items():
    logging.info("Installing lang pairs %s : %s", name, pair)
    data.managers[name] = data.EnrichmentManager(name, pair)


@app.agent(reload_event_topic)
async def reload_event(reload_events):
    async for event in reload_events.group_by(ReloadEvent.user_id):
        logger.info(f"Reload for user: {event.user_id} : {event.type=} : {event.user_stats_mode=} : {event.source=}")
        user_data: UserWords = user_words[event.user_id]

        for day, day_data in event.days.items():
            if day not in user_data.days:
                user_data.days[day] = day_data

        for word, word_data in event.words.items():
            if word not in user_data.words:
                user_data.words[word] = word_data

        user_data.ordered_keys = sorted(
            user_data.words, key=lambda x: user_data.words[x].updated_at, reverse=True  # pylint: disable=W0640
        )
        user_data.ordered_day_keys = sorted(
            user_data.days, key=lambda x: user_data.days[x].updated_at, reverse=True  # pylint: disable=W0640
        )
        logger.debug(f"{event.user_id=} : {user_data=}")
        user_words[event.user_id] = user_data


@app.agent(action_event_topic)
async def action_event(user_events):
    async for event in user_events.group_by(ActionEvent.user_id):
        user_data: UserWords = user_words[event.user_id]
        now = time.time()  # FIXME: this should be the kafka timestamp, but faust doesn't expose it
        today = datetime.utcnow().strftime("%Y%m%d")

        if today not in user_data.days:
            logger.info(f"{today=} not in user_data.days")
            user_data.days[today] = UserDayT()
        day = user_data.days[today]

        if event.target_word not in user_data.words:
            logger.info(f"{event.target_word=} not in user_data.words")
            user_data.words[event.target_word] = UserWordT()

        vord = user_data.words[event.target_word]

        vord.nb_seen += 1
        day.nb_seen += 1
        vord.last_seen = now
        vord.nb_checked += 1
        day.nb_checked += 1
        vord.last_checked = now
        vord.nb_seen_since_last_check = 0
        # vord.is_known: int
        vord.updated_at = now
        day.updated_at = now
        user_data.words[event.target_word] = vord
        user_data.days[today] = day

        user_data.ordered_keys = sorted(
            user_data.words, key=lambda x: user_data.words[x].updated_at, reverse=True  # pylint: disable=W0640
        )
        user_data.ordered_day_keys = sorted(
            user_data.days, key=lambda x: user_data.days[x].updated_at, reverse=True  # pylint: disable=W0640
        )

        user_words[event.user_id] = user_data

        await push_user_stats_update_to_clients([event.user_id], "day_model_stats")
        await push_user_stats_update_to_clients([event.user_id], "word_model_stats")
        logger.info(
            f"Action: {event.type=} : {event.user_stats_mode=} : {event.source=} : {event.target_word=} :"
            f" {event.target_sentence=}"
        )


@app.agent(vocab_event_topic)
async def vocab_event(user_events):
    # FIXME: find something cleaner, they have added something to sqlalchemy since this was written!
    # raw_conn = await engine.raw_connection()
    # conn = raw_conn._connection  # pylint: disable=W0212

    # temp_table = f"_{os.getpid()}_{int(time.time_ns())}_vocab"
    # await create_temp_table_userword(temp_table, conn)
    async for event in user_events.group_by(VocabEvent.user_id):
        logger.info(f"Vocab: {event.type=} : {event.user_stats_mode=} : {event.source=}")
        user_data: UserWords = user_words[event.user_id]
        # push_to_db = {}
        # now = datetime.now()  # FIXME: this should be the kafka timestamp, but faust doesn't expose it
        now = time.time()  # FIXME: this should be the kafka timestamp, but faust doesn't expose it
        today = datetime.utcnow().strftime("%Y%m%d")

        if today not in user_data.days:
            logger.info(f"{today=} not in user_data.days")
            user_data.days[today] = UserDayT()
        day = user_data.days[today]

        for k, v in event.data.items():
            if k not in user_data.words:
                logger.info(f"{k=} not in user_data.words")
                user_data.words[k] = UserWordT()

            vord = user_data.words[k]
            vord.nb_seen += v[0]
            day.nb_seen += v[0]
            vord.last_seen = now
            if v[1] > 0:
                vord.last_checked = now
                vord.nb_seen_since_last_check = 0
                vord.nb_checked += v[1]
                day.nb_checked += v[1]
            else:
                vord.nb_seen_since_last_check += v[0]
            # vord.is_known: int
            vord.updated_at = now
            user_data.words[k] = vord
            # push_to_db[k] = vord

        day.updated_at = now
        user_data.days[today] = day

        user_data.ordered_keys = sorted(
            user_data.words, key=lambda x: user_data.words[x].updated_at, reverse=True  # pylint: disable=W0640
        )
        user_data.ordered_day_keys = sorted(
            user_data.days, key=lambda x: user_data.days[x].updated_at, reverse=True  # pylint: disable=W0640
        )
        user_words[event.user_id] = user_data

        await push_user_stats_update_to_clients([event.user_id], "day_model_stats")
        await push_user_stats_update_to_clients([event.user_id], "word_model_stats")
        # FIXME: can we rely on faust???
        # await update_db_userword_faust(conn, temp_table, int(event.user_id), push_to_db)


@app.agent(card_event_topic)
async def card_event(user_events):
    async for event in user_events.group_by(CardEvent.user_id):
        logger.info(
            f"Card: {event.type=} : {event.user_stats_mode=} : {event.source=}"
            f"{event.target_word=}, {event.pos=}, {event.grade=}, {event.source_sentence=}"
        )
        user_data: UserWords = user_words[event.user_id]
        now = time.time()  # FIXME: this should be the kafka timestamp, but faust doesn't expose it
        today = datetime.utcnow().strftime("%Y%m%d")

        if event.target_word not in user_data.words:
            logger.info(f"{event.target_word=} not in user_data.words")
            user_data.words[event.target_word] = UserWordT()
        if today not in user_data.days:
            logger.info(f"{today=} not in user_data.days")
            user_data.days[today] = UserDayT()

        vord = user_data.words[event.target_word]
        day = user_data.days[today]

        vord.nb_seen += 1
        day.nb_seen += 1
        vord.last_seen = now
        if event.grade < 3:  # FIXME: use the constant
            day.nb_failures += 1
            vord.nb_checked += 1
            vord.last_checked = now
            vord.nb_seen_since_last_check = 0
        else:
            day.nb_success += 1
        # vord.is_known: int
        vord.updated_at = now
        day.updated_at = now
        user_data.words[event.target_word] = vord
        user_data.days[today] = day

        user_data.ordered_keys = sorted(
            user_data.words, key=lambda x: user_data.words[x].updated_at, reverse=True  # pylint: disable=W0640
        )
        user_data.ordered_day_keys = sorted(
            user_data.days, key=lambda x: user_data.days[x].updated_at, reverse=True  # pylint: disable=W0640
        )
        user_words[event.user_id] = user_data

        await push_user_stats_update_to_clients([event.user_id], "day_model_stats")
        await push_user_stats_update_to_clients([event.user_id], "word_model_stats")


@app.page("/user_word_updates/{user_id}/{since}")
@app.table_route(table=user_words, match_info="user_id")
async def get_user_word_updates(web, _request, user_id: str, since: str) -> Any:
    user_data: UserWords = user_words[user_id]
    updates: list[list] = []
    for user_word in user_data.ordered_keys:
        if user_data.words[user_word].updated_at < float(since):
            break
        uw = user_data.words[user_word]
        updates.append(
            [
                user_word,
                uw.nb_seen,
                uw.last_seen,
                uw.nb_checked,
                uw.last_checked,
                uw.nb_seen_since_last_check,
                uw.is_known,
                uw.updated_at,
            ]
        )
    return web.json(updates)


@app.page("/user_day_updates/{user_id}/{since}")
@app.table_route(table=user_words, match_info="user_id")
async def get_user_day_updates(web, _request, user_id: str, since: str) -> Any:
    user_data: UserWords = user_words[user_id]
    updates: list[list] = []
    for user_day in user_data.ordered_day_keys:
        if user_data.days[user_day].updated_at < float(since):
            break
        uw = user_data.days[user_day]
        updates.append(
            [
                user_day,
                uw.nb_seen,
                uw.nb_checked,
                uw.nb_success,
                uw.nb_failures,
                uw.updated_at,
            ]
        )
    return web.json(updates)


@app.page("/all_user_data")
async def all_user_data(web, _request) -> Any:
    jout = {}
    for user_id, value in user_words.items():
        jout[user_id] = {"words": value.words, "days": value.days}
    return web.json(jout)


# faust -A app.fworker send @import_process_topic '{"type": "import", "id": "21430d94-2d09-4552-8a3c-4d4ad03d8475"}'
@app.agent(import_process_topic)
async def import_process(imports):
    async for an_import in imports:
        logger.info(f"Processing Import: {an_import=}")
        await process_import(an_import)


# faust -A app.fworker send @content_process_topic '{"type": "content", "id": "203d5315-8d70-4f48-bd83-31fa619b8ed2"}'
@app.agent(content_process_topic)
async def content_process(contents):
    async for content in contents:
        logger.info(f"Processing Content: {content=}")
        await process_content(content)


# faust -A app.fworker send @list_process_topic '{"type": "list", "id": "21429d94-2d09-4552-8a3c-4d4ad03d8475"}'
@app.agent(list_process_topic)
async def list_process(lists):
    async for a_list in lists:
        logger.info(f"Processing UserList: {a_list=}")
        await process_list(a_list)


@app.crontab("0 0 * * *")
async def regenerate_all():
    await regenerate(RegenerationType(data_type=DataType.both))


async def regenerate(regen_type: RegenerationType) -> Msg:
    logger.info(f"Attempting to regenerate caches: {regen_type.data_type=}, {regen_type.fakelimit=}")
    if regen_type.data_type in [DataType.both, DataType.definitions]:
        await regenerate_definitions_jsons_multi(regen_type.fakelimit or 0)
    if regen_type.data_type in [DataType.both, DataType.characters]:
        regenerate_character_jsons_multi()
    logger.info("Finished regenerating caches")

    return {"msg": "success"}
