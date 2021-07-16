# -*- coding: utf-8 -*-

from __future__ import annotations

import logging
import time
from typing import Any

import faust
from app.core.config import settings
from app.data.importer import process_content, process_import, process_list
from app.data.stats import push_user_word_stats_update_to_clients
from app.enrich import data
from app.enrich.cache import regenerate_character_jsons_multi, regenerate_definitions_jsons_multi
from app.schemas.cache import DataType, RegenerationType
from app.schemas.event import ActionEvent, CardEvent, VocabEvent
from app.schemas.files import ProcessData
from app.schemas.msg import Msg
from app.worker.faustus import UserWords, UserWordT, app, content_process_topic, list_process_topic, user_words

logger = logging.getLogger(__name__)


class Greeting(faust.Record):  # pylint:disable=W0223
    from_name: str
    to_name: str


hello_topic = app.topic("hello-topic", value_type=Greeting)


@app.agent(hello_topic)
async def hello(greetings):
    async for greeting in greetings:
        print(f"Hello from {greeting.from_name} to {greeting.to_name}")


# Tasks
import_process_topic = app.topic("import_process_topic", value_type=ProcessData)

# Streaming events
vocab_event_topic = app.topic("vocab_event_topic", value_type=VocabEvent)
action_event_topic = app.topic("action_event_topic", value_type=ActionEvent)
card_event_topic = app.topic("card_event_topic", value_type=CardEvent)

for name, pair in settings.LANG_PAIRS.items():
    logging.info("Installing lang pairs %s : %s", name, pair)
    data.managers[name] = data.EnrichmentManager(name, pair)


@app.agent(action_event_topic)
async def action_event(user_events):
    async for event in user_events.group_by(ActionEvent.user_id):
        user_data: UserWords = user_words[event.user_id]
        now = time.time()  # FIXME: this should be the kafka timestamp, but faust doesn't expose it

        if event.target_word not in user_data.words:
            logger.info(f"{event.target_word=} not in user_data.words")
            user_data.words[event.target_word] = UserWordT()

        vord = user_data.words[event.target_word]

        vord.nb_seen += 1
        vord.last_seen = now
        vord.nb_checked += 1
        vord.last_checked = now
        vord.nb_seen_since_last_check = 0
        # vord.is_known: int
        vord.updated_at = now
        user_data.words[event.target_word] = vord

        user_data.ordered_keys = sorted(
            user_data.words, key=lambda x: user_data.words[x].updated_at, reverse=True  # pylint: disable=W0640
        )
        user_words[event.user_id] = user_data

        await push_user_word_stats_update_to_clients(user_ids=[event.user_id])
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
        for k, v in event.data.items():
            if k not in user_data.words:
                logger.info(f"{k=} not in user_data.words")
                user_data.words[k] = UserWordT()

            vord = user_data.words[k]
            vord.nb_seen += v[0]
            vord.last_seen = now
            vord.nb_checked += v[1]
            if v[1] > 0:
                vord.last_checked = now
                vord.nb_seen_since_last_check = 0
            # vord.is_known: int
            vord.updated_at = now
            user_data.words[k] = vord
            # push_to_db[k] = vord
        user_data.ordered_keys = sorted(
            user_data.words, key=lambda x: user_data.words[x].updated_at, reverse=True  # pylint: disable=W0640
        )
        user_words[event.user_id] = user_data

        await push_user_word_stats_update_to_clients(user_ids=[event.user_id])
        # FIXME: can we rely on faust???
        # await update_db_userword_faust(conn, temp_table, int(event.user_id), push_to_db)


@app.agent(card_event_topic)
async def card_event(user_events):
    async for event in user_events.group_by(CardEvent.user_id):
        logger.info(
            f"Card: {event.type=} : {event.user_stats_mode=} : {event.source=}"
            f"{event.word_id=}, {event.target_word=}, {event.pos=}, {event.grade=}, {event.source_sentence=}"
        )
        user_data: UserWords = user_words[event.user_id]
        # now = datetime.now()  # FIXME: this should be the kafka timestamp, but faust doesn't expose it
        now = time.time()  # FIXME: this should be the kafka timestamp, but faust doesn't expose it

        if event.target_word not in user_data.words:
            logger.info(f"{event.target_word=} not in user_data.words")
            user_data.words[event.target_word] = UserWordT()

        vord = user_data.words[event.target_word]

        vord.nb_seen += 1
        vord.last_seen = now
        if event.grade < 3:  # FIXME: use the constant
            vord.nb_checked += 1
            vord.last_checked = now
            vord.nb_seen_since_last_check = 0
        # vord.is_known: int
        vord.updated_at = now
        user_data.words[event.target_word] = vord

        user_data.ordered_keys = sorted(
            user_data.words, key=lambda x: user_data.words[x].updated_at, reverse=True  # pylint: disable=W0640
        )
        user_words[event.user_id] = user_data

        await push_user_word_stats_update_to_clients(user_ids=[event.user_id])


@app.page("/user_word_updates/{user_id}/{since}")
@app.table_route(table=user_words, match_info="user_id")
async def get_user_word_updates(web, _request, user_id: str, since: str) -> Any:
    # async def get_user_word_updates(web, request, user_id: str, since: str, limit: str) -> Any:
    user_data: UserWords = user_words[user_id]
    # updates: dict[str, UserWordT] = {}
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
        # updates[user_word] = user_data.words[user_word]
    # updates.reverse()  # oldest update first
    # if limit and int(limit) > 0:
    #     updates = updates[:int(limit)]
    return web.json(updates)


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
