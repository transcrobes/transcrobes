# -*- coding: utf-8 -*-

from __future__ import annotations

import logging

from app.core.config import settings
from app.data.importer import process_content, process_import, process_list
from app.enrich import data
from app.enrich.cache import regenerate_character_jsons_multi, regenerate_definitions_jsons_multi
from app.schemas.cache import DataType, RegenerationType
from app.schemas.msg import Msg
from app.worker.faustus import app, content_process_topic, import_process_topic, list_process_topic

logger = logging.getLogger(__name__)


for name, pair in settings.LANG_PAIRS.items():
    logging.info("Installing lang pairs %s : %s", name, pair)
    data.managers[name] = data.EnrichmentManager(name, pair)


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
