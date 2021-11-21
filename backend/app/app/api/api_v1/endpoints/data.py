# -*- coding: utf-8 -*-

from __future__ import annotations

import json
import logging
import mimetypes
import os
from typing import Any, List

from app import models, schemas, stats
from app.api import deps
from app.data.models import DATA_JS_SUFFIX, DATA_JSON_SUFFIX, ENRICH_JSON_SUFFIX, PARSE_JSON_SUFFIX
from app.fworker import action_event_topic, card_event_topic, vocab_event_topic
from app.models.user import absolute_resources_path
from app.schemas.event import ActionEvent, BaseEvent, CardEvent, VocabEvent
from fastapi import APIRouter, Depends
from fastapi.exceptions import HTTPException
from fastapi.responses import FileResponse, Response
from starlette import status
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def get_event(e: Any, user_id: int) -> BaseEvent:
    logger.debug("Got an event %s for user %s", e, user_id)

    if e["type"] in ["bulk_vocab"]:
        return VocabEvent(
            data=e["data"],
            type=e["type"],
            source=e["source"],
            user_stats_mode=e.get("user_stats_mode") or stats.USER_STATS_MODE_IGNORE,
            user_id=user_id,
        )
    elif e["type"] in ["token_details_card"]:
        return CardEvent(
            type=e["type"],
            source=e["source"],
            user_stats_mode=e.get("user_stats_mode") or stats.USER_STATS_MODE_IGNORE,
            user_id=user_id,
            word_id=e["data"].get("word_id") or e["data"].get("wordId"),
            target_word=e["data"].get("target_word"),
            grade=e["data"]["grade"],
            pos=e["data"]["pos"],
            source_sentence=e["data"].get("source_sentence"),
        )
    else:
        return ActionEvent(
            type=e["type"],
            source=e["source"],
            user_stats_mode=e.get("user_stats_mode") or stats.USER_STATS_MODE_IGNORE,
            user_id=user_id,
            target_word=e["data"]["target_word"],
            target_sentence=e["data"].get("target_sentence"),
        )


@router.post("/user_events")
async def user_events(
    events: List[Any],
    # current_user: models.AuthUser = Depends(deps.get_current_active_user),
    current_user: schemas.TokenPayload = Depends(deps.get_current_active_tokenpayload),
) -> Any:  # FIXME: Any?
    for gevent in events:
        # if "source" not in gevent:
        #     continue
        # FIXME: this is a bug, fixit!!!
        if not gevent["data"]:
            continue
        try:
            event = get_event(gevent, current_user.id)
            if isinstance(event, VocabEvent):
                # for k in event.data.keys():
                #     if len(k) > 10:
                #         print("The target_word is invalid", event)
                #         raise Exception("The target_word data is invalid")
                logger.debug(
                    f"Submitting vocab event for user {current_user=} with size {len(json.dumps(event.data))=}"
                )
                print(f"Submitting vocab event for user {current_user=} with size {len(json.dumps(event.data))=}")
                await vocab_event_topic.send(value=event)
            elif isinstance(event, CardEvent):
                # if len(event.target_word) > 10:
                #     print("The target_word is invalid", event)
                #     raise Exception("The target_word is invalid")
                await card_event_topic.send(value=event)
            else:
                # if len(event.target_word) > 10:
                #     print("The target_word is invalid", event)
                #     raise Exception("The target_word is invalid")
                await action_event_topic.send(value=event)
        except Exception as ex:  # pylint: disable=W0703  # FIXME:
            logger.exception(ex)
            logger.exception(gevent)
            return {"status": "failure"}

    return {"status": "success"}


@router.get("/content/{resource_path:path}", name="serve_content")
async def serve_content(  # pylint: disable=R0914  # FIXME: consider reducing
    resource_path: str,
    # current_user: models.AuthUser = Depends(deps.get_current_good_user),
    current_user: models.AuthUser = Depends(deps.get_current_good_tokenpayload),
):
    destination = absolute_resources_path(current_user.id, resource_path)
    destination_no_data_suffix = destination.removesuffix(DATA_JS_SUFFIX).removesuffix(DATA_JSON_SUFFIX)
    is_data_file_request = destination.endswith(DATA_JS_SUFFIX) or destination.endswith(DATA_JSON_SUFFIX)

    if not os.path.isfile(destination_no_data_suffix):
        logger.warning(f"Can't find {destination_no_data_suffix=}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource specified is not a file {resource_path=}",
        )

    if not is_data_file_request:
        response = FileResponse(destination, media_type=mimetypes.guess_type(destination)[0])
        return response

    parse_path = f"{destination_no_data_suffix}{PARSE_JSON_SUFFIX}"
    enrich_path = f"{destination_no_data_suffix}{ENRICH_JSON_SUFFIX}"

    if not os.path.isfile(parse_path):
        logger.warning(f"Can't find {parse_path=}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource specified is not a file {resource_path=}",
        )

    with open(parse_path, encoding="utf8") as parse_file:
        combined = json.load(parse_file)

        if os.path.isfile(enrich_path):
            with open(enrich_path, encoding="utf8") as enrich_file:
                enrich = json.load(enrich_file)
                for parse_id, text_parse in combined.items():
                    for sindex, sentence in enumerate(text_parse["s"]):
                        if "l1" in enrich[parse_id]["s"][sindex]:
                            sentence["l1"] = enrich[parse_id]["s"][sindex]["l1"]
                        for tindex, token in enumerate(sentence["t"]):
                            for prop, value in enrich[parse_id]["s"][sindex]["t"][tindex].items():
                                token[prop] = value

        if destination.endswith(DATA_JS_SUFFIX):
            return Response(
                content=f'var transcrobesModel = {json.dumps(combined, separators=(",", ":"))};',
                media_type="text/javascript",
            )
        else:
            return JSONResponse(combined)
